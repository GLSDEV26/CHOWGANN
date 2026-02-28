// src/services/backup.ts
import { db, getSettings, saveSettings } from '../db/database'
import type { BackupPayload, Settings } from '../types'

const BACKUP_VERSION = 1

export async function exportBackup(): Promise<void> {
  const [products, customers, orders, settings] = await Promise.all([
    db.products.toArray(),
    db.customers.toArray(),
    db.orders.toArray(),
    getSettings(),
  ])

  const { id: _id, ...settingsWithoutId } = settings

  const payload: BackupPayload = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    products,
    customers,
    orders,
    settings: settingsWithoutId,
  }

  const json = JSON.stringify(payload, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const d = new Date()
  const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  const filename = `chogan-backup-${dateStr}.backup`

  // Trigger download — user can then "Enregistrer dans Fichiers" → iCloud Drive
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)

  // Update last backup date
  const current = await getSettings()
  await saveSettings({ ...current, lastBackupAt: new Date().toISOString() })
}

export async function parseBackupFile(file: File): Promise<BackupPayload> {
  const text = await file.text()
  const payload = JSON.parse(text) as BackupPayload
  if (!payload.version || !payload.exportedAt) {
    throw new Error('Fichier de sauvegarde invalide')
  }
  return payload
}

export async function importBackup(payload: BackupPayload): Promise<void> {
  await db.transaction('rw', [db.products, db.customers, db.orders, db.settings], async () => {
    await db.products.clear()
    await db.customers.clear()
    await db.orders.clear()
    await db.settings.clear()

    await db.products.bulkAdd(payload.products.map(p => ({ ...p, id: undefined })))
    await db.customers.bulkAdd(payload.customers.map(c => ({ ...c, id: undefined })))
    await db.orders.bulkAdd(payload.orders.map(o => ({ ...o, id: undefined })))
    await db.settings.add(payload.settings)
  })
}

export function getBackupSummary(payload: BackupPayload): string {
  return `${payload.customers.length} clients • ${payload.products.length} produits • ${payload.orders.length} commandes`
}
