import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  image_url: string | null
}

interface CartState {
  items: CartItem[]
  restaurantId: string | null
  
  // Actions
  addItem: (item: Omit<CartItem, 'quantity'>, restaurantId: string) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  
  // Getters
  getTotalItems: () => number
  getTotalPrice: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      restaurantId: null,

      addItem: (item, restaurantId) => {
        set((state) => {
          // If trying to add item from a different restaurant, clear cart first
          const isDifferentRestaurant = state.restaurantId && state.restaurantId !== restaurantId;
          const currentItems = isDifferentRestaurant ? [] : state.items;
          
          const existingItemIndex = currentItems.findIndex((i) => i.id === item.id);
          
          if (existingItemIndex > -1) {
            // Update quantity if item exists
            const newItems = [...currentItems];
            newItems[existingItemIndex].quantity += 1;
            return { items: newItems, restaurantId };
          }
          
          // Add new item
          return {
            items: [...currentItems, { ...item, quantity: 1 }],
            restaurantId,
          };
        });
      },

      removeItem: (id) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
          // Clear restaurantId if cart is empty
          restaurantId: state.items.length === 1 ? null : state.restaurantId
        }));
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

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },

      getTotalPrice: () => {
        return get().items.reduce((total, item) => total + (item.price * item.quantity), 0);
      },
    }),
    {
      name: 'digital-menu-cart', // key in local storage
    }
  )
)
