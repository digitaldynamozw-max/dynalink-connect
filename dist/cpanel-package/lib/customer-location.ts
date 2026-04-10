import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface CustomerLocationState {
  address: string
  hydrated: boolean
  setAddress: (address: string) => void
  markHydrated: () => void
}

export const useCustomerLocationStore = create<CustomerLocationState>()(
  persist(
    (set) => ({
      address: '',
      hydrated: false,
      setAddress: (address) => set({ address }),
      markHydrated: () => set({ hydrated: true }),
    }),
    {
      name: 'customer-location-storage',
      onRehydrateStorage: () => (state) => {
        state?.markHydrated()
      },
    }
  )
)

export function normalizeAddressLabel(address: string) {
  return address.trim().replace(/\s+/g, ' ')
}
