// src/services/qrcode.ts
import QRCode from 'qrcode'

export async function generateEPCQRCode(
  iban: string,
  bic: string,
  beneficiary: string,
  amount: number
): Promise<string> {
  // EPC QR Code format (SEPA Credit Transfer)
  const epcString = [
    'BCD',           // Service Tag
    '002',           // Version
    '1',             // Character Set (UTF-8)
    'SCT',           // Identification
    bic || '',       // BIC (optional in SEPA 2.0)
    beneficiary,     // Beneficiary Name
    iban.replace(/\s/g, ''), // IBAN
    `EUR${amount.toFixed(2)}`, // Amount
    '',              // Purpose (empty)
    '',              // Remittance info (structured, empty)
    '',              // Remittance info (unstructured, empty)
    '',              // Beneficiary to originator info
  ].join('\n')

  const dataUrl = await QRCode.toDataURL(epcString, {
    errorCorrectionLevel: 'M',
    width: 256,
    margin: 2,
    color: {
      dark: '#C6A756',
      light: '#1A1A1A',
    },
  })

  return dataUrl
}
