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
      contract_appendices: {
        Row: {
          amount: number | null
          body: string
          client_signature: string | null
          client_signed_at: string | null
          contract_id: string
          created_at: string
          id: string
          status: Database["public"]["Enums"]["contract_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number | null
          body?: string
          client_signature?: string | null
          client_signed_at?: string | null
          contract_id: string
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["contract_status"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number | null
          body?: string
          client_signature?: string | null
          client_signed_at?: string | null
          contract_id?: string
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["contract_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_appendices_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          body: string
          client_email: string | null
          client_name: string | null
          client_signature: string | null
          client_signed_at: string | null
          created_at: string
          currency: string
          freelancer_signature: string | null
          freelancer_signed_at: string | null
          id: string
          project_id: string
          sent_at: string | null
          status: Database["public"]["Enums"]["contract_status"]
          title: string
          total_amount: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string
          client_email?: string | null
          client_name?: string | null
          client_signature?: string | null
          client_signed_at?: string | null
          created_at?: string
          currency?: string
          freelancer_signature?: string | null
          freelancer_signed_at?: string | null
          id?: string
          project_id: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["contract_status"]
          title: string
          total_amount?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          client_email?: string | null
          client_name?: string | null
          client_signature?: string | null
          client_signed_at?: string | null
          created_at?: string
          currency?: string
          freelancer_signature?: string | null
          freelancer_signed_at?: string | null
          id?: string
          project_id?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["contract_status"]
          title?: string
          total_amount?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          created_at: string
          id: string
          mime_type: string | null
          name: string
          payment_required: boolean
          preview_only: boolean
          project_id: string
          size_bytes: number
          storage_path: string
          user_id: string
          watermark_enabled: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          mime_type?: string | null
          name: string
          payment_required?: boolean
          preview_only?: boolean
          project_id: string
          size_bytes?: number
          storage_path: string
          user_id: string
          watermark_enabled?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          mime_type?: string | null
          name?: string
          payment_required?: boolean
          preview_only?: boolean
          project_id?: string
          size_bytes?: number
          storage_path?: string
          user_id?: string
          watermark_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          category: string | null
          country: string | null
          created_at: string
          display_name: string | null
          id: string
          onboarded: boolean
          timezone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          category?: string | null
          country?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          onboarded?: boolean
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          category?: string | null
          country?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          onboarded?: boolean
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          client_email: string | null
          client_name: string | null
          color: string
          created_at: string
          currency: string
          deadline: string | null
          description: string | null
          id: string
          position: number
          rate_amount: number | null
          rate_type: Database["public"]["Enums"]["rate_type"]
          share_token: string | null
          status: Database["public"]["Enums"]["project_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_email?: string | null
          client_name?: string | null
          color?: string
          created_at?: string
          currency?: string
          deadline?: string | null
          description?: string | null
          id?: string
          position?: number
          rate_amount?: number | null
          rate_type?: Database["public"]["Enums"]["rate_type"]
          share_token?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_email?: string | null
          client_name?: string | null
          color?: string
          created_at?: string
          currency?: string
          deadline?: string | null
          description?: string | null
          id?: string
          position?: number
          rate_amount?: number | null
          rate_type?: Database["public"]["Enums"]["rate_type"]
          share_token?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scope_items: {
        Row: {
          created_at: string
          description: string | null
          estimated_hours: number | null
          id: string
          position: number
          project_id: string
          status: Database["public"]["Enums"]["scope_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          estimated_hours?: number | null
          id?: string
          position?: number
          project_id: string
          status?: Database["public"]["Enums"]["scope_status"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          estimated_hours?: number | null
          id?: string
          position?: number
          project_id?: string
          status?: Database["public"]["Enums"]["scope_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scope_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          category: string | null
          content: Json
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          content?: Json
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          content?: Json
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      time_entries: {
        Row: {
          created_at: string
          description: string | null
          duration_minutes: number
          entry_date: string
          id: string
          project_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_minutes: number
          entry_date?: string
          id?: string
          project_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_minutes?: number
          entry_date?: string
          id?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
          role?: Database["public"]["Enums"]["app_role"]
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      contract_status: "draft" | "sent" | "signed" | "declined" | "void"
      project_status:
        | "draft"
        | "active"
        | "in_review"
        | "completed"
        | "archived"
      rate_type: "hourly" | "fixed"
      scope_status: "pending" | "in_progress" | "done"
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
      app_role: ["admin", "moderator", "user"],
      contract_status: ["draft", "sent", "signed", "declined", "void"],
      project_status: ["draft", "active", "in_review", "completed", "archived"],
      rate_type: ["hourly", "fixed"],
      scope_status: ["pending", "in_progress", "done"],
    },
  },
} as const
