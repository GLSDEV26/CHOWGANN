// src/pages/OrderDetailPage.tsx
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { db, upsertOrder, now, getSettings } from '../db/database'
import type { Order, OrderStatus, Settings } from '../types'
import { STATUS_LABELS, STATUS_COLORS, PAYMENT_LABELS } from '../types'
import { generateOrderPDF, sharePDF } from '../services/pdf'
import { generateEPCQRCode } from '../services/qrcode'

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [order, setOrder] = useState<Order | null>(null)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [showQR, setShowQR] = useState(false)

  useEffect(() => {
    if (!id) return
    db.orders.get(Number(id)).then(o => {
      setOrder(o || null)
      if (o?.paymentMethod === 'transfer') setShowQR(true)
    })
    getSettings().then(s => {
      setSettings(s)
    })
  }, [id])

  useEffect(() => {
    if (showQR && settings?.iban && order) {
      generateEPCQRCode(settings.iban, settings.bic, settings.beneficiaryName || settings.ownerName, order.totalAmount)
        .then(setQrCode)
    }
  }, [showQR, settings, order])

  async function changeStatus(status: OrderStatus) {
    if (!order) return
    const updated = { ...order, status, updatedAt: now() }
    if (status === 'paid') updated.paidAt = now()
    if (status === 'delivered') updated.deliveredAt = now()
    await upsertOrder(updated)
    setOrder(updated)
  }

  async function handlePDF() {
    if (!order || !settings) return
    setPdfLoading(true)
    try {
      const pdfBytes = await generateOrderPDF(order, settings)
      await sharePDF(pdfBytes, `${order.orderNumber}.pdf`)
    } finally {
      setPdfLoading(false)
    }
  }

  function copyIBAN() {
    if (!settings?.iban) return
    navigator.clipboard.writeText(settings.iban.replace(/\s/g, ''))
      .then(() => alert('IBAN copié !'))
  }

  if (!order) return (
    <div className="flex items-center justify-center h-full text-text-muted">
      Chargement…
    </div>
  )

  const nextStatuses: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
    draft: { to: 'pending', label: 'Envoyer en attente' },
    pending: { to: 'paid', label: '✓ Marquer Payée' },
    paid: { to: 'delivered', label: '📦 Marquer Livrée' },
  }

  const nextAction = nextStatuses[order.status]

  return (
    <div className="flex flex-col h-full safe-top">
      <div className="flex items-center gap-3 px-5 pt-4 pb-3 border-b border-bg-tertiary">
        <button onClick={() => navigate(-1)} className="text-accent text-xl">←</button>
        <div className="flex-1">
          <h1 className="font-bold">{order.orderNumber}</h1>
          <span
            className="badge text-xs"
            style={{ backgroundColor: STATUS_COLORS[order.status] + '22', color: STATUS_COLORS[order.status] }}
          >
            {STATUS_LABELS[order.status]}
          </span>
        </div>
        <button onClick={handlePDF} disabled={pdfLoading} className="text-accent text-sm font-bold">
          {pdfLoading ? '…' : '📄 PDF'}
        </button>
      </div>

      <div className="scroll-area flex-1 px-5 py-4 space-y-4">
        {/* Client */}
        <div className="card">
          <p className="text-text-muted text-xs mb-1">Client</p>
          <p className="font-bold text-lg">{order.customerName}</p>
          <p className="text-text-muted text-sm">{PAYMENT_LABELS[order.paymentMethod]}</p>
          <p className="text-text-muted text-xs mt-1">
            {new Date(order.createdAt).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>

        {/* Items */}
        <div className="card space-y-2">
          <p className="text-accent font-bold mb-2">Articles</p>
          {order.items.map((item, i) => (
            <div key={i} className="flex justify-between items-start">
              <div className="flex-1">
                <p className="text-sm font-medium">{item.productName}</p>
                <p className="text-text-muted text-xs">{item.quantity} × {item.unitPrice.toFixed(2)} €
                  {item.discountPct > 0 && ` − ${item.discountPct}%`}
                </p>
              </div>
              <p className="font-bold text-sm">{item.lineTotal.toFixed(2)} €</p>
            </div>
          ))}
          <div className="border-t border-bg-tertiary pt-2 space-y-1">
            <div className="flex justify-between text-sm text-text-muted">
              <span>Sous-total</span>
              <span>{order.subtotal.toFixed(2)} €</span>
            </div>
            {order.totalDiscount > 0 && (
              <div className="flex justify-between text-sm text-text-muted">
                <span>Remise</span>
                <span>− {order.totalDiscount.toFixed(2)} €</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span className="text-accent">{order.totalAmount.toFixed(2)} €</span>
            </div>
          </div>
        </div>

        {/* Virement info */}
        {order.paymentMethod === 'transfer' && settings?.iban && (
          <div className="card border border-accent/20">
            <p className="text-accent font-bold mb-3">Virement bancaire</p>
            <div className="bg-bg-tertiary rounded-xl p-3 mb-3 font-mono text-sm break-all">
              {settings.iban}
            </div>
            <div className="flex gap-2">
              <button onClick={copyIBAN} className="flex-1 bg-bg-tertiary rounded-xl py-3 text-sm font-medium">
                📋 Copier IBAN
              </button>
              <button onClick={() => setShowQR(prev => !prev)}
                className="flex-1 bg-bg-tertiary rounded-xl py-3 text-sm font-medium">
                {showQR ? 'Masquer QR' : '📲 QR Code'}
              </button>
            </div>
            {showQR && qrCode && (
              <div className="mt-3 flex justify-center">
                <img src={qrCode} alt="QR SEPA" className="w-48 h-48 rounded-xl" />
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        {nextAction && (
          <button
            onClick={() => changeStatus(nextAction.to)}
            className="btn-gold"
          >
            {nextAction.label}
          </button>
        )}

        {order.status !== 'cancelled' && order.status !== 'delivered' && (
          <button
            onClick={() => changeStatus('cancelled')}
            className="w-full border border-red-500/30 text-red-400 py-3 rounded-2xl text-sm font-medium"
          >
            Annuler la commande
          </button>
        )}

        {order.notes && (
          <div className="card">
            <p className="text-text-muted text-xs mb-1">Notes</p>
            <p className="text-sm">{order.notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}
