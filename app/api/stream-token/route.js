import { auth } from "@clerk/nextjs/server";
import sql from "@/lib/db";
import { SignJWT } from "jose";

const secret = new TextEncoder().encode(process.env.BRIDGE_SECRET);

export async function GET(request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("orderId");

  if (!orderId) return Response.json({ error: "Missing orderId" }, { status: 400 });

  // Verify order belongs to user and is printing
  const rows = await sql`
    SELECT id FROM orders
    WHERE id = ${orderId} AND user_id = ${userId}
  `;

  if (rows.length === 0) {
    return Response.json({ error: "Order not found or not printing" }, { status: 404 });
  }

  // Issue a short-lived JWT valid for 2 hours
  const token = await new SignJWT({ orderId, userId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("2h")
    .setIssuedAt()
    .sign(secret);

  return Response.json({ token });
}
