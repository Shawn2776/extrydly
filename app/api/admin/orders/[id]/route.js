import { isAdmin } from "../../isAdmin"
import sql from "@/lib/db"

export async function PATCH(req, { params }) {
  if (!await isAdmin()) return Response.json({ error: "Forbidden" }, { status: 403 })
  const { status } = await req.json()
  await sql`UPDATE orders SET status = ${status} WHERE id = ${params.id}`
  return Response.json({ ok: true })
}
