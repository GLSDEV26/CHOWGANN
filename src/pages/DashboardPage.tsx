// src/pages/DashboardPage.tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getOrders } from '../db/database'
import type { Order } from '../types'

interface DashboardStats {
  todayRevenue: number
  monthRevenue: number
  pendingCount: number
  deliveredCount: number
  topProducts: { name: string; count: number }[]
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats>({
    todayRevenue: 0, monthRevenue: 0, pendingCount: 0, deliveredCount: 0, topProducts: [],
  })

  useEffect(() => {
    loadStats()
  }, [])

  async function loadStats() {
    const orders = await getOrders()
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)

    const paid = (o: Order) => o.status === 'paid' || o.status === 'delivered'
    const todayRevenue = orders.filter(o => paid(o) && new Date(o.createdAt) >= today)
      .reduce((s, o) => s + o.totalAmount, 0)
    const monthRevenue = orders.filter(o => paid(o) && new Date(o.createdAt) >= monthStart)
      .reduce((s, o) => s + o.totalAmount, 0)
    const pendingCount = orders.filter(o => o.status === 'pending').length
    const deliveredCount = orders.filter(o => o.status === 'delivered').length

    // Top products
    const counts: Record<string, number> = {}
    orders.filter(paid).forEach(o =>
      o.items.forEach(item => {
        counts[item.productName] = (counts[item.productName] || 0) + item.quantity
      })
    )
    const topProducts = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }))

    setStats({ todayRevenue, monthRevenue, pendingCount, deliveredCount, topProducts })
  }

  return (
    <div className="flex flex-col h-full safe-top">
      {/* Header */}
      <div className="px-5 pt-4 pb-2">
        <p className="text-text-secondary text-sm">Bonjour 👋</p>
        <h1 className="text-2xl font-bold text-accent">Chogan VDI</h1>
      </div>

      <div className="scroll-area flex-1 px-5 pb-4 space-y-4">
        {/* Revenue cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="card">
            <p className="label">CA aujourd'hui</p>
            <p className="text-2xl font-bold text-text-primary">{stats.todayRevenue.toFixed(2)} €</p>
          </div>
          <div className="card">
            <p className="label">CA ce mois</p>
            <p className="text-2xl font-bold text-accent">{stats.monthRevenue.toFixed(2)} €</p>
          </div>
        </div>

        {/* Status cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="card border border-status-pending/30">
            <p className="label">En attente</p>
            <p className="text-3xl font-bold" style={{ color: '#FF9800' }}>{stats.pendingCount}</p>
            <p className="text-text-muted text-xs">commandes</p>
          </div>
          <div className="card border border-status-delivered/30">
            <p className="label">Livrées</p>
            <p className="text-3xl font-bold" style={{ color: '#2196F3' }}>{stats.deliveredCount}</p>
            <p className="text-text-muted text-xs">commandes</p>
          </div>
        </div>

        {/* Top products */}
        {stats.topProducts.length > 0 && (
          <div className="card">
            <p className="text-accent font-bold mb-3">🏆 Top Produits</p>
            <div className="space-y-2">
              {stats.topProducts.map((p, i) => (
                <div key={p.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-text-muted text-sm w-5">{i + 1}.</span>
                    <span className="text-sm">{p.name}</span>
                  </div>
                  <span className="text-accent font-bold text-sm">{p.count} vte{p.count > 1 ? 's' : ''}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* New order CTA */}
        <button
          onClick={() => navigate('/orders/new')}
          className="btn-gold text-lg"
        >
          + Nouvelle commande
        </button>

        <button
          onClick={() => navigate('/orders')}
          className="btn-secondary text-center w-full"
        >
          Voir toutes les commandes
        </button>
      </div>
    </div>
  )
}
