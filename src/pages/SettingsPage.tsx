// src/pages/SettingsPage.tsx
import { useState, useEffect, useRef } from 'react'
import { getSettings, saveSettings } from '../db/database'
import { exportBackup, parseBackupFile, importBackup, getBackupSummary } from '../services/backup'
import type { Settings, BackupPayload } from '../types'

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [saved, setSaved] = useState(false)
  const [backupLoading, setBackupLoading] = useState(false)
  const [importPreview, setImportPreview] = useState<{ payload: BackupPayload; summary: string } | null>(null)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { getSettings().then(setSettings) }, [])

  const daysSinceBackup = settings?.lastBackupAt
    ? Math.floor((Date.now() - new Date(settings.lastBackupAt).getTime()) / (1000 * 60 * 60 * 24))
    : null

  async function handleSave() {
    if (!settings) return
    await saveSettings(settings)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleBackup() {
    setBackupLoading(true)
    try {
      await exportBackup()
    } catch (e) {
      alert('Erreur lors de la sauvegarde : ' + e)
    } finally {
      setBackupLoading(false)
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const payload = await parseBackupFile(file)
      setImportPreview({ payload, summary: getBackupSummary(payload) })
    } catch {
      alert('Fichier invalide ou corrompu.')
    }
    e.target.value = ''
  }

  async function confirmImport() {
    if (!importPreview) return
    setImporting(true)
    try {
      await importBackup(importPreview.payload)
      setImportPreview(null)
      alert('Restauration réussie ! L\'app va recharger.')
      window.location.reload()
    } catch (e) {
      alert('Erreur lors de la restauration : ' + e)
    } finally {
      setImporting(false)
    }
  }

  if (!settings) return <div className="flex items-center justify-center h-full text-text-muted">Chargement…</div>

  return (
    <div className="flex flex-col h-full safe-top">
      <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-bg-tertiary">
        <h1 className="text-xl font-bold">Réglages</h1>
        <button onClick={handleSave} className="text-accent font-bold">
          {saved ? '✓ Sauvé' : 'Sauver'}
        </button>
      </div>

      <div className="scroll-area flex-1 px-5 py-4 space-y-5 pb-8">

        {/* Profile */}
        <section>
          <p className="text-accent font-bold mb-3">Mon profil</p>
          <div className="space-y-3">
            <div>
              <label className="label">Nom</label>
              <input value={settings.ownerName}
                onChange={e => setSettings(s => s ? { ...s, ownerName: e.target.value } : s)} />
            </div>
            <div>
              <label className="label">Entreprise / Marque</label>
              <input value={settings.businessName}
                onChange={e => setSettings(s => s ? { ...s, businessName: e.target.value } : s)} />
            </div>
          </div>
        </section>

        {/* Bank */}
        <section>
          <p className="text-accent font-bold mb-3">Coordonnées bancaires</p>
          <div className="space-y-3">
            <div>
              <label className="label">IBAN</label>
              <input value={settings.iban} placeholder="FR76 1234 …"
                onChange={e => setSettings(s => s ? { ...s, iban: e.target.value } : s)} />
            </div>
            <div>
              <label className="label">BIC (optionnel)</label>
              <input value={settings.bic} placeholder="BNPAFRPP"
                onChange={e => setSettings(s => s ? { ...s, bic: e.target.value } : s)} />
            </div>
            <div>
              <label className="label">Nom bénéficiaire QR</label>
              <input value={settings.beneficiaryName}
                onChange={e => setSettings(s => s ? { ...s, beneficiaryName: e.target.value } : s)} />
            </div>
          </div>
        </section>

        {/* Backup */}
        <section>
          <p className="text-accent font-bold mb-1">Sauvegarde iCloud</p>
          {daysSinceBackup === null ? (
            <p className="text-yellow-400 text-xs mb-3">⚠️ Aucune sauvegarde effectuée</p>
          ) : daysSinceBackup > 7 ? (
            <p className="text-yellow-400 text-xs mb-3">⚠️ Dernière sauvegarde il y a {daysSinceBackup} jours</p>
          ) : (
            <p className="text-green-400 text-xs mb-3">
              ✓ Dernière sauvegarde : {new Date(settings.lastBackupAt!).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
            </p>
          )}

          <div className="space-y-2">
            <button
              onClick={handleBackup}
              disabled={backupLoading}
              className="btn-gold"
            >
              {backupLoading ? '⏳ Export en cours…' : '☁️ Sauvegarder maintenant'}
            </button>

            <p className="text-text-muted text-xs text-center px-4">
              Le fichier .backup sera téléchargé → appuyez sur «&nbsp;Enregistrer dans Fichiers&nbsp;» → iCloud Drive
            </p>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full border border-accent/30 text-accent rounded-2xl py-4 font-medium"
            >
              📂 Restaurer depuis un fichier .backup
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".backup,.json"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </section>

        {/* Import preview modal */}
        {importPreview && (
          <div className="fixed inset-0 bg-black/80 flex items-end z-50 p-4">
            <div className="bg-bg-secondary rounded-2xl p-5 w-full space-y-4">
              <h2 className="font-bold text-lg text-accent">Confirmer la restauration</h2>
              <div className="card">
                <p className="text-sm text-text-muted mb-1">Exporté le</p>
                <p className="font-medium">{new Date(importPreview.payload.exportedAt).toLocaleString('fr-FR')}</p>
                <p className="text-sm text-text-muted mt-2 mb-1">Contenu</p>
                <p className="font-medium">{importPreview.summary}</p>
              </div>
              <p className="text-yellow-400 text-sm">
                ⚠️ Cette action remplacera TOUTES les données actuelles. Cette opération est irréversible.
              </p>
              <button onClick={confirmImport} disabled={importing} className="btn-gold">
                {importing ? 'Restauration…' : '✓ Confirmer la restauration'}
              </button>
              <button onClick={() => setImportPreview(null)} className="btn-secondary w-full text-center">Annuler</button>
            </div>
          </div>
        )}

        {/* App info */}
        <section className="text-center text-text-muted text-xs space-y-1 pt-4">
          <p>Chogan VDI · v1.0.0</p>
          <p>Stockage local IndexedDB · Offline first</p>
          <p>Sauvegarde manuelle via fichier .backup</p>
        </section>
      </div>
    </div>
  )
}
