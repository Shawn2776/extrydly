"use client"

import { useEffect, useState } from "react"

export default function AdminProductsPage() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchProducts = async () => {
    const res = await fetch("/api/admin/products")
    const data = await res.json()
    setProducts(data.products ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchProducts() }, [])

  const toggleStock = async (id, inStock) => {
    await fetch(`/api/admin/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ in_stock: !inStock }),
    })
    fetchProducts()
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-extrabold tracking-tight text-[#2C2C2A]">Products</h1>

      <div className="bg-white rounded-2xl border border-[#e0ddd6] overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="w-6 h-6 border-2 border-[#EF9F27] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[#F1EFE8] text-[#888780] text-xs uppercase tracking-widest">
              <tr>
                <th className="text-left px-6 py-3">Product</th>
                <th className="text-left px-6 py-3">Category</th>
                <th className="text-left px-6 py-3">Material</th>
                <th className="text-left px-6 py-3">Price</th>
                <th className="text-left px-6 py-3">Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1EFE8]">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-[#fafaf8]">
                  <td className="px-6 py-4 font-medium text-[#2C2C2A]">{product.title}</td>
                  <td className="px-6 py-4 text-[#888780]">{product.category}</td>
                  <td className="px-6 py-4 text-[#888780]">{product.material}</td>
                  <td className="px-6 py-4 text-[#2C2C2A]">${(product.price_cents / 100).toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleStock(product.id, product.in_stock)}
                      className={`text-xs font-bold px-3 py-1 rounded-full transition-colors duration-150 ${
                        product.in_stock
                          ? "bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700"
                          : "bg-red-100 text-red-700 hover:bg-green-100 hover:text-green-700"
                      }`}
                    >
                      {product.in_stock ? "In stock" : "Out of stock"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
