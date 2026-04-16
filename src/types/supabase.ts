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
      pending_updates: {
        Row: {
          context_path: string
          id: string
          operation: string
          profile_id: string
          proposed_at: string
          proposed_by: string
          proposed_value: Json | null
          review_note: string | null
          reviewed_at: string | null
          status: string
        }
        Insert: {
          context_path: string
          id?: string
          operation: string
          profile_id: string
          proposed_at?: string
          proposed_by: string
          proposed_value?: Json | null
          review_note?: string | null
          reviewed_at?: string | null
          status?: string
        }
        Update: {
          context_path?: string
          id?: string
          operation?: string
          profile_id?: string
          proposed_at?: string
          proposed_by?: string
          proposed_value?: Json | null
          review_note?: string | null
          reviewed_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_updates_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active_context: Json
          advanced_config: boolean
          created_at: string
          deep_context: Json
          id: string
          identity: Json
          phone: string | null
          profile_version: number
          sharing_allowlist: Json
          subscription_tier: string
          trial_started_at: string | null
          updated_at: string
          updated_by: string
          user_id: string
        }
        Insert: {
          active_context?: Json
          advanced_config?: boolean
          created_at?: string
          deep_context?: Json
          id?: string
          identity?: Json
          phone?: string | null
          profile_version?: number
          sharing_allowlist?: Json
          subscription_tier?: string
          trial_started_at?: string | null
          updated_at?: string
          updated_by?: string
          user_id: string
        }
        Update: {
          active_context?: Json
          advanced_config?: boolean
          created_at?: string
          deep_context?: Json
          id?: string
          identity?: Json
          phone?: string | null
          profile_version?: number
          sharing_allowlist?: Json
          subscription_tier?: string
          trial_started_at?: string | null
          updated_at?: string
          updated_by?: string
          user_id?: string
        }
        Relationships: []
      }
      token_usage: {
        Row: {
          created_at: string
          id: string
          input_tokens: number
          output_tokens: number
          request_count: number
          total_tokens: number
          updated_at: string
          user_id: string
          week_start: string
          weekly_budget: number
        }
        Insert: {
          created_at?: string
          id?: string
          input_tokens?: number
          output_tokens?: number
          request_count?: number
          total_tokens?: number
          updated_at?: string
          user_id: string
          week_start: string
          weekly_budget?: number
        }
        Update: {
          created_at?: string
          id?: string
          input_tokens?: number
          output_tokens?: number
          request_count?: number
          total_tokens?: number
          updated_at?: string
          user_id?: string
          week_start?: string
          weekly_budget?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_approved_update: { Args: { p_update_id: string }; Returns: boolean }
      check_token_budget: {
        Args: { p_user_id: string }
        Returns: {
          remaining_tokens: number
          tier: string
          used_tokens: number
          week_start_date: string
          weekly_budget: number
        }[]
      }
      get_weekly_budget: { Args: { tier: string }; Returns: number }
      query_profile_context: {
        Args: { p_path: string; p_requester?: string; p_user_id: string }
        Returns: Json
      }
      record_token_usage: {
        Args: { p_input: number; p_output: number; p_user_id: string }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
