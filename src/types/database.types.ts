// Generated from the Supabase schema. Regenerate after schema changes instead of editing by hand.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      business_types: {
        Row: {
          created_at: string | null
          icon: string
          id: string
          is_active: boolean | null
          name: string
          slug: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          icon?: string
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          icon?: string
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string | null
          id: string
          name: string
          restaurant_id: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          restaurant_id: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          restaurant_id?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          allow_custom_amount: boolean | null
          category_id: string
          colors: Json | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          images: Json | null
          is_available: boolean | null
          is_hidden: boolean | null
          is_offer: boolean
          name: string
          offer_title: string | null
          original_price: number | null
          out_of_stock_until: string | null
          price: number
          sizes: Json | null
          unit: string | null
        }
        Insert: {
          allow_custom_amount?: boolean | null
          category_id: string
          colors?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          images?: Json | null
          is_available?: boolean | null
          is_hidden?: boolean | null
          is_offer?: boolean
          name: string
          offer_title?: string | null
          original_price?: number | null
          out_of_stock_until?: string | null
          price: number
          sizes?: Json | null
          unit?: string | null
        }
        Update: {
          allow_custom_amount?: boolean | null
          category_id?: string
          colors?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          images?: Json | null
          is_available?: boolean | null
          is_hidden?: boolean | null
          is_offer?: boolean
          name?: string
          offer_title?: string | null
          original_price?: number | null
          out_of_stock_until?: string | null
          price?: number
          sizes?: Json | null
          unit?: string | null
        }
        Relationships: []
      }
      offers: {
        Row: {
          bonus_item_id: string | null
          bonus_quantity: number
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          images: Json | null
          is_active: boolean
          item3_id: string | null
          item3_quantity: number | null
          item4_id: string | null
          item4_quantity: number | null
          min_quantity: number
          offer_price: number
          original_price: number | null
          primary_item_id: string | null
          restaurant_id: string
          sort_order: number | null
          title: string
        }
        Insert: {
          bonus_item_id?: string | null
          bonus_quantity?: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          images?: Json | null
          is_active?: boolean
          item3_id?: string | null
          item3_quantity?: number | null
          item4_id?: string | null
          item4_quantity?: number | null
          min_quantity?: number
          offer_price: number
          original_price?: number | null
          primary_item_id?: string | null
          restaurant_id: string
          sort_order?: number | null
          title: string
        }
        Update: {
          bonus_item_id?: string | null
          bonus_quantity?: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          images?: Json | null
          is_active?: boolean
          item3_id?: string | null
          item3_quantity?: number | null
          item4_id?: string | null
          item4_quantity?: number | null
          min_quantity?: number
          offer_price?: number
          original_price?: number | null
          primary_item_id?: string | null
          restaurant_id?: string
          sort_order?: number | null
          title?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          created_at: string
          id: string
          items: Json
          location_url: string | null
          restaurant_id: string
          status: string
          total_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          items: Json
          location_url?: string | null
          restaurant_id: string
          status?: string
          total_price: number
        }
        Update: {
          created_at?: string
          id?: string
          items?: Json
          location_url?: string | null
          restaurant_id?: string
          status?: string
          total_price?: number
        }
        Relationships: []
      }
      platform_ads: {
        Row: {
          created_at: string | null
          id: string
          image_url: string
          is_active: boolean | null
          latitude: number | null
          link_url: string | null
          longitude: number | null
          radius_km: number | null
          sort_order: number | null
          target_region: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url: string
          is_active?: boolean | null
          latitude?: number | null
          link_url?: string | null
          longitude?: number | null
          radius_km?: number | null
          sort_order?: number | null
          target_region?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          latitude?: number | null
          link_url?: string | null
          longitude?: number | null
          radius_km?: number | null
          sort_order?: number | null
          target_region?: string | null
        }
        Relationships: []
      }
      platform_categories: {
        Row: {
          created_at: string | null
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          id: string
          privacy_policy: string | null
          terms_of_service: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          privacy_policy?: string | null
          terms_of_service?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          privacy_policy?: string | null
          terms_of_service?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          phone: string
          restaurant_id: string | null
          role: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          phone: string
          restaurant_id?: string | null
          role?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string
          restaurant_id?: string | null
          role?: string
        }
        Relationships: []
      }
      qr_scans: {
        Row: {
          created_at: string | null
          device_type: string | null
          id: string
          restaurant_id: string
          source: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string | null
          device_type?: string | null
          id?: string
          restaurant_id: string
          source?: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string | null
          device_type?: string | null
          id?: string
          restaurant_id?: string
          source?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      restaurant_platform_categories: {
        Row: {
          platform_category_id: string
          restaurant_id: string
        }
        Insert: {
          platform_category_id: string
          restaurant_id: string
        }
        Update: {
          platform_category_id?: string
          restaurant_id?: string
        }
        Relationships: []
      }
      restaurants: {
        Row: {
          closing_time: string | null
          cover_url: string | null
          created_at: string | null
          days_off: Json | null
          delivery_radius_km: number | null
          delivery_tiers: Json | null
          enable_whatsapp_orders: boolean | null
          has_delivery: boolean | null
          holiday_message: string | null
          id: string
          is_menu_active: boolean | null
          is_on_holiday: boolean | null
          is_subscription_active: boolean | null
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          max_offers_limit: number | null
          menu_note: string | null
          name: string
          opening_time: string | null
          phone: string | null
          primary_color: string | null
          show_on_home: boolean
          slug: string
          store_type: string | null
          subscription_notes: string | null
          whatsapp_number: string
        }
        Insert: {
          closing_time?: string | null
          cover_url?: string | null
          created_at?: string | null
          days_off?: Json | null
          delivery_radius_km?: number | null
          delivery_tiers?: Json | null
          enable_whatsapp_orders?: boolean | null
          has_delivery?: boolean | null
          holiday_message?: string | null
          id?: string
          is_menu_active?: boolean | null
          is_on_holiday?: boolean | null
          is_subscription_active?: boolean | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          max_offers_limit?: number | null
          menu_note?: string | null
          name: string
          opening_time?: string | null
          phone?: string | null
          primary_color?: string | null
          show_on_home?: boolean
          slug: string
          store_type?: string | null
          subscription_notes?: string | null
          whatsapp_number: string
        }
        Update: {
          closing_time?: string | null
          cover_url?: string | null
          created_at?: string | null
          days_off?: Json | null
          delivery_radius_km?: number | null
          delivery_tiers?: Json | null
          enable_whatsapp_orders?: boolean | null
          has_delivery?: boolean | null
          holiday_message?: string | null
          id?: string
          is_menu_active?: boolean | null
          is_on_holiday?: boolean | null
          is_subscription_active?: boolean | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          max_offers_limit?: number | null
          menu_note?: string | null
          name?: string
          opening_time?: string | null
          phone?: string | null
          primary_color?: string | null
          show_on_home?: boolean
          slug?: string
          store_type?: string | null
          subscription_notes?: string | null
          whatsapp_number?: string
        }
        Relationships: []
      }
      service_zones: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean
          latitude: number
          longitude: number
          name: string
          radius_km: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          latitude: number
          longitude: number
          name: string
          radius_km?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          latitude?: number
          longitude?: number
          name?: string
          radius_km?: number
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
