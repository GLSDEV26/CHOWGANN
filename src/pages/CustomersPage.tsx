// src/pages/CustomersPage.tsx
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCustomers, upsertCustomer, deleteCustomer, now } from '../db/database'
import type { Customer } from '../types'

const EMPTY: Omit<Customer, 'id'> = {
  firstName: '', lastName: '', phone: '', email: '', notes: '', hasConsent: false,
  createdAt: '', updatedAt: '',
}

export default function CustomersPage() {
  const navigate = useNavigate()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Customer | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [showForm, setShowForm] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setCustomers(await getCustomers())
  }

  function openNew() {
    setEditing(null)
    setForm(EMPTY)
    setShowForm(true)
  }

  function openEdit(c: Customer) {
    setEditing(c)
    setForm({ ...c })
    setShowForm(true)
  }

  async function save() {
    await upsertCustomer({
      ...form,
      id: editing?.id,
      createdAt: editing?.createdAt || now(),
      updatedAt: now(),
    })
    setShowForm(false)
    load()
  }

  async function remove(c: Customer) {
    if (!confirm(`Supprimer ${c.firstName} ${c.lastName} ?`)) return
    await deleteCustomer(c.id!)
    load()
  }

  const filtered = customers.filter(c =>
    `${c.firstName} ${c.lastName} ${c.phone} ${c.email}`.toLowerCase().includes(search.toLowerCase())
  )

  if (showForm) {
    return (
      <div className="flex flex-col h-full safe-top">
        <div className="flex items-center gap-3 px-5 pt-4 pb-3 border-b border-bg-tertiary">
          <button onClick={() => setShowForm(false)} className="text-accent text-xl">←</button>
          <h1 className="font-bold flex-1">{editing ? 'Modifier client' : 'Nouveau client'}</h1>
          <button onClick={save} className="text-accent font-bold">Sauver</button>
        </div>
        <div className="scroll-area flex-1 px-5 py-4 space-y-3">
          {[
            { label: 'Prénom', key: 'firstName' },
            { label: 'Nom', key: 'lastName' },
            { label: 'Téléphone', key: 'phone', type: 'tel' },
            { label: 'Email', key: 'email', type: 'email' },
            { label: 'Notes', key: 'notes', multiline: true },
          ].map(({ label, key, type, multiline }) => (
            <div key={key}>
              <label className="label">{label}</label>
              {multiline ? (
                <textarea value={(form as any)[key]} rows={3}
                  onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} />
              ) : (
                <input type={type || 'text'} value={(form as any)[key]}
                  onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} />
              )}
            </div>
          ))}
          <div className="flex items-center justify-between card">
            <span className="text-sm">Consentement contact</span>
            <button
              onClick={() => setForm(p => ({ ...p, hasConsent: !p.hasConsent }))}
              className={`w-12 h-6 rounded-full transition-colors ${form.hasConsent ? 'bg-accent' : 'bg-bg-tertiary'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform mx-0.5 ${form.hasConsent ? 'translate-x-6' : ''}`} />
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
        <h1 className="text-xl font-bold">Clients ({customers.length})</h1>
        <button onClick={openNew} className="text-accent font-bold text-sm">+ Nouveau</button>
      </div>
      <div className="px-5 mb-3">
        <input placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="scroll-area flex-1 px-5 space-y-3 pb-4">
        {filtered.map(c => (
          <div key={c.id} className="card flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold flex-shrink-0">
              {c.firstName[0]?.toUpperCase() || '?'}{c.lastName[0]?.toUpperCase() || ''}
            </div>
            <button onClick={() => navigate(`/customers/${c.id}`)} className="flex-1 text-left">
              <p className="font-bold">{c.firstName} {c.lastName}</p>
              <p className="text-text-muted text-xs">{c.phone || c.email || 'Pas de contact'}</p>
            </button>
            <button onClick={() => openEdit(c)} className="text-text-muted text-lg px-2">✏️</button>
            <button onClick={() => remove(c)} className="text-red-400 text-lg px-2">🗑</button>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center text-text-muted py-12">
            <p className="text-4xl mb-3">👤</p>
            <p>Aucun client</p>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
