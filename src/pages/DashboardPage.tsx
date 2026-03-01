// src/pages/DashboardPage.tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getOrders } from '../db/database'
import type { Order } from '../types'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'

interface DashboardStats {
  todayRevenue: number
  monthRevenue: number
  pendingCount: number
  deliveredCount: number
  topProducts: { name: string; count: number }[]
}

interface ChartData {
  label: string
  ca: number
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats>({
    todayRevenue: 0, monthRevenue: 0, pendingCount: 0, deliveredCount: 0, topProducts: [],
  })
  const [showChart, setShowChart] = useState(false)
  const [chartMode, setChartMode] = useState<'month' | 'year'>('month')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [allOrders, setAllOrders] = useState<Order[]>([])

  const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

  useEffect(() => {
    loadStats()
  }, [])

  useEffect(() => {
    if (allOrders.length > 0) buildChartData(allOrders)
  }, [chartMode, selectedYear, selectedMonth, allOrders])

  async function loadStats() {
    const orders = await getOrders()
    setAllOrders(orders)
    buildChartData(orders)

    const today = new Date(); today.setHours(0, 0, 0, 0)
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const paid = (o: Order) => o.status === 'paid' || o.status === 'delivered'

    setStats({
      todayRevenue: orders.filter(o => paid(o) && new Date(o.createdAt) >= today).reduce((s, o) => s + o.totalAmount, 0),
      monthRevenue: orders.filter(o => paid(o) && new Date(o.createdAt) >= monthStart).reduce((s, o) => s + o.totalAmount, 0),
      pendingCount: orders.filter(o => o.status === 'pending').length,
      deliveredCount: orders.filter(o => o.status === 'delivered').length,
      topProducts: (() => {
        const counts: Record<string, number> = {}
        orders.filter(paid).forEach(o => o.items.forEach(item => {
          counts[item.productName] = (counts[item.productName] || 0) + item.quantity
        }))
        return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name, count]) => ({ name, count }))
      })(),
    })
  }

  function buildChartData(orders: Order[]) {
    const paid = (o: Order) => o.status === 'paid' || o.status === 'delivered'

    if (chartMode === 'year') {
      // CA par mois pour l'année sélectionnée
      const data = MONTHS.map((label, monthIdx) => {
        const ca = orders
          .filter(o => {
            const d = new Date(o.createdAt)
            return paid(o) && d.getFullYear() === selectedYear && d.getMonth() === monthIdx
          })
          .reduce((s, o) => s + o.totalAmount, 0)
        return { label, ca: Math.round(ca * 100) / 100 }
      })
      setChartData(data)
    } else {
      // CA par jour pour le mois sélectionné
      const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate()
      const data = Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1
        const ca = orders
          .filter(o => {
            const d = new Date(o.createdAt)
            return paid(o) && d.getFullYear() === selectedYear && d.getMonth() === selectedMonth && d.getDate() === day
          })
          .reduce((s, o) => s + o.totalAmount, 0)
        return { label: `${day}`, ca: Math.round(ca * 100) / 100 }
      })
      setChartData(data)
    }
  }

  const availableYears = () => {
    const years = new Set(allOrders.map(o => new Date(o.createdAt).getFullYear()))
    years.add(new Date().getFullYear())
    return Array.from(years).sort((a, b) => b - a)
  }

  const totalChart = chartData.reduce((s, d) => s + d.ca, 0)

  return (
    <div className="flex flex-col h-full safe-top">
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

          {/* CA mois — cliquable pour ouvrir le graphique */}
          <button onClick={() => setShowChart(true)} className="card text-left active:scale-95 transition-transform border border-accent/20">
            <p className="label">CA ce mois</p>
            <p className="text-2xl font-bold text-accent">{stats.monthRevenue.toFixed(2)} €</p>
            <p className="text-xs text-accent/60 mt-1">📊 Voir graphique →</p>
          </button>
        </div>

        {/* Status cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="card border border-yellow-500/20">
            <p className="label">En attente</p>
            <p className="text-3xl font-bold text-yellow-400">{stats.pendingCount}</p>
            <p className="text-text-muted text-xs">commandes</p>
          </div>
          <div className="card border border-blue-500/20">
            <p className="label">Livrées</p>
            <p className="text-3xl font-bold text-blue-400">{stats.deliveredCount}</p>
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

        <button onClick={() => navigate('/orders/new')} className="btn-gold text-lg">
          + Nouvelle commande
        </button>

        <button onClick={() => navigate('/orders')} className="btn-secondary text-center w-full">
          Voir toutes les commandes
        </button>
      </div>

      {/* ── Popup Graphique ─────────────────────────────────────────── */}
      {showChart && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col safe-top">
          {/* Header popup */}
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-bg-tertiary">
            <h2 className="text-lg font-bold text-accent">📊 Chiffre d'Affaires</h2>
            <button onClick={() => setShowChart(false)} className="text-text-muted text-2xl">✕</button>
          </div>

          <div className="scroll-area flex-1 px-4 py-4 space-y-4">
            {/* Mode selector */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setChartMode('month')}
                className={`py-2 rounded-xl font-medium text-sm transition-colors ${chartMode === 'month' ? 'bg-accent text-bg-primary' : 'bg-bg-tertiary text-text-secondary'}`}
              >
                Par jour
              </button>
              <button
                onClick={() => setChartMode('year')}
                className={`py-2 rounded-xl font-medium text-sm transition-colors ${chartMode === 'year' ? 'bg-accent text-bg-primary' : 'bg-bg-tertiary text-text-secondary'}`}
              >
                Par mois
              </button>
            </div>

            {/* Sélecteurs année / mois */}
            <div className="flex gap-2">
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                className="flex-1"
              >
                {availableYears().map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              {chartMode === 'month' && (
                <select
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(Number(e.target.value))}
                  className="flex-1"
                >
                  {MONTHS.map((m, i) => (
                    <option key={i} value={i}>{m}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Total période */}
            <div className="card text-center">
              <p className="text-text-muted text-sm">
                Total {chartMode === 'year' ? selectedYear : `${MONTHS[selectedMonth]} ${selectedYear}`}
              </p>
              <p className="text-3xl font-bold text-accent">{totalChart.toFixed(2)} €</p>
            </div>

            {/* Graphique */}
            <div className="card" style={{ height: 260 }}>
              {chartData.every(d => d.ca === 0) ? (
                <div className="flex items-center justify-center h-full text-text-muted text-sm">
                  Aucune vente sur cette période
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#C6A756" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#C6A756" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: '#AAAAAA', fontSize: 10 }}
                      interval={chartMode === 'month' ? 4 : 0}
                    />
                    <YAxis tick={{ fill: '#AAAAAA', fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #C6A756', borderRadius: 8 }}
                      labelStyle={{ color: '#F5F5F5' }}
                      itemStyle={{ color: '#C6A756' }}
                      formatter={(value: number) => [`${value.toFixed(2)} €`, 'CA']}
                    />
                    <Area
                      type="monotone"
                      dataKey="ca"
                      stroke="#C6A756"
                      strokeWidth={2}
                      fill="url(#goldGradient)"
                      dot={false}
                      activeDot={{ r: 5, fill: '#C6A756' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Détail par mois (mode année) */}
            {chartMode === 'year' && (
              <div className="card space-y-2">
                <p className="text-accent font-bold mb-2">Détail par mois</p>
                {chartData.map((d, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <span className="text-text-secondary text-sm w-10">{d.label}</span>
                    <div className="flex-1 mx-3 bg-bg-tertiary rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-accent transition-all"
                        style={{ width: `${totalChart > 0 ? (d.ca / Math.max(...chartData.map(x => x.ca))) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-accent w-20 text-right">{d.ca.toFixed(2)} €</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

