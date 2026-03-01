// src/pages/OrdersPage.tsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getOrders, deleteOrder, upsertOrder, now } from '../db/database'
import type { Order, OrderStatus, SupplierStatus } from '../types'
import { STATUS_LABELS, STATUS_COLORS, SUPPLIER_LABELS, SUPPLIER_COLORS } from '../types'

const CLIENT_FILTERS: { value: OrderStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Toutes' },
  { value: 'pending', label: 'En attente' },
  { value: 'paid', label: 'Payées' },
  { value: 'delivered', label: 'Livrées' },
  { value: 'cancelled', label: 'Annulées' },
]

const SUPPLIER_FILTERS: { value: SupplierStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Toutes' },
  { value: 'to_order', label: '⏳ À commander' },
  { value: 'ordered', label: '📦 Commandées' },
  { value: 'delivered_to_client', label: '✅ Livrées' },
]

export default function OrdersPage() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState<Order[]>([])
  const [tab, setTab] = useState<'client' | 'supplier'>('client')
  const [clientFilter, setClientFilter] = useState<OrderStatus | 'all'>('all')
  const [supplierFilter, setSupplierFilter] = useState<SupplierStatus | 'all'>('all')
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

  async function advanceSupplierStatus(e: React.MouseEvent, order: Order) {
    e.stopPropagation()
    const next: Record<string, SupplierStatus> = {
      to_order: 'ordered',
      ordered: 'delivered_to_client',
    }
    const current = order.supplierStatus || 'to_order'
    if (current === 'delivered_to_client') return
    await upsertOrder({ ...order, supplierStatus: next[current], updatedAt: now() })
    load()
  }

  async function resetSupplierStatus(e: React.MouseEvent, order: Order) {
    e.stopPropagation()
    await upsertOrder({ ...order, supplierStatus: 'to_order', updatedAt: now() })
    load()
  }

  const supplierOrders = orders.filter(o => o.status === 'paid' || o.status === 'delivered')

  const filteredClient = orders.filter(o => {
    const matchStatus = clientFilter === 'all' || o.status === clientFilter
    const matchSearch = !search ||
      o.customerName.toLowerCase().includes(search.toLowerCase()) ||
      o.orderNumber.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const filteredSupplier = supplierOrders.filter(o => {
    const status = o.supplierStatus || 'to_order'
    const matchStatus = supplierFilter === 'all' || status === supplierFilter
    const matchSearch = !search ||
      o.customerName.toLowerCase().includes(search.toLowerCase()) ||
      o.orderNumber.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const toOrderCount = supplierOrders.filter(o => !o.supplierStatus || o.supplierStatus === 'to_order').length

  return (
    <div className="flex flex-col h-full safe-top">
      <div className="px-5 pt-4 pb-2 flex items-center justify-between">
        <h1 className="text-xl font-bold">Commandes</h1>
        <button onClick={() => navigate('/orders/new')} className="text-accent font-bold text-sm">+ Nouvelle</button>
      </div>

      <div className="flex mx-5 mb-3 bg-bg-tertiary rounded-2xl p-1">
        <button
          onClick={() => setTab('client')}
          className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${
            tab === 'client' ? 'bg-accent text-bg-primary' : 'text-text-secondary'
          }`}
        >
          👤 Clients ({orders.length})
        </button>
        <button
          onClick={() => setTab('supplier')}
          className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors relative ${
            tab === 'supplier' ? 'bg-accent text-bg-primary' : 'text-text-secondary'
          }`}
        >
          📦 Fournisseur
          {toOrderCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
              {toOrderCount}
            </span>
          )}
        </button>
      </div>

      <div className="px-5 mb-2">
        <input placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {tab === 'client' && (
        <>
          <div className="flex gap-2 overflow-x-auto px-5 pb-3">
            {CLIENT_FILTERS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setClientFilter(opt.value)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  clientFilter === opt.value ? 'bg-accent text-bg-primary' : 'bg-bg-tertiary text-text-secondary'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="scroll-area flex-1 px-5 space-y-3 pb-4">
            {filteredClient.length === 0 ? (
              <div className="text-center text-text-muted py-12">
                <p className="text-4xl mb-3">📋</p>
                <p>Aucune commande</p>
              </div>
            ) : (
              filteredClient.map(order => (
                <div key={order.id} className="card flex items-center gap-2">
                  <button onClick={() => navigate(`/orders/${order.id}`)} className="flex-1 text-left">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold">{order.customerName}</p>
                        <p className="text-text-muted text-xs mt-0.5">{order.orderNumber}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-accent">{order.totalAmount.toFixed(2)} €</p>
                        <span className="badge text-xs mt-1 inline-block"
                          style={{ backgroundColor: STATUS_COLORS[order.status] + '33', color: STATUS_COLORS[order.status] }}>
                          {STATUS_LABELS[order.status]}
                        </span>
                      </div>
                    </div>
                    <p className="text-text-muted text-xs mt-2">
                      {new Date(order.createdAt).toLocaleDateString('fr-FR')}
                      {order.items.length > 0 && ` · ${order.items.length} article${order.items.length > 1 ? 's' : ''}`}
                    </p>
                  </button>
                  <button onClick={(e) => handleDelete(e, order)} className="text-red-400 text-xl px-2 flex-shrink-0">🗑</button>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {tab === 'supplier' && (
        <>
          <div className="flex gap-2 overflow-x-auto px-5 pb-3">
            {SUPPLIER_FILTERS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setSupplierFilter(opt.value)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  supplierFilter === opt.value ? 'bg-accent text-bg-primary' : 'bg-bg-tertiary text-text-secondary'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="scroll-area flex-1 px-5 space-y-3 pb-4">
            {filteredSupplier.length === 0 ? (
              <div className="text-center text-text-muted py-12">
                <p className="text-4xl mb-3">📦</p>
                <p>Aucune commande fournisseur</p>
              </div>
            ) : (
              filteredSupplier.map(order => {
                const supStatus = order.supplierStatus || 'to_order'
                const isDone = supStatus === 'delivered_to_client'
                return (
                  <div key={order.id} className="card space-y-3"
                    style={{ borderLeft: `3px solid ${SUPPLIER_COLORS[supStatus]}` }}>
                    <button onClick={() => navigate(`/orders/${order.id}`)} className="w-full text-left">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold">{order.customerName}</p>
                          <p className="text-text-muted text-xs">{order.orderNumber} · {new Date(order.createdAt).toLocaleDateString('fr-FR')}</p>
                        </div>
                        <p className="font-bold text-accent">{order.totalAmount.toFixed(2)} €</p>
                      </div>
                    </button>

                    <div className="bg-bg-tertiary rounded-xl p-3 space-y-1">
                      {order.items.map((item, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-text-secondary">{item.quantity}× {item.productName}</span>
                          <span className="text-text-muted text-xs">{item.productRef}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold" style={{ color: SUPPLIER_COLORS[supStatus] }}>
                        {SUPPLIER_LABELS[supStatus]}
                      </span>
                      <div className="flex gap-2">
                        {!isDone && (
                          <button
                            onClick={(e) => advanceSupplierStatus(e, order)}
                            className="bg-accent text-bg-primary text-xs font-bold px-3 py-2 rounded-xl active:scale-95 transition-transform"
                          >
                            {supStatus === 'to_order' ? '📦 Commandée' : '✅ Livrée'}
                          </button>
                        )}
                        <button
                          onClick={(e) => resetSupplierStatus(e, order)}
                          className="bg-bg-tertiary text-text-secondary text-xs font-bold px-3 py-2 rounded-xl active:scale-95 transition-transform"
                          title="Réinitialiser"
                        >
                          ↩️
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, order)}
                          className="text-red-400 text-xl px-1"
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </>
      )}
    </div>
  )
}
