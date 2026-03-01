// src/pages/OrdersPage.tsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getOrders, deleteOrder } from '../db/database'
import type { Order, OrderStatus } from '../types'
import { STATUS_LABELS, STATUS_COLORS } from '../types'

const FILTER_OPTIONS: { value: OrderStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Toutes' },
  { value: 'pending', label: 'En attente' },
  { value: 'paid', label: 'Payées' },
  { value: 'delivered', label: 'Livrées' },
  { value: 'draft', label: 'Brouillons' },
  { value: 'cancelled', label: 'Annulées' },
]

export default function OrdersPage() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState<Order[]>([])
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all')
  const [search, setSearch] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setOrders(await getOrders())
  }

  async function handleDelete(e: React.MouseEvent, order: Order) {
    e.stopPropagation()
    if (!confirm(`Supprimer la commande ${order.orderNumber} ?`)) return
    await deleteOrder(order.id!)
    load()
  }

  const filtered = orders.filter(o => {
    const matchStatus = filter === 'all' || o.status === filter
    const matchSearch = !search ||
      o.customerName.toLowerCase().includes(search.toLowerCase()) ||
      o.orderNumber.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  return (
    <div className="flex flex-col h-full safe-top">
      <div className="px-5 pt-4 pb-2 flex items-center justify-between">
        <h1 className="text-xl font-bold">Commandes ({orders.length})</h1>
        <button onClick={() => navigate('/orders/new')} className="text-accent font-bold text-sm">+ Nouvelle</button>
      </div>

      <div className="px-5 mb-2">
        <input placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="flex gap-2 overflow-x-auto px-5 pb-3">
        {FILTER_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === opt.value ? 'bg-accent text-bg-primary' : 'bg-bg-tertiary text-text-secondary'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="scroll-area flex-1 px-5 space-y-3 pb-4">
        {filtered.length === 0 ? (
          <div className="text-center text-text-muted py-12">
            <p className="text-4xl mb-3">📋</p>
            <p>Aucune commande</p>
          </div>
        ) : (
          filtered.map(order => (
            <div key={order.id} className="card flex items-center gap-2">
              <button
                onClick={() => navigate(`/orders/${order.id}`)}
                className="flex-1 text-left"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold">{order.customerName}</p>
                    <p className="text-text-muted text-xs mt-0.5">{order.orderNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-accent">{order.totalAmount.toFixed(2)} €</p>
                    <span
                      className="badge text-xs mt-1 inline-block"
                      style={{ backgroundColor: STATUS_COLORS[order.status] + '33', color: STATUS_COLORS[order.status] }}
                    >
                      {STATUS_LABELS[order.status]}
                    </span>
                  </div>
                </div>
                <p className="text-text-muted text-xs mt-2">
                  {new Date(order.createdAt).toLocaleDateString('fr-FR')}
                  {order.items.length > 0 && ` · ${order.items.length} article${order.items.length > 1 ? 's' : ''}`}
                </p>
              </button>
              <button
                onClick={(e) => handleDelete(e, order)}
                className="text-red-400 text-xl px-2 flex-shrink-0"
              >
                🗑
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}