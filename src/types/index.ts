// src/types/index.ts

export type OrderStatus = 'draft' | 'pending' | 'paid' | 'delivered' | 'cancelled'
export type PaymentMethod = 'cash' | 'transfer' | 'card' | 'pending'

export interface Product {
  id?: number
  name: string
  reference: string
  family: string
  price: number
  isActive: boolean
  notes: string
  createdAt: string
  updatedAt: string
}

export interface Customer {
  id?: number
  firstName: string
  lastName: string
  phone: string
  email: string
  notes: string
  hasConsent: boolean
  createdAt: string
  updatedAt: string
}

export interface OrderItem {
  id?: number
  orderId?: number
  productId: number
  productName: string
  productRef: string
  unitPrice: number
  quantity: number
  discountPct: number
  lineTotal: number
}

export interface Order {
  id?: number
  orderNumber: string
  status: OrderStatus
  paymentMethod: PaymentMethod
  customerId: number
  customerName: string
  notes: string
  items: OrderItem[]
  subtotal: number
  totalDiscount: number
  totalAmount: number
  createdAt: string
  updatedAt: string
  paidAt?: string
  deliveredAt?: string
}

export interface Settings {
  id?: number
  ownerName: string
  businessName: string
  iban: string
  bic: string
  beneficiaryName: string
  lastBackupAt?: string
}

export interface BackupPayload {
  version: number
  exportedAt: string
  products: Product[]
  customers: Customer[]
  orders: Order[]
  settings: Omit<Settings, 'id'>
}

export const STATUS_LABELS: Record<OrderStatus, string> = {
  draft: 'Brouillon',
  pending: 'En attente paiement',
  paid: 'Payée',
  delivered: 'Livrée',
  cancelled: 'Annulée',
}

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: 'Espèces',
  transfer: 'Virement',
  card: 'Carte externe',
  pending: 'En attente',
}

export const STATUS_COLORS: Record<OrderStatus, string> = {
  draft: '#666666',
  pending: '#FF9800',
  paid: '#4CAF50',
  delivered: '#2196F3',
  cancelled: '#F44336',
}
