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
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          thread_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          thread_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_threads: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
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
          phone_verified: boolean | null
          profile_version: number
          sharing_allowlist: Json
          stripe_customer_id: string | null
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
          phone_verified?: boolean | null
          profile_version?: number
          sharing_allowlist?: Json
          stripe_customer_id?: string | null
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
          phone_verified?: boolean | null
          profile_version?: number
          sharing_allowlist?: Json
          stripe_customer_id?: string | null
          subscription_tier?: string
          trial_started_at?: string | null
          updated_at?: string
          updated_by?: string
          user_id?: string
        }
        Relationships: []
      }
      support_engineering_tasks: {
        Row: {
          branch_name: string | null
          created_at: string
          id: string
          linked_issue_identifier: string | null
          merged_at: string | null
          operator_notes: string | null
          pull_request_number: number | null
          pull_request_url: string | null
          released_at: string | null
          repo_name: string | null
          repo_owner: string | null
          support_ticket_id: string
          updated_at: string
          workflow_status: string
        }
        Insert: {
          branch_name?: string | null
          created_at?: string
          id?: string
          linked_issue_identifier?: string | null
          merged_at?: string | null
          operator_notes?: string | null
          pull_request_number?: number | null
          pull_request_url?: string | null
          released_at?: string | null
          repo_name?: string | null
          repo_owner?: string | null
          support_ticket_id: string
          updated_at?: string
          workflow_status?: string
        }
        Update: {
          branch_name?: string | null
          created_at?: string
          id?: string
          linked_issue_identifier?: string | null
          merged_at?: string | null
          operator_notes?: string | null
          pull_request_number?: number | null
          pull_request_url?: string | null
          released_at?: string | null
          repo_name?: string | null
          repo_owner?: string | null
          support_ticket_id?: string
          updated_at?: string
          workflow_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_engineering_tasks_support_ticket_id_fkey"
            columns: ["support_ticket_id"]
            isOneToOne: true
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_notifications: {
        Row: {
          channel: string
          created_at: string
          delivered_at: string | null
          delivery_status: string
          id: string
          message: string
          support_ticket_id: string
          user_id: string
        }
        Insert: {
          channel: string
          created_at?: string
          delivered_at?: string | null
          delivery_status?: string
          id?: string
          message: string
          support_ticket_id: string
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          delivered_at?: string | null
          delivery_status?: string
          id?: string
          message?: string
          support_ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_notifications_support_ticket_id_fkey"
            columns: ["support_ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_ticket_events: {
        Row: {
          actor_id: string | null
          actor_type: string
          created_at: string
          event_payload: Json
          event_type: string
          id: string
          support_ticket_id: string
        }
        Insert: {
          actor_id?: string | null
          actor_type: string
          created_at?: string
          event_payload?: Json
          event_type: string
          id?: string
          support_ticket_id: string
        }
        Update: {
          actor_id?: string | null
          actor_type?: string
          created_at?: string
          event_payload?: Json
          event_type?: string
          id?: string
          support_ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_events_support_ticket_id_fkey"
            columns: ["support_ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          category: string
          created_at: string
          description: string
          id: string
          last_user_notified_at: string | null
          latest_customer_status: string | null
          reporter_contact: Json
          reporter_timezone: string | null
          resolution_summary: string | null
          resolved_at: string | null
          severity: string
          source: string
          source_message_id: string | null
          source_thread_id: string | null
          ticket_number: number
          ticket_status: string
          title: string
          triage_notes: string | null
          triage_status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          id?: string
          last_user_notified_at?: string | null
          latest_customer_status?: string | null
          reporter_contact?: Json
          reporter_timezone?: string | null
          resolution_summary?: string | null
          resolved_at?: string | null
          severity: string
          source: string
          source_message_id?: string | null
          source_thread_id?: string | null
          ticket_number?: number
          ticket_status?: string
          title: string
          triage_notes?: string | null
          triage_status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          last_user_notified_at?: string | null
          latest_customer_status?: string | null
          reporter_contact?: Json
          reporter_timezone?: string | null
          resolution_summary?: string | null
          resolved_at?: string | null
          severity?: string
          source?: string
          source_message_id?: string | null
          source_thread_id?: string | null
          ticket_number?: number
          ticket_status?: string
          title?: string
          triage_notes?: string | null
          triage_status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_source_message_id_fkey"
            columns: ["source_message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_source_thread_id_fkey"
            columns: ["source_thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
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
      check_trial_expiry: {
        Args: { p_user_id: string }
        Returns: {
          is_expired: boolean
          tier: string
          trial_ends_at: string
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
