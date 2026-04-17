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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      beneficiaries: {
        Row: {
          account_number: string | null
          bank_name: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          account_number?: string | null
          bank_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          account_number?: string | null
          bank_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      bill_payments: {
        Row: {
          account_number: string
          amount: number
          category: string
          created_at: string
          id: string
          provider: string
          status: Database["public"]["Enums"]["transaction_status"]
          user_id: string
        }
        Insert: {
          account_number: string
          amount: number
          category: string
          created_at?: string
          id?: string
          provider: string
          status?: Database["public"]["Enums"]["transaction_status"]
          user_id: string
        }
        Update: {
          account_number?: string
          amount?: number
          category?: string
          created_at?: string
          id?: string
          provider?: string
          status?: Database["public"]["Enums"]["transaction_status"]
          user_id?: string
        }
        Relationships: []
      }
      cards: {
        Row: {
          card_holder: string
          card_number: string
          created_at: string
          cvv: string
          expiry_date: string
          id: string
          international_payments: boolean
          online_payments: boolean
          spending_limit: number | null
          status: Database["public"]["Enums"]["card_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          card_holder: string
          card_number: string
          created_at?: string
          cvv: string
          expiry_date: string
          id?: string
          international_payments?: boolean
          online_payments?: boolean
          spending_limit?: number | null
          status?: Database["public"]["Enums"]["card_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          card_holder?: string
          card_number?: string
          created_at?: string
          cvv?: string
          expiry_date?: string
          id?: string
          international_payments?: boolean
          online_payments?: boolean
          spending_limit?: number | null
          status?: Database["public"]["Enums"]["card_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      exchange_rates: {
        Row: {
          from_currency: string
          id: string
          rate: number
          to_currency: string
          updated_at: string
        }
        Insert: {
          from_currency: string
          id?: string
          rate: number
          to_currency: string
          updated_at?: string
        }
        Update: {
          from_currency?: string
          id?: string
          rate?: number
          to_currency?: string
          updated_at?: string
        }
        Relationships: []
      }
      kyc_documents: {
        Row: {
          admin_notes: string | null
          created_at: string
          document_type: string
          document_url: string
          id: string
          selfie_url: string | null
          status: Database["public"]["Enums"]["kyc_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          document_type: string
          document_url: string
          id?: string
          selfie_url?: string | null
          status?: Database["public"]["Enums"]["kyc_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          document_type?: string
          document_url?: string
          id?: string
          selfie_url?: string | null
          status?: Database["public"]["Enums"]["kyc_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      loans: {
        Row: {
          amount: number
          amount_paid: number
          created_at: string
          duration_months: number
          id: string
          interest_rate: number
          monthly_payment: number | null
          next_payment_date: string | null
          status: Database["public"]["Enums"]["loan_status"]
          total_repayment: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          amount_paid?: number
          created_at?: string
          duration_months: number
          id?: string
          interest_rate?: number
          monthly_payment?: number | null
          next_payment_date?: string | null
          status?: Database["public"]["Enums"]["loan_status"]
          total_repayment?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          amount_paid?: number
          created_at?: string
          duration_months?: number
          id?: string
          interest_rate?: number
          monthly_payment?: number | null
          next_payment_date?: string | null
          status?: Database["public"]["Enums"]["loan_status"]
          total_repayment?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          title: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_number: string
          avatar_url: string | null
          country: string
          created_at: string
          credit_score: number
          email: string
          full_name: string
          id: string
          is_frozen: boolean
          kyc_status: Database["public"]["Enums"]["kyc_status"]
          pin_hash: string | null
          primary_currency: string
          referral_code: string | null
          referred_by: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_number: string
          avatar_url?: string | null
          country?: string
          created_at?: string
          credit_score?: number
          email: string
          full_name: string
          id?: string
          is_frozen?: boolean
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          pin_hash?: string | null
          primary_currency?: string
          referral_code?: string | null
          referred_by?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_number?: string
          avatar_url?: string | null
          country?: string
          created_at?: string
          credit_score?: number
          email?: string
          full_name?: string
          id?: string
          is_frozen?: boolean
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          pin_hash?: string | null
          primary_currency?: string
          referral_code?: string | null
          referred_by?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          bonus_amount: number
          created_at: string
          id: string
          is_paid: boolean
          referred_id: string
          referrer_id: string
        }
        Insert: {
          bonus_amount?: number
          created_at?: string
          id?: string
          is_paid?: boolean
          referred_id: string
          referrer_id: string
        }
        Update: {
          bonus_amount?: number
          created_at?: string
          id?: string
          is_paid?: boolean
          referred_id?: string
          referrer_id?: string
        }
        Relationships: []
      }
      savings_goals: {
        Row: {
          created_at: string
          current_amount: number
          id: string
          interest_rate: number
          is_matured: boolean
          lock_period_months: number
          maturity_date: string | null
          name: string
          target_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_amount?: number
          id?: string
          interest_rate?: number
          is_matured?: boolean
          lock_period_months?: number
          maturity_date?: string | null
          name: string
          target_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_amount?: number
          id?: string
          interest_rate?: number
          is_matured?: boolean
          lock_period_months?: number
          maturity_date?: string | null
          name?: string
          target_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          description: string | null
          id: string
          metadata: Json | null
          recipient_id: string | null
          reference: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          recipient_id?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          recipient_id?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          available_balance: number
          created_at: string
          currency: string
          id: string
          pending_balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          available_balance?: number
          created_at?: string
          currency?: string
          id?: string
          pending_balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          available_balance?: number
          created_at?: string
          currency?: string
          id?: string
          pending_balance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_account_number: { Args: never; Returns: string }
      generate_referral_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "super_admin"
      card_status: "pending" | "active" | "frozen" | "cancelled"
      kyc_status: "none" | "pending" | "verified" | "rejected"
      loan_status:
        | "pending"
        | "approved"
        | "rejected"
        | "active"
        | "paid"
        | "defaulted"
      notification_type:
        | "deposit"
        | "withdrawal"
        | "transfer"
        | "loan"
        | "card"
        | "kyc"
        | "security"
        | "system"
      transaction_status:
        | "pending"
        | "approved"
        | "rejected"
        | "completed"
        | "failed"
      transaction_type:
        | "deposit"
        | "withdrawal"
        | "transfer_in"
        | "transfer_out"
        | "loan_credit"
        | "loan_repayment"
        | "bill_payment"
        | "savings_lock"
        | "savings_unlock"
        | "interest"
        | "referral_bonus"
        | "card_payment"
        | "currency_conversion"
        | "admin_adjustment"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["admin", "user", "super_admin"],
      card_status: ["pending", "active", "frozen", "cancelled"],
      kyc_status: ["none", "pending", "verified", "rejected"],
      loan_status: [
        "pending",
        "approved",
        "rejected",
        "active",
        "paid",
        "defaulted",
      ],
      notification_type: [
        "deposit",
        "withdrawal",
        "transfer",
        "loan",
        "card",
        "kyc",
        "security",
        "system",
      ],
      transaction_status: [
        "pending",
        "approved",
        "rejected",
        "completed",
        "failed",
      ],
      transaction_type: [
        "deposit",
        "withdrawal",
        "transfer_in",
        "transfer_out",
        "loan_credit",
        "loan_repayment",
        "bill_payment",
        "savings_lock",
        "savings_unlock",
        "interest",
        "referral_bonus",
        "card_payment",
        "currency_conversion",
        "admin_adjustment",
      ],
    },
  },
} as const
