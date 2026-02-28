// src/App.tsx
import { HashRouter, Routes, Route, NavLink } from 'react-router-dom'
import DashboardPage from './pages/DashboardPage'
import OrdersPage from './pages/OrdersPage'
import NewOrderPage from './pages/NewOrderPage'
import OrderDetailPage from './pages/OrderDetailPage'
import CustomersPage from './pages/CustomersPage'
import CustomerDetailPage from './pages/CustomerDetailPage'
import ProductsPage from './pages/ProductsPage'
import SettingsPage from './pages/SettingsPage'

const tabs = [
  { to: '/', label: 'Accueil', icon: '◈' },
  { to: '/orders', label: 'Commandes', icon: '📋' },
  { to: '/customers', label: 'Clients', icon: '👤' },
  { to: '/products', label: 'Produits', icon: '🛍' },
  { to: '/settings', label: 'Réglages', icon: '⚙️' },
]

export default function App() {
  return (
    <HashRouter>
      <div className="flex flex-col h-full">
        {/* Main content */}
        <div className="flex-1 overflow-hidden">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/orders/new" element={<NewOrderPage />} />
            <Route path="/orders/:id" element={<OrderDetailPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/customers/:id" element={<CustomerDetailPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </div>

        {/* Tab Bar */}
        <nav className="bg-bg-secondary border-t border-bg-tertiary tab-bar">
          <div className="flex justify-around">
            {tabs.map(tab => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.to === '/'}
                className={({ isActive }) =>
                  `flex flex-col items-center py-2 px-3 min-w-[60px] transition-colors ${
                    isActive ? 'text-accent' : 'text-text-muted'
                  }`
                }
              >
                <span className="text-xl">{tab.icon}</span>
                <span className="text-[10px] mt-0.5">{tab.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </HashRouter>
  )
}
