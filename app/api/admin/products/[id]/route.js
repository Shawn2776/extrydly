import { isAdmin } from "../../isAdmin"
import sql from "@/lib/db"

export async function PATCH(req, { params }) {
  if (!await isAdmin()) return Response.json({ error: "Forbidden" }, { status: 403 })
  const { in_stock } = await req.json()
  await sql`UPDATE products SET in_stock = ${in_stock} WHERE id = ${params.id}`
  return Response.json({ ok: true })
}
