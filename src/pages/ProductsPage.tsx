// src/pages/ProductsPage.tsx
import { useState, useEffect } from 'react'
import { getProducts, upsertProduct, deleteProduct, now } from '../db/database'
import type { Product } from '../types'

const EMPTY: Omit<Product, 'id'> = {
  name: '', reference: '', family: '', price: 0, isActive: true, notes: '', createdAt: '', updatedAt: '',
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => { load() }, [])

  async function load() { setProducts(await getProducts()) }

  function openNew() { setEditing(null); setForm(EMPTY); setShowForm(true) }
  function openEdit(p: Product) { setEditing(p); setForm({ ...p }); setShowForm(true) }

  async function save() {
    await upsertProduct({ ...form, id: editing?.id, createdAt: editing?.createdAt || now(), updatedAt: now() })
    setShowForm(false)
    load()
  }

  async function toggleActive(p: Product) {
    await upsertProduct({ ...p, isActive: !p.isActive })
    load()
  }

  async function remove(p: Product) {
    if (!confirm(`Supprimer "${p.name}" ?`)) return
    await deleteProduct(p.id!)
    load()
  }

  const filtered = products.filter(p =>
    `${p.name} ${p.reference} ${p.family}`.toLowerCase().includes(search.toLowerCase())
  )
  const families = [...new Set(products.map(p => p.family).filter(Boolean))]

  if (showForm) {
    return (
      <div className="flex flex-col h-full safe-top">
        <div className="flex items-center gap-3 px-5 pt-4 pb-3 border-b border-bg-tertiary">
          <button onClick={() => setShowForm(false)} className="text-accent text-xl">←</button>
          <h1 className="font-bold flex-1">{editing ? 'Modifier produit' : 'Nouveau produit'}</h1>
          <button onClick={save} className="text-accent font-bold">Sauver</button>
        </div>
        <div className="scroll-area flex-1 px-5 py-4 space-y-3">
          {[
            { label: 'Nom *', key: 'name' },
            { label: 'Référence', key: 'reference' },
            { label: 'Famille', key: 'family' },
            { label: 'Notes', key: 'notes', multiline: true },
          ].map(({ label, key, multiline }) => (
            <div key={key}>
              <label className="label">{label}</label>
              {multiline ? (
                <textarea value={(form as any)[key]} rows={2}
                  onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} />
              ) : (
                <input value={(form as any)[key]}
                  onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} />
              )}
            </div>
          ))}
          <div>
            <label className="label">Prix (€)</label>
            <input type="number" step="0.01" min="0" value={form.price || ''}
              onChange={e => setForm(p => ({ ...p, price: Number(e.target.value) }))} />
          </div>
          <div className="flex items-center justify-between card">
            <span>Produit actif</span>
            <button onClick={() => setForm(p => ({ ...p, isActive: !p.isActive }))}
              className={`w-12 h-6 rounded-full transition-colors ${form.isActive ? 'bg-accent' : 'bg-bg-tertiary'}`}>
              <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform mx-0.5 ${form.isActive ? 'translate-x-6' : ''}`} />
            </button>
          </div>
          <button onClick={save} className="btn-gold">Enregistrer</button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full safe-top">
      <div className="px-5 pt-4 pb-2 flex items-center justify-between">
        <h1 className="text-xl font-bold">Produits ({products.length})</h1>
        <button onClick={openNew} className="text-accent font-bold text-sm">+ Nouveau</button>
      </div>
      <div className="px-5 mb-3">
        <input placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="scroll-area flex-1 px-5 space-y-3 pb-4">
        {filtered.map(p => (
          <div key={p.id} className={`card flex items-center gap-3 ${!p.isActive ? 'opacity-50' : ''}`}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-bold truncate">{p.name}</p>
                {!p.isActive && <span className="text-xs text-text-muted">(inactif)</span>}
              </div>
              <p className="text-text-muted text-xs">{p.reference} · {p.family}</p>
            </div>
            <p className="font-bold text-accent">{p.price.toFixed(2)} €</p>
            <button onClick={() => toggleActive(p)} className="text-lg" title={p.isActive ? 'Désactiver' : 'Activer'}>
              {p.isActive ? '🟢' : '⚫'}
            </button>
            <button onClick={() => openEdit(p)} className="text-lg">✏️</button>
            <button onClick={() => remove(p)} className="text-red-400 text-lg">🗑</button>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center text-text-muted py-12">
            <p className="text-4xl mb-3">🛍</p>
            <p>Aucun produit</p>
          </div>
        )}
      </div>
    </div>
  )
}
