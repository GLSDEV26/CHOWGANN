// src/pages/NewOrderPage.tsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCustomers, getActiveProducts, upsertOrder, upsertCustomer, now } from '../db/database'
import type { Customer, Product, OrderItem, Order, PaymentMethod } from '../types'
import { PAYMENT_LABELS } from '../types'

type Step = 1 | 2 | 3

export default function NewOrderPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>(1)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [productSearch, setProductSearch] = useState('')

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [newCustomerMode, setNewCustomerMode] = useState(false)
  const [newCustomer, setNewCustomer] = useState({ firstName: '', lastName: '', phone: '', email: '' })

  const [items, setItems] = useState<OrderItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pending')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getCustomers().then(setCustomers)
    getActiveProducts().then(setProducts)
  }, [])

  // Step 1 helpers
  const filteredCustomers = customers.filter(c =>
    `${c.firstName} ${c.lastName} ${c.phone}`.toLowerCase().includes(search.toLowerCase())
  )

  async function handleSelectCustomer(c: Customer) {
    setSelectedCustomer(c)
    setStep(2)
  }

  async function handleCreateCustomer() {
    if (!newCustomer.firstName && !newCustomer.lastName) return
    const id = await upsertCustomer({
      ...newCustomer,
      notes: '',
      hasConsent: false,
      createdAt: now(),
      updatedAt: now(),
    })
    const created = { ...newCustomer, id, notes: '', hasConsent: false, createdAt: now(), updatedAt: now() }
    setSelectedCustomer(created)
    setStep(2)
  }

  // Step 2 helpers
  const filteredProducts = products.filter(p =>
    `${p.name} ${p.reference}`.toLowerCase().includes(productSearch.toLowerCase())
  )

  function addProduct(product: Product) {
    const existing = items.find(i => i.productId === product.id)
    if (existing) {
      updateItem(existing.productId, 'quantity', existing.quantity + 1)
    } else {
      const item: OrderItem = {
        productId: product.id!,
        productName: product.name,
        productRef: product.reference,
        unitPrice: product.price,
        quantity: 1,
        discountPct: 0,
        lineTotal: product.price,
      }
      setItems(prev => [...prev, item])
    }
  }

  function updateItem(productId: number, field: 'quantity' | 'discountPct', value: number) {
    setItems(prev => prev.map(item => {
      if (item.productId !== productId) return item
      const updated = { ...item, [field]: value }
      updated.lineTotal = updated.unitPrice * updated.quantity * (1 - updated.discountPct / 100)
      return updated
    }))
  }

  function removeItem(productId: number) {
    setItems(prev => prev.filter(i => i.productId !== productId))
  }

  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0)
  const totalDiscount = items.reduce((s, i) => s + (i.unitPrice * i.quantity * i.discountPct / 100), 0)
  const totalAmount = subtotal - totalDiscount

  // Step 3 — save
  async function saveOrder() {
    if (!selectedCustomer) return
    setSaving(true)
    try {
      const order: Order = {
        orderNumber: '',
        status: paymentMethod === 'pending' ? 'pending' : 'paid',
        paymentMethod,
        customerId: selectedCustomer.id!,
        customerName: `${selectedCustomer.firstName} ${selectedCustomer.lastName}`.trim(),
        notes,
        items,
        subtotal,
        totalDiscount,
        totalAmount,
        createdAt: now(),
        updatedAt: now(),
      }
      const id = await upsertOrder(order)
      navigate(`/orders/${id}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full safe-top">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-4 pb-3 border-b border-bg-tertiary">
        <button onClick={() => step === 1 ? navigate(-1) : setStep(s => (s - 1) as Step)}
          className="text-accent text-xl">←</button>
        <div className="flex-1">
          <h1 className="font-bold text-lg">Nouvelle commande</h1>
          <div className="flex gap-2 mt-1">
            {[1, 2, 3].map(s => (
              <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${s <= step ? 'bg-accent' : 'bg-bg-tertiary'}`} />
            ))}
          </div>
        </div>
        <span className="text-text-muted text-sm">{step}/3</span>
      </div>

      {/* ── STEP 1 : Client ─────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="flex flex-col flex-1 overflow-hidden px-5">
          <p className="text-accent font-bold mt-4 mb-3">Choisir un client</p>

          {!newCustomerMode ? (
            <>
              <input
                placeholder="Rechercher par nom, téléphone…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="mb-3"
                autoFocus
              />
              <div className="scroll-area flex-1 space-y-2 pb-4">
                {filteredCustomers.map(c => (
                  <button key={c.id} onClick={() => handleSelectCustomer(c)}
                    className="card w-full text-left active:scale-98 transition-transform">
                    <p className="font-bold">{c.firstName} {c.lastName}</p>
                    <p className="text-text-muted text-sm">{c.phone || c.email}</p>
                  </button>
                ))}
                <button onClick={() => setNewCustomerMode(true)}
                  className="w-full border border-dashed border-accent/50 text-accent rounded-2xl py-4 text-center">
                  + Nouveau client
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-3 mt-2">
              <div>
                <label className="label">Prénom</label>
                <input value={newCustomer.firstName} onChange={e => setNewCustomer(p => ({ ...p, firstName: e.target.value }))} />
              </div>
              <div>
                <label className="label">Nom</label>
                <input value={newCustomer.lastName} onChange={e => setNewCustomer(p => ({ ...p, lastName: e.target.value }))} />
              </div>
              <div>
                <label className="label">Téléphone</label>
                <input type="tel" value={newCustomer.phone} onChange={e => setNewCustomer(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div>
                <label className="label">Email</label>
                <input type="email" value={newCustomer.email} onChange={e => setNewCustomer(p => ({ ...p, email: e.target.value }))} />
              </div>
              <button onClick={handleCreateCustomer} className="btn-gold">Créer et continuer →</button>
              <button onClick={() => setNewCustomerMode(false)} className="btn-secondary w-full text-center">Annuler</button>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 2 : Produits ────────────────────────────────────────────── */}
      {step === 2 && (
        <div className="flex flex-col flex-1 overflow-hidden px-5">
          <div className="flex items-center justify-between mt-4 mb-3">
            <p className="text-accent font-bold">Ajouter des produits</p>
            {items.length > 0 && (
              <button onClick={() => setStep(3)} className="text-accent font-bold text-sm">
                Suivant ({items.length}) →
              </button>
            )}
          </div>

          <input
            placeholder="Rechercher un produit…"
            value={productSearch}
            onChange={e => setProductSearch(e.target.value)}
            className="mb-3"
          />

          {/* Items already added */}
          {items.length > 0 && (
            <div className="mb-3 space-y-2">
              {items.map(item => (
                <div key={item.productId} className="card flex gap-3 items-center">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.productName}</p>
                    <p className="text-text-muted text-xs">{item.unitPrice.toFixed(2)} €</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateItem(item.productId, 'quantity', Math.max(1, item.quantity - 1))}
                      className="w-8 h-8 bg-bg-tertiary rounded-full text-accent font-bold">−</button>
                    <span className="w-5 text-center font-bold">{item.quantity}</span>
                    <button onClick={() => updateItem(item.productId, 'quantity', item.quantity + 1)}
                      className="w-8 h-8 bg-accent rounded-full text-bg-primary font-bold">+</button>
                  </div>
                  <div className="w-16">
                    <input
                      type="number" min="0" max="100"
                      value={item.discountPct || ''}
                      placeholder="0%"
                      onChange={e => updateItem(item.productId, 'discountPct', Number(e.target.value))}
                      className="text-center text-sm py-2 px-2"
                    />
                  </div>
                  <button onClick={() => removeItem(item.productId)} className="text-red-400 text-lg">✕</button>
                </div>
              ))}
              <div className="text-right text-accent font-bold">
                Total : {totalAmount.toFixed(2)} €
              </div>
            </div>
          )}

          <div className="scroll-area flex-1 space-y-2 pb-4">
            {filteredProducts.map(p => (
              <button key={p.id} onClick={() => addProduct(p)}
                className="card w-full text-left flex justify-between items-center active:scale-98 transition-transform">
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-text-muted text-xs">{p.reference} · {p.family}</p>
                </div>
                <div className="text-right">
                  <p className="text-accent font-bold">{p.price.toFixed(2)} €</p>
                  <p className="text-xs text-accent/60">+ Ajouter</p>
                </div>
              </button>
            ))}
          </div>

          {items.length > 0 && (
            <div className="py-3">
              <button onClick={() => setStep(3)} className="btn-gold">
                Suivant — {totalAmount.toFixed(2)} € →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 3 : Paiement ────────────────────────────────────────────── */}
      {step === 3 && (
        <div className="flex flex-col flex-1 overflow-hidden px-5">
          <p className="text-accent font-bold mt-4 mb-4">Récapitulatif & Paiement</p>

          <div className="scroll-area flex-1 space-y-4 pb-4">
            {/* Order summary */}
            <div className="card">
              <p className="text-text-muted text-sm mb-2">Client</p>
              <p className="font-bold">{selectedCustomer?.firstName} {selectedCustomer?.lastName}</p>
            </div>

            <div className="card space-y-2">
              {items.map(item => (
                <div key={item.productId} className="flex justify-between text-sm">
                  <span className="text-text-secondary">{item.quantity}× {item.productName}</span>
                  <span className="font-medium">{item.lineTotal.toFixed(2)} €</span>
                </div>
              ))}
              <div className="border-t border-bg-tertiary pt-2 mt-2">
                {totalDiscount > 0 && (
                  <div className="flex justify-between text-sm text-text-muted">
                    <span>Remise</span>
                    <span>− {totalDiscount.toFixed(2)} €</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg mt-1">
                  <span>Total</span>
                  <span className="text-accent">{totalAmount.toFixed(2)} €</span>
                </div>
              </div>
            </div>

            {/* Payment method */}
            <div>
              <label className="label">Mode de paiement</label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(PAYMENT_LABELS) as [PaymentMethod, string][]).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setPaymentMethod(key)}
                    className={`py-3 rounded-xl font-medium text-sm transition-colors ${
                      paymentMethod === key
                        ? 'bg-accent text-bg-primary'
                        : 'bg-bg-tertiary text-text-secondary'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Notes (optionnel)</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
            </div>

            <button onClick={saveOrder} disabled={saving} className="btn-gold">
              {saving ? 'Enregistrement…' : '✓ Valider la commande'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
