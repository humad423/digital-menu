import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Only what the order needs: full menu items would fill the browser's storage
export interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
}

interface CartState {
  items: CartItem[]
  restaurantId: string | null

  // Actions
  addItem: (item: Omit<CartItem, 'quantity'>, restaurantId: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      restaurantId: null,

      addItem: (item, restaurantId) => {
        set((state) => {
          // A cart holds one store's items; callers confirm before switching stores
          const currentItems = state.restaurantId === restaurantId ? state.items : [];
          const existing = currentItems.find((i) => i.id === item.id);

          return {
            restaurantId,
            items: existing
              ? currentItems.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i))
              : [...currentItems, { id: item.id, name: item.name, price: item.price, quantity: 1 }],
          };
        });
      },

      updateQuantity: (id, quantity) => {
        set((state) => {
          if (quantity <= 0) {
            const newItems = state.items.filter((item) => item.id !== id);
            return {
              items: newItems,
              restaurantId: newItems.length === 0 ? null : state.restaurantId
            };
          }

          return {
            items: state.items.map((item) =>
              item.id === id ? { ...item, quantity } : item
            ),
          };
        });
      },

      clearCart: () => set({ items: [], restaurantId: null }),
    }),
    {
      name: 'digital-menu-cart', // key in local storage
      version: 2,
      // Read from storage after mount, so the first client render matches the server
      skipHydration: true,
      migrate: (persisted: any) => ({
        restaurantId: persisted?.restaurantId ?? null,
        items: (persisted?.items ?? []).map((i: any) => ({
          id: i.id,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
        })),
      }),
    }
  )
)

/** Asks before an item from another store replaces what's already in the cart. */
export function confirmCartStoreSwitch(restaurantId: string): boolean {
  const { restaurantId: current, items } = useCartStore.getState()
  if (!current || current === restaurantId || items.length === 0) return true
  return window.confirm('سلتك فيها منتجات من متجر تاني. بدك تفضّيها وتبدأ طلب جديد من هاد المتجر؟')
}
