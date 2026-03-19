import { isAdmin } from "../../isAdmin"
import { auth } from "@clerk/nextjs/server"
import sql from "@/lib/db"

export async function POST(req) {
  if (!await isAdmin()) return Response.json({ error: "Forbidden" }, { status: 403 })
  const { email, filename, status } = await req.json()
  const { userId } = await auth()

  // Ensure user exists in users table
  await sql`
    INSERT INTO users (id, email, name)
    VALUES (${userId}, ${email}, 'Test User')
    ON CONFLICT (id) DO NOTHING
  `

  const [order] = await sql`
    INSERT INTO orders (user_id, status, type, shipping_email, printer_job_id)
    VALUES (${userId}, ${status}, 'custom', ${email}, ${filename})
    RETURNING id
  `
  return Response.json({ order })
}
