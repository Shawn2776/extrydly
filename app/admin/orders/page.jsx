"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

const STATUS_COLORS = {
  pending:   "bg-gray-100 text-gray-600",
  confirmed: "bg-blue-100 text-blue-700",
  printing:  "bg-yellow-100 text-yellow-700",
  printed:   "bg-purple-100 text-purple-700",
  shipped:   "bg-green-100 text-green-700",
  delivered: "bg-green-200 text-green-800",
  quoted:    "bg-orange-100 text-orange-700",
  error:     "bg-red-100 text-red-700",
}

const STATUSES = ["pending", "confirmed", "printing", "printed", "shipped", "delivered", "error"]

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [testForm, setTestForm] = useState({
    email: "",
    filename: "test_print.stl",
    status: "printing",
  })

  const fetchOrders = async () => {
    const res = await fetch("/api/admin/orders")
    const data = await res.json()
    setOrders(data.orders ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchOrders() }, [])

  const updateStatus = async (orderId, status) => {
    await fetch(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    fetchOrders()
  }

  const createTestOrder = async () => {
    setCreating(true)
    await fetch("/api/admin/orders/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testForm),
    })
    setCreating(false)
    fetchOrders()
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight text-[#2C2C2A]">Orders</h1>
        <span className="text-sm text-[#888780]">{orders.length} total</span>
      </div>

      {/* Create test order */}
      <div className="bg-white rounded-2xl p-6 border border-[#e0ddd6] flex flex-col gap-4">
        <h2 className="text-sm font-bold text-[#2C2C2A] uppercase tracking-widest">Create test order</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            className="border border-[#e0ddd6] rounded-lg px-3 py-2 text-sm"
            placeholder="Customer email"
            value={testForm.email}
            onChange={(e) => setTestForm({ ...testForm, email: e.target.value })}
          />
          <input
            className="border border-[#e0ddd6] rounded-lg px-3 py-2 text-sm"
            placeholder="Filename"
            value={testForm.filename}
            onChange={(e) => setTestForm({ ...testForm, filename: e.target.value })}
          />
          <select
            className="border border-[#e0ddd6] rounded-lg px-3 py-2 text-sm"
            value={testForm.status}
            onChange={(e) => setTestForm({ ...testForm, status: e.target.value })}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <button
          onClick={createTestOrder}
          disabled={creating || !testForm.email}
          className="bg-[#EF9F27] text-white text-sm font-bold px-5 py-2 rounded-lg hover:bg-[#d98e1e] transition-colors duration-150 disabled:opacity-50 w-fit"
        >
          {creating ? "Creating..." : "Create test order"}
        </button>
      </div>

      {/* Orders table */}
      <div className="bg-white rounded-2xl border border-[#e0ddd6] overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="w-6 h-6 border-2 border-[#EF9F27] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#888780]">No orders yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[#F1EFE8] text-[#888780] text-xs uppercase tracking-widest">
              <tr>
                <th className="text-left px-6 py-3">ID</th>
                <th className="text-left px-6 py-3">Customer</th>
                <th className="text-left px-6 py-3">Type</th>
                <th className="text-left px-6 py-3">Status</th>
                <th className="text-left px-6 py-3">Created</th>
                <th className="text-left px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1EFE8]">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-[#fafaf8]">
                  <td className="px-6 py-4 font-mono text-xs text-[#888780]">#{order.id}</td>
                  <td className="px-6 py-4 text-[#2C2C2A]">{order.shipping_email ?? order.user_id}</td>
                  <td className="px-6 py-4 text-[#888780]">{order.type}</td>
                  <td className="px-6 py-4">
                    <select
                      value={order.status}
                      onChange={(e) => updateStatus(order.id, e.target.value)}
                      className={`text-xs font-bold rounded-full px-3 py-1 border-0 cursor-pointer ${STATUS_COLORS[order.status] ?? STATUS_COLORS.pending}`}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4 text-[#888780]">
                    {new Date(order.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/orders/${order.id}/watch`}
                      className="text-xs text-[#EF9F27] font-bold hover:underline"
                    >
                      Watch →
                    </Link>
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
