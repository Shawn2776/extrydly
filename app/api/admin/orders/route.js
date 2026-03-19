import { isAdmin } from "../isAdmin"
import sql from "@/lib/db"

export async function GET() {
  if (!await isAdmin()) return Response.json({ error: "Forbidden" }, { status: 403 })
  const orders = await sql`SELECT * FROM orders ORDER BY created_at DESC`
  return Response.json({ orders })
}
