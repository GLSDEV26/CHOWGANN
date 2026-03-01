// src/db/database.ts
import Dexie, { type Table } from 'dexie'
import type { Customer, Order, Product, Settings } from '../types'

class ChoganDB extends Dexie {
  products!: Table<Product, number>
  customers!: Table<Customer, number>
  orders!: Table<Order, number>
  settings!: Table<Settings, number>

  constructor() {
    super('ChoganVDI')
    this.version(2).stores({
  products: '++id, name, reference, family, isActive, createdAt, updatedAt, price',
  customers: '++id, lastName, firstName, phone, email, createdAt, updatedAt',
  orders: '++id, orderNumber, status, paymentMethod, customerId, createdAt, updatedAt',
  settings: '++id',
})
  }
}

export const db = new ChoganDB()

// ─── Helpers ────────────────────────────────────────────────────────────────

export function generateOrderNumber(): string {
  const d = new Date()
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  const rand = String(Math.floor(Math.random() * 9000) + 1000)
  return `CMD-${date}-${rand}`
}

export function now(): string {
  return new Date().toISOString()
}

// ─── Products ────────────────────────────────────────────────────────────────

export async function getProducts(): Promise<Product[]> {
  return db.products.orderBy('name').toArray()
}

export async function getActiveProducts(): Promise<Product[]> {
  // undefined = actif ; seul false = inactif
  return db.products
    .filter(p => p.isActive !== false)
    .sortBy('name')
}

export async function upsertProduct(product: Product): Promise<number> {
  product.updatedAt = now()
  if (!product.createdAt) product.createdAt = now()
  if (product.isActive === undefined) product.isActive = true  // ✅ important
  return db.products.put(product)
}

export async function deleteProduct(id: number): Promise<void> {
  return db.products.delete(id)
}

// ─── Customers ───────────────────────────────────────────────────────────────

export async function getCustomers(): Promise<Customer[]> {
  return db.customers.orderBy('lastName').toArray()
}

export async function upsertCustomer(customer: Customer): Promise<number> {
  customer.updatedAt = now()
  if (!customer.createdAt) customer.createdAt = now()
  return db.customers.put(customer)
}

export async function deleteCustomer(id: number): Promise<void> {
  return db.customers.delete(id)
}

// ─── Orders ──────────────────────────────────────────────────────────────────

export async function getOrders(): Promise<Order[]> {
  return db.orders.orderBy('createdAt').reverse().toArray()
}

export async function getOrdersByCustomer(customerId: number): Promise<Order[]> {
  return db.orders.where('customerId').equals(customerId).reverse().sortBy('createdAt')
}

export async function upsertOrder(order: Order): Promise<number> {
  order.updatedAt = now()
  if (!order.createdAt) order.createdAt = now()
  if (!order.orderNumber) order.orderNumber = generateOrderNumber()
  return db.orders.put(order)
}

export async function deleteOrder(id: number): Promise<void> {
  return db.orders.delete(id)
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export async function getSettings(): Promise<Settings> {
  const s = await db.settings.toArray()
  if (s.length > 0) return s[0]
  const defaults: Settings = {
    ownerName: '',
    businessName: '',
    iban: '',
    bic: '',
    beneficiaryName: '',
  }
  const id = await db.settings.add(defaults)
  return { ...defaults, id }
}

export async function saveSettings(settings: Settings): Promise<void> {
  if (settings.id) {
    await db.settings.put(settings)
  } else {
    await db.settings.add(settings)
  }
}
