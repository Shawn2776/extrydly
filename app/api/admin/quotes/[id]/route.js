import { isAdmin } from "../../isAdmin"
import sql from "@/lib/db"

export async function PATCH(req, { params }) {
  if (!await isAdmin()) return Response.json({ error: "Forbidden" }, { status: 403 })
  const updates = await req.json()
  const { status, quoted_cents, admin_notes } = updates
  await sql`
    UPDATE quotes SET
      status = COALESCE(${status}, status),
      quoted_cents = COALESCE(${quoted_cents}, quoted_cents),
      admin_notes = COALESCE(${admin_notes}, admin_notes)
    WHERE id = ${params.id}
  `
  return Response.json({ ok: true })
}
