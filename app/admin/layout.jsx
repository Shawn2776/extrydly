import { auth, currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import AdminNav from "./AdminNav"

export const metadata = {
  title: "Admin | Extrudly",
}

export default async function AdminLayout({ children }) {
  const { userId } = await auth()

  if (!userId) redirect("/sign-in")

  const user = await currentUser()
  const role = user?.publicMetadata?.role

  if (role !== "admin") redirect("/")

  return (
    <div className="min-h-screen bg-[#F1EFE8]">
      <AdminNav />
      <main className="max-w-[1200px] mx-auto px-8 py-10">
        {children}
      </main>
    </div>
  )
}
