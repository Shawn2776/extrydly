"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const links = [
  { label: "Orders", href: "/admin/orders" },
  { label: "Products", href: "/admin/products" },
  { label: "Quotes", href: "/admin/quotes" },
]

export default function AdminNav() {
  const pathname = usePathname()

  return (
    <nav className="bg-[#2C2C2A] text-white">
      <div className="max-w-[1200px] mx-auto px-8 h-14 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <span className="text-sm font-bold tracking-tight text-[#EF9F27]">
            extrudly admin
          </span>
          <div className="flex items-center gap-6">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm transition-colors duration-150 ${
                  pathname.startsWith(link.href)
                    ? "text-white font-semibold"
                    : "text-[#888780] hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <Link href="/" className="text-xs text-[#888780] hover:text-white transition-colors duration-150">
          ← Back to site
        </Link>
      </div>
    </nav>
  )
}
