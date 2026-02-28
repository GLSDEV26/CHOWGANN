// src/services/pdf.ts
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import type { Order, Settings } from '../types'
import { STATUS_LABELS, PAYMENT_LABELS } from '../types'

const GOLD = rgb(0.776, 0.655, 0.337) // #C6A756
const DARK = rgb(0.051, 0.051, 0.051)
const GRAY = rgb(0.4, 0.4, 0.4)
const LIGHT = rgb(0.96, 0.96, 0.96)
const WHITE = rgb(1, 1, 1)

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatCurrency(amount: number): string {
  return `${amount.toFixed(2)} €`
}

export async function generateOrderPDF(order: Order, settings: Settings): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595.28, 841.89]) // A4
  const { width, height } = page.getSize()

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica)

  const margin = 50
  let y = height - margin

  // ── Header band ─────────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: DARK })

  page.drawText('CHOGAN', {
    x: margin, y: height - 55,
    size: 28, font: fontBold, color: GOLD,
  })

  const bizName = settings.businessName || settings.ownerName
  if (bizName) {
    page.drawText(bizName, {
      x: margin, y: height - 72,
      size: 9, font: fontReg, color: rgb(0.6, 0.6, 0.6),
    })
  }

  page.drawText(`Bon de commande`, {
    x: width - margin - 120, y: height - 45,
    size: 11, font: fontBold, color: WHITE,
  })
  page.drawText(order.orderNumber, {
    x: width - margin - 120, y: height - 62,
    size: 9, font: fontReg, color: GOLD,
  })

  y = height - 100

  // ── Date & Statut ────────────────────────────────────────────────────────
  page.drawText(`Date : ${formatDate(order.createdAt)}`, {
    x: margin, y, size: 10, font: fontReg, color: GRAY,
  })
  const statusLabel = STATUS_LABELS[order.status]
  page.drawText(`Statut : ${statusLabel}`, {
    x: width - margin - 160, y, size: 10, font: fontBold, color: GOLD,
  })
  y -= 25

  page.drawText(`Paiement : ${PAYMENT_LABELS[order.paymentMethod]}`, {
    x: margin, y, size: 10, font: fontReg, color: GRAY,
  })
  y -= 30

  // ── Separator ─────────────────────────────────────────────────────────────
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) })
  y -= 20

  // ── Client Info ───────────────────────────────────────────────────────────
  page.drawText('CLIENT', { x: margin, y, size: 9, font: fontBold, color: GOLD })
  y -= 16
  page.drawText(order.customerName, { x: margin, y, size: 12, font: fontBold, color: DARK })
  y -= 30

  // ── Table Header ──────────────────────────────────────────────────────────
  page.drawRectangle({ x: margin, y: y - 4, width: width - margin * 2, height: 22, color: DARK })
  const cols = { ref: margin + 4, name: margin + 70, qty: width - 200, discount: width - 150, total: width - 90 }
  const tableHeaders = [
    ['Réf.', cols.ref],
    ['Désignation', cols.name],
    ['Qté', cols.qty],
    ['Rem.', cols.discount],
    ['Total', cols.total],
  ]
  tableHeaders.forEach(([label, x]) => {
    page.drawText(label as string, { x: x as number, y: y + 2, size: 8, font: fontBold, color: WHITE })
  })
  y -= 26

  // ── Table Rows ────────────────────────────────────────────────────────────
  order.items.forEach((item, idx) => {
    if (idx % 2 === 0) {
      page.drawRectangle({ x: margin, y: y - 4, width: width - margin * 2, height: 18, color: LIGHT })
    }
    page.drawText(item.productRef, { x: cols.ref, y, size: 8, font: fontReg, color: DARK })
    const nameMax = 35
    const name = item.productName.length > nameMax ? item.productName.slice(0, nameMax) + '…' : item.productName
    page.drawText(name, { x: cols.name, y, size: 8, font: fontReg, color: DARK })
    page.drawText(String(item.quantity), { x: cols.qty, y, size: 8, font: fontReg, color: DARK })
    page.drawText(item.discountPct > 0 ? `${item.discountPct}%` : '-', { x: cols.discount, y, size: 8, font: fontReg, color: DARK })
    page.drawText(formatCurrency(item.lineTotal), { x: cols.total, y, size: 8, font: fontBold, color: DARK })
    y -= 20
  })

  y -= 10
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) })
  y -= 15

  // ── Totals ────────────────────────────────────────────────────────────────
  const totalsX = width - margin - 180
  const valX = width - margin - 10

  const drawTotalLine = (label: string, value: string, bold = false, color = DARK) => {
    const font = bold ? fontBold : fontReg
    const size = bold ? 11 : 9
    page.drawText(label, { x: totalsX, y, size, font, color: GRAY })
    page.drawText(value, { x: valX - (fontReg.widthOfTextAtSize(value, size)), y, size, font, color })
    y -= bold ? 20 : 16
  }

  drawTotalLine('Sous-total HT', formatCurrency(order.subtotal))
  if (order.totalDiscount > 0) {
    drawTotalLine('Remise totale', `- ${formatCurrency(order.totalDiscount)}`)
  }

  page.drawLine({ start: { x: totalsX, y: y + 8 }, end: { x: width - margin, y: y + 8 }, thickness: 1, color: GOLD })
  y -= 5
  drawTotalLine('TOTAL', formatCurrency(order.totalAmount), true, DARK)

  // ── IBAN (if transfer) ─────────────────────────────────────────────────────
  if (order.paymentMethod === 'transfer' && settings.iban) {
    y -= 20
    page.drawRectangle({ x: margin, y: y - 8, width: width - margin * 2, height: 36, color: rgb(0.95, 0.95, 0.95) })
    page.drawText('Virement bancaire', { x: margin + 10, y: y + 14, size: 9, font: fontBold, color: GOLD })
    page.drawText(`IBAN : ${settings.iban}`, { x: margin + 10, y: y - 2, size: 9, font: fontReg, color: DARK })
    y -= 40
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  page.drawText('Merci pour votre commande ♥', {
    x: width / 2 - 80, y: 30, size: 9, font: fontReg, color: GRAY,
  })

  return pdfDoc.save()
}

export async function sharePDF(pdfBytes: Uint8Array, filename: string): Promise<void> {
  const blob = new Blob([pdfBytes], { type: 'application/pdf' })
  const file = new File([blob], filename, { type: 'application/pdf' })

  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: filename })
  } else {
    // Fallback: direct download
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }
}
