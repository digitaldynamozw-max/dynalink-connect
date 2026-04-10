import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SelectedProductOption } from '@/lib/product-options'

export interface CartItem {
  id: string
  productId: string
  name: string
  price: number
  basePrice?: number
  quantity: number
  image?: string
  vendorId?: string | null
  vendorName?: string | null
  selectedOptions?: SelectedProductOption[]
  selectedOptionsSummary?: string
}

type AddCartItemInput = Omit<CartItem, 'quantity'>

interface AddItemResult {
  ok: boolean
  error?: string
}

interface CartStore {
  items: CartItem[]
  addItem: (item: AddCartItemInput) => AddItemResult
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  getTotal: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => {
        const items = get().items
        const currentStoreKey = items[0]?.vendorId || 'admin-store'
        const nextStoreKey = item.vendorId || 'admin-store'
        if (items.length > 0 && currentStoreKey !== nextStoreKey) {
          const currentStoreName = items[0]?.vendorName || 'Admin Store'
          const nextStoreName = item.vendorName || 'Admin Store'
          return {
            ok: false,
            error: `You can only order from one store at a time. Clear your cart to switch from ${currentStoreName} to ${nextStoreName}.`,
          }
        }

        const existing = items.find(i => i.id === item.id)
        if (existing) {
          set({
            items: items.map(i =>
              i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
            )
          })
        } else {
          set({ items: [...items, { ...item, quantity: 1 }] })
        }
        return { ok: true }
      },
      removeItem: (id) => {
        set({ items: get().items.filter(i => i.id !== id) })
      },
      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          get().removeItem(id)
        } else {
          set({
            items: get().items.map(i =>
              i.id === id ? { ...i, quantity } : i
            )
          })
        }
      },
      clearCart: () => set({ items: [] }),
      getTotal: () => get().items.reduce((total, item) => total + item.price * item.quantity, 0)
    }),
    {
      name: 'cart-storage'
    }
  )
)
