export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      restaurants: {
        Row: {
          id: string
          created_at: string
          name: string
          slug: string
          primary_color: string | null
          whatsapp_number: string
          logo_url: string | null
          cover_url: string | null
          platform_category_id: string | null
          latitude: number | null
          longitude: number | null
          delivery_radius_km: number | null
          store_type: string | null
          has_delivery: boolean | null
          enable_whatsapp_orders: boolean | null
          is_subscription_active?: boolean | null
          is_menu_active?: boolean | null
          subscription_notes?: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          slug: string
          primary_color?: string | null
          whatsapp_number: string
          logo_url?: string | null
          cover_url?: string | null
          platform_category_id?: string | null
          latitude?: number | null
          longitude?: number | null
          delivery_radius_km?: number | null
          store_type?: string | null
          has_delivery?: boolean | null
          enable_whatsapp_orders?: boolean | null
          is_subscription_active?: boolean | null
          is_menu_active?: boolean | null
          subscription_notes?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          slug?: string
          primary_color?: string | null
          whatsapp_number?: string
          logo_url?: string | null
          cover_url?: string | null
          platform_category_id?: string | null
          latitude?: number | null
          longitude?: number | null
          delivery_radius_km?: number | null
          store_type?: string | null
          has_delivery?: boolean | null
          enable_whatsapp_orders?: boolean | null
          is_subscription_active?: boolean | null
          is_menu_active?: boolean | null
          subscription_notes?: string | null
        }
      }
      categories: {
        Row: {
          id: string
          created_at: string
          restaurant_id: string
          name: string
          sort_order: number | null
        }
        Insert: {
          id?: string
          created_at?: string
          restaurant_id: string
          name: string
          sort_order?: number | null
        }
        Update: {
          id?: string
          created_at?: string
          restaurant_id?: string
          name?: string
          sort_order?: number | null
        }
      }
      menu_items: {
        Row: {
          id: string
          created_at: string
          category_id: string
          name: string
          description: string | null
          price: number
          image_url: string | null
          is_available: boolean | null
          platform_category_id: string | null
          is_offer: boolean
          original_price: number | null
          offer_title: string | null
          images: any
          sizes: any
          colors: any
          is_hidden?: boolean | null
          out_of_stock_until?: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          category_id: string
          name: string
          description?: string | null
          price: number
          image_url?: string | null
          is_available?: boolean | null
          platform_category_id?: string | null
          is_offer?: boolean
          original_price?: number | null
          offer_title?: string | null
          images?: any
          sizes?: any
          colors?: any
          is_hidden?: boolean | null
          out_of_stock_until?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          category_id?: string
          name?: string
          description?: string | null
          price?: number
          image_url?: string | null
          is_available?: boolean | null
          platform_category_id?: string | null
          is_offer?: boolean
          original_price?: number | null
          offer_title?: string | null
          images?: any
          sizes?: any
          colors?: any
          is_hidden?: boolean | null
          out_of_stock_until?: string | null
        }
      }
      ads: {
        Row: {
          id: string
          created_at: string
          restaurant_id: string
          image_url: string
          link_url: string | null
          sort_order: number | null
          is_active: boolean | null
        }
        Insert: {
          id?: string
          created_at?: string
          restaurant_id: string
          image_url: string
          link_url?: string | null
          sort_order?: number | null
          is_active?: boolean | null
        }
        Update: {
          id?: string
          created_at?: string
          restaurant_id?: string
          image_url?: string
          link_url?: string | null
          sort_order?: number | null
          is_active?: boolean | null
        }
      }
      orders: {
        Row: {
          id: string
          created_at: string
          restaurant_id: string
          total_price: number
          items: Json
          location_url: string | null
          status: string
        }
        Insert: {
          id?: string
          created_at?: string
          restaurant_id: string
          total_price: number
          items: Json
          location_url?: string | null
          status?: string
        }
        Update: {
          id?: string
          created_at?: string
          restaurant_id?: string
          total_price?: number
          items?: Json
          location_url?: string | null
          status?: string
        }
      }
      offers: {
        Row: {
          id: string
          created_at: string
          restaurant_id: string
          title: string
          description: string | null
          original_price: number | null
          offer_price: number
          image_url: string | null
          type: string
          target_item_id: string | null
          primary_item_id: string | null
          min_quantity: number
          bonus_item_id: string | null
          bonus_quantity: number
          is_active: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          restaurant_id: string
          title: string
          description?: string | null
          original_price?: number | null
          offer_price: number
          image_url?: string | null
          type?: string
          target_item_id?: string | null
          primary_item_id?: string | null
          min_quantity?: number
          bonus_item_id?: string | null
          bonus_quantity?: number
          is_active?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          restaurant_id?: string
          title?: string
          description?: string | null
          original_price?: number | null
          offer_price?: number
          image_url?: string | null
          type?: string
          target_item_id?: string | null
          primary_item_id?: string | null
          min_quantity?: number
          bonus_item_id?: string | null
          bonus_quantity?: number
          is_active?: boolean
        }
      }
      platform_categories: {
        Row: {
          id: string
          created_at: string
          name: string
          icon: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          icon?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          icon?: string | null
        }
      }
      profiles: {
        Row: {
          id: string
          created_at: string
          phone: string
          full_name: string | null
          role: string
          restaurant_id: string | null
        }
        Insert: {
          id: string
          created_at?: string
          phone: string
          full_name?: string | null
          role?: string
          restaurant_id?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          phone?: string
          full_name?: string | null
          role?: string
          restaurant_id?: string | null
        }
      }
      ratings: {
        Row: {
          id: string
          created_at: string
          restaurant_id: string
          user_phone: string
          user_name: string | null
          rating: number
          comment: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          restaurant_id: string
          user_phone: string
          user_name?: string | null
          rating: number
          comment?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          restaurant_id?: string
          user_phone?: string
          user_name?: string | null
          rating?: number
          comment?: string | null
        }
      }
      platform_ads: {
        Row: {
          id: string
          created_at: string
          image_url: string
          link_url: string | null
          sort_order: number | null
          is_active: boolean | null
          target_region: string | null
          latitude: number | null
          longitude: number | null
          radius_km: number | null
        }
        Insert: {
          id?: string
          created_at?: string
          image_url: string
          link_url?: string | null
          sort_order?: number | null
          is_active?: boolean | null
          target_region?: string | null
          latitude?: number | null
          longitude?: number | null
          radius_km?: number | null
        }
        Update: {
          id?: string
          created_at?: string
          image_url?: string
          link_url?: string | null
          sort_order?: number | null
          is_active?: boolean | null
          target_region?: string | null
          latitude?: number | null
          longitude?: number | null
          radius_km?: number | null
        }
      }
      restaurant_platform_categories: {
        Row: {
          restaurant_id: string
          platform_category_id: string
        }
        Insert: {
          restaurant_id: string
          platform_category_id: string
        }
        Update: {
          restaurant_id?: string
          platform_category_id?: string
        }
      }
      service_zones: {
        Row: {
          id: string
          created_at: string
          name: string
          latitude: number
          longitude: number
          radius_km: number
          is_active: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          latitude: number
          longitude: number
          radius_km?: number
          is_active?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          latitude?: number
          longitude?: number
          radius_km?: number
          is_active?: boolean
        }
      }
      qr_scans: {
        Row: {
          id: string
          created_at: string
          restaurant_id: string
          source: string
          device_type: string | null
          user_agent: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          restaurant_id: string
          source?: string
          device_type?: string | null
          user_agent?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          restaurant_id?: string
          source?: string
          device_type?: string | null
          user_agent?: string | null
        }
      }
    }
  }
}

