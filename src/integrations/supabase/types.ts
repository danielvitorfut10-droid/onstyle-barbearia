export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          barber_id: string
          client_name: string
          client_phone: string
          created_at: string
          ends_at: string
          id: string
          notes: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          price_cents: number
          service_id: string
          starts_at: string
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          barber_id: string
          client_name: string
          client_phone: string
          created_at?: string
          ends_at: string
          id?: string
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          price_cents?: number
          service_id: string
          starts_at: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          barber_id?: string
          client_name?: string
          client_phone?: string
          created_at?: string
          ends_at?: string
          id?: string
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          price_cents?: number
          service_id?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      barbers: {
        Row: {
          active: boolean
          bio: string | null
          created_at: string
          id: string
          name: string
          nickname: string | null
          photo_url: string | null
          sort_order: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active?: boolean
          bio?: string | null
          created_at?: string
          id?: string
          name: string
          nickname?: string | null
          photo_url?: string | null
          sort_order?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          bio?: string | null
          created_at?: string
          id?: string
          name?: string
          nickname?: string | null
          photo_url?: string | null
          sort_order?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      blocked_slots: {
        Row: {
          barber_id: string
          created_at: string
          ends_at: string
          id: string
          reason: string | null
          starts_at: string
        }
        Insert: {
          barber_id: string
          created_at?: string
          ends_at: string
          id?: string
          reason?: string | null
          starts_at: string
        }
        Update: {
          barber_id?: string
          created_at?: string
          ends_at?: string
          id?: string
          reason?: string | null
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocked_slots_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
        ]
      }
      business_hours: {
        Row: {
          close_time: string
          closed: boolean
          open_time: string
          weekday: number
        }
        Insert: {
          close_time?: string
          closed?: boolean
          open_time?: string
          weekday: number
        }
        Update: {
          close_time?: string
          closed?: boolean
          open_time?: string
          weekday?: number
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount_cents: number
          barber_id: string
          created_at: string
          expense_date: string
          id: string
          item_name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          amount_cents?: number
          barber_id: string
          created_at?: string
          expense_date: string
          id?: string
          item_name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          barber_id?: string
          created_at?: string
          expense_date?: string
          id?: string
          item_name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          barber_id: string | null
          body: string | null
          created_at: string
          id: string
          read: boolean
          title: string
          type: string
        }
        Insert: {
          barber_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          read?: boolean
          title: string
          type: string
        }
        Update: {
          barber_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          read?: boolean
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          category: string
          cost_cents: number
          created_at: string
          id: string
          min_quantity: number
          name: string
          price_cents: number
          quantity: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          category?: string
          cost_cents?: number
          created_at?: string
          id?: string
          min_quantity?: number
          name: string
          price_cents?: number
          quantity?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string
          cost_cents?: number
          created_at?: string
          id?: string
          min_quantity?: number
          name?: string
          price_cents?: number
          quantity?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          duration_min: number
          id: string
          name: string
          price_cents: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          duration_min?: number
          id?: string
          name: string
          price_cents?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          duration_min?: number
          id?: string
          name?: string
          price_cents?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          address: string | null
          id: number
          instagram: string | null
          logo_url: string | null
          maps_url: string | null
          phone: string | null
          shop_name: string
          slot_interval_min: number
          updated_at: string
          whatsapp: string | null
          whatsapp_template: string | null
        }
        Insert: {
          address?: string | null
          id?: number
          instagram?: string | null
          logo_url?: string | null
          maps_url?: string | null
          phone?: string | null
          shop_name?: string
          slot_interval_min?: number
          updated_at?: string
          whatsapp?: string | null
          whatsapp_template?: string | null
        }
        Update: {
          address?: string | null
          id?: number
          instagram?: string | null
          logo_url?: string | null
          maps_url?: string | null
          phone?: string | null
          shop_name?: string
          slot_interval_min?: number
          updated_at?: string
          whatsapp?: string | null
          whatsapp_template?: string | null
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          product_id: string
          quantity: number
          type: Database["public"]["Enums"]["stock_movement_type"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          product_id: string
          quantity: number
          type: Database["public"]["Enums"]["stock_movement_type"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          product_id?: string
          quantity?: number
          type?: Database["public"]["Enums"]["stock_movement_type"]
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_public_booking: {
        Args: {
          _barber_id: string
          _label: string
          _name: string
          _notes: string
          _phone: string
          _service_id: string
          _starts_at: string
        }
        Returns: Json
      }
      current_barber_id: { Args: never; Returns: string }
      get_public_busy: {
        Args: { _barber_id: string; _end: string; _start: string }
        Returns: {
          ends_at: string
          kind: string
          starts_at: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      set_appointment_price: {
        Args: {
          _appointment_id: string
          _price_cents: number
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "barber" | "client"
      appointment_status:
        | "agendado"
        | "confirmado"
        | "concluido"
        | "cancelado"
        | "nao_compareceu"
      payment_method: "dinheiro" | "pix" | "debito" | "credito"
      stock_movement_type: "entrada" | "saida"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "barber", "client"],
      appointment_status: [
        "agendado",
        "confirmado",
        "concluido",
        "cancelado",
        "nao_compareceu",
      ],
      payment_method: ["dinheiro", "pix", "debito", "credito"],
      stock_movement_type: ["entrada", "saida"],
    },
  },
} as const
