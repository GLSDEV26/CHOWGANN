// src/pages/CustomerDetailPage.tsx
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { db, getOrdersByCustomer } from '../db/database'
import type { Customer, Order } from '../types'
import { STATUS_LABELS, STATUS_COLORS } from '../types'

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [orders, setOrders] = useState<Order[]>([])

  useEffect(() => {
    if (!id) return
    db.customers.get(Number(id)).then(c => setCustomer(c || null))
    getOrdersByCustomer(Number(id)).then(setOrders)
  }, [id])

  if (!customer) return <div className="flex items-center justify-center h-full text-text-muted">Chargement…</div>

  const totalSpent = orders.filter(o => o.status === 'paid' || o.status === 'delivered')
    .reduce((s, o) => s + o.totalAmount, 0)

  return (
    <div className="flex flex-col h-full safe-top">
      <div className="flex items-center gap-3 px-5 pt-4 pb-3 border-b border-bg-tertiary">
        <button onClick={() => navigate(-1)} className="text-accent text-xl">←</button>
        <h1 className="font-bold flex-1">{customer.firstName} {customer.lastName}</h1>
      </div>

      <div className="scroll-area flex-1 px-5 py-4 space-y-4">
        <div className="card space-y-2">
          {customer.phone && <div className="flex justify-between"><span className="text-text-muted text-sm">Téléphone</span><span>{customer.phone}</span></div>}
          {customer.email && <div className="flex justify-between"><span className="text-text-muted text-sm">Email</span><span className="text-sm">{customer.email}</span></div>}
          <div className="flex justify-between">
            <span className="text-text-muted text-sm">Consentement</span>
            <span className={customer.hasConsent ? 'text-green-400' : 'text-red-400'}>
              {customer.hasConsent ? 'Oui ✓' : 'Non'}
            </span>
          </div>
          {customer.notes && <p className="text-text-muted text-sm border-t border-bg-tertiary pt-2">{customer.notes}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="card text-center">
            <p className="text-text-muted text-xs">Commandes</p>
            <p className="text-2xl font-bold text-accent">{orders.length}</p>
          </div>
          <div className="card text-center">
            <p className="text-text-muted text-xs">Total dépensé</p>
            <p className="text-2xl font-bold text-accent">{totalSpent.toFixed(0)} €</p>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-3">
            <p className="font-bold text-accent">Historique commandes</p>
            <button onClick={() => navigate('/orders/new')} className="text-accent text-sm">+ Commande</button>
          </div>
          {orders.length === 0 ? (
            <p className="text-text-muted text-center py-6">Aucune commande</p>
          ) : (
            <div className="space-y-2">
              {orders.map(o => (
                <button key={o.id} onClick={() => navigate(`/orders/${o.id}`)}
                  className="card w-full text-left flex justify-between items-center">
                  <div>
                    <p className="font-medium text-sm">{o.orderNumber}</p>
                    <p className="text-text-muted text-xs">{new Date(o.createdAt).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-accent text-sm">{o.totalAmount.toFixed(2)} €</p>
                    <span className="badge text-xs" style={{ color: STATUS_COLORS[o.status] }}>
                      {STATUS_LABELS[o.status]}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
