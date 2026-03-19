"use client"

import { useEffect, useState } from "react"

const STATUS_COLORS = {
  pending:  "bg-yellow-100 text-yellow-700",
  quoted:   "bg-blue-100 text-blue-700",
  accepted: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
}

export default function AdminQuotesPage() {
  const [quotes, setQuotes] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchQuotes = async () => {
    const res = await fetch("/api/admin/quotes")
    const data = await res.json()
    setQuotes(data.quotes ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchQuotes() }, [])

  const updateQuote = async (id, updates) => {
    await fetch(`/api/admin/quotes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    })
    fetchQuotes()
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight text-[#2C2C2A]">Quotes</h1>
        <span className="text-sm text-[#888780]">{quotes.length} total</span>
      </div>

      <div className="flex flex-col gap-4">
        {loading ? (
          <div className="bg-white rounded-2xl p-8 flex justify-center">
            <div className="w-6 h-6 border-2 border-[#EF9F27] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : quotes.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center text-sm text-[#888780]">No quotes yet</div>
        ) : quotes.map((quote) => (
          <div key={quote.id} className="bg-white rounded-2xl border border-[#e0ddd6] p-6 flex flex-col gap-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#2C2C2A]">{quote.filename}</span>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${STATUS_COLORS[quote.status]}`}>
                    {quote.status}
                  </span>
                </div>
                <span className="text-sm text-[#888780]">{quote.user_id}</span>
                {quote.notes && (
                  <p className="text-sm text-[#5F5E5A] mt-1">{quote.notes}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0 text-sm text-[#888780]">
                <span>{quote.material}</span>
                <span>·</span>
                <span>qty {quote.quantity}</span>
              </div>
            </div>

            {/* Admin actions */}
            <div className="flex items-center gap-3 pt-4 border-t border-[#F1EFE8]">
              <input
                type="number"
                placeholder="Quote price ($)"
                className="border border-[#e0ddd6] rounded-lg px-3 py-2 text-sm w-36"
                onBlur={(e) => {
                  if (e.target.value) {
                    updateQuote(quote.id, {
                      quoted_cents: Math.round(parseFloat(e.target.value) * 100),
                      status: "quoted",
                    })
                  }
                }}
                defaultValue={quote.quoted_cents ? (quote.quoted_cents / 100).toFixed(2) : ""}
              />
              <button
                onClick={() => updateQuote(quote.id, { status: "accepted" })}
                className="text-xs font-bold bg-green-100 text-green-700 px-4 py-2 rounded-lg hover:bg-green-200 transition-colors"
              >
                Accept
              </button>
              <button
                onClick={() => updateQuote(quote.id, { status: "rejected" })}
                className="text-xs font-bold bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 transition-colors"
              >
                Reject
              </button>
              {quote.file_url && (
                <a
                  href={quote.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-[#EF9F27] hover:underline ml-auto"
                >
                  Download file →
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
