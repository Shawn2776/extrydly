import { isAdmin } from "../isAdmin"
import sql from "@/lib/db"

export async function GET() {
  if (!await isAdmin()) return Response.json({ error: "Forbidden" }, { status: 403 })
  const products = await sql`SELECT * FROM products ORDER BY id`
  return Response.json({ products })
}
