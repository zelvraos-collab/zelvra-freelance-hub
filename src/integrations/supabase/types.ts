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
      activity_samples: {
        Row: {
          activity_pct: number
          created_at: string
          id: string
          keys_count: number
          mouse_clicks: number
          mouse_moves: number
          sampled_at: string
          scrolls: number
          session_id: string
          tab_focused: boolean
          user_id: string
        }
        Insert: {
          activity_pct?: number
          created_at?: string
          id?: string
          keys_count?: number
          mouse_clicks?: number
          mouse_moves?: number
          sampled_at?: string
          scrolls?: number
          session_id: string
          tab_focused?: boolean
          user_id: string
        }
        Update: {
          activity_pct?: number
          created_at?: string
          id?: string
          keys_count?: number
          mouse_clicks?: number
          mouse_moves?: number
          sampled_at?: string
          scrolls?: number
          session_id?: string
          tab_focused?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_samples_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "tracked_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_conversations: {
        Row: {
          created_at: string
          id: string
          project_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_conversations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_history: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["ai_chat_role"]
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["ai_chat_role"]
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["ai_chat_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_history_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      change_orders: {
        Row: {
          created_at: string
          currency: string
          id: string
          invoice_id: string | null
          items: Json
          project_id: string
          rationale: string | null
          source_message_id: string | null
          status: Database["public"]["Enums"]["change_order_status"]
          suggested_price: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          invoice_id?: string | null
          items?: Json
          project_id: string
          rationale?: string | null
          source_message_id?: string | null
          status?: Database["public"]["Enums"]["change_order_status"]
          suggested_price?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          invoice_id?: string | null
          items?: Json
          project_id?: string
          rationale?: string | null
          source_message_id?: string | null
          status?: Database["public"]["Enums"]["change_order_status"]
          suggested_price?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "change_orders_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_source_message_id_fkey"
            columns: ["source_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
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
      invoice_reminders: {
        Row: {
          channel: string
          created_at: string
          id: string
          invoice_id: string
          message: string | null
          scheduled_for: string
          sent_at: string | null
          user_id: string
        }
        Insert: {
          channel?: string
          created_at?: string
          id?: string
          invoice_id: string
          message?: string | null
          scheduled_for: string
          sent_at?: string | null
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          invoice_id?: string
          message?: string | null
          scheduled_for?: string
          sent_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount_paid: number
          client_address: string | null
          client_email: string | null
          client_name: string | null
          contract_id: string | null
          created_at: string
          currency: string
          discount: number
          due_date: string | null
          freelancer_address: string | null
          freelancer_email: string | null
          freelancer_name: string | null
          id: string
          is_escrow: boolean
          issue_date: string
          line_items: Json
          notes: string | null
          number: string
          paid_at: string | null
          project_id: string | null
          sent_at: string | null
          share_token: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal: number
          tax_amount: number
          tax_rate: number
          terms: string | null
          total: number
          updated_at: string
          user_id: string
          viewed_at: string | null
        }
        Insert: {
          amount_paid?: number
          client_address?: string | null
          client_email?: string | null
          client_name?: string | null
          contract_id?: string | null
          created_at?: string
          currency?: string
          discount?: number
          due_date?: string | null
          freelancer_address?: string | null
          freelancer_email?: string | null
          freelancer_name?: string | null
          id?: string
          is_escrow?: boolean
          issue_date?: string
          line_items?: Json
          notes?: string | null
          number: string
          paid_at?: string | null
          project_id?: string | null
          sent_at?: string | null
          share_token?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          terms?: string | null
          total?: number
          updated_at?: string
          user_id: string
          viewed_at?: string | null
        }
        Update: {
          amount_paid?: number
          client_address?: string | null
          client_email?: string | null
          client_name?: string | null
          contract_id?: string | null
          created_at?: string
          currency?: string
          discount?: number
          due_date?: string | null
          freelancer_address?: string | null
          freelancer_email?: string | null
          freelancer_name?: string | null
          id?: string
          is_escrow?: boolean
          issue_date?: string
          line_items?: Json
          notes?: string | null
          number?: string
          paid_at?: string | null
          project_id?: string | null
          sent_at?: string | null
          share_token?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          terms?: string | null
          total?: number
          updated_at?: string
          user_id?: string
          viewed_at?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          attachment_url: string | null
          body: string
          created_at: string
          id: string
          project_id: string
          read_at: string | null
          sender_id: string | null
          sender_name: string
          sender_role: string
          user_id: string
        }
        Insert: {
          attachment_url?: string | null
          body?: string
          created_at?: string
          id?: string
          project_id: string
          read_at?: string | null
          sender_id?: string | null
          sender_name?: string
          sender_role?: string
          user_id: string
        }
        Update: {
          attachment_url?: string | null
          body?: string
          created_at?: string
          id?: string
          project_id?: string
          read_at?: string | null
          sender_id?: string | null
          sender_name?: string
          sender_role?: string
          user_id?: string
        }
        Relationships: []
      }
      monitoring_consent: {
        Row: {
          accepted_at: string
          created_at: string
          id: string
          ip: unknown
          user_agent: string | null
          user_id: string
          version: string
        }
        Insert: {
          accepted_at?: string
          created_at?: string
          id?: string
          ip?: unknown
          user_agent?: string | null
          user_id: string
          version?: string
        }
        Update: {
          accepted_at?: string
          created_at?: string
          id?: string
          ip?: unknown
          user_agent?: string | null
          user_id?: string
          version?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          link: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          invoice_id: string | null
          kind: Database["public"]["Enums"]["payment_kind"]
          notes: string | null
          paid_at: string | null
          payer_email: string | null
          payer_name: string | null
          project_id: string | null
          provider: string | null
          provider_ref: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          invoice_id?: string | null
          kind?: Database["public"]["Enums"]["payment_kind"]
          notes?: string | null
          paid_at?: string | null
          payer_email?: string | null
          payer_name?: string | null
          project_id?: string | null
          provider?: string | null
          provider_ref?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          invoice_id?: string | null
          kind?: Database["public"]["Enums"]["payment_kind"]
          notes?: string | null
          paid_at?: string | null
          payer_email?: string | null
          payer_name?: string | null
          project_id?: string | null
          provider?: string | null
          provider_ref?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      session_audit: {
        Row: {
          action: string
          actor_id: string
          after: Json | null
          before: Json | null
          created_at: string
          id: string
          reason: string | null
          session_id: string
        }
        Insert: {
          action: string
          actor_id: string
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: string
          reason?: string | null
          session_id: string
        }
        Update: {
          action?: string
          actor_id?: string
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: string
          reason?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_audit_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "tracked_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_disputes: {
        Row: {
          created_at: string
          freelancer_response: string | null
          id: string
          raised_by: string
          reason: string
          resolved_at: string | null
          session_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          freelancer_response?: string | null
          id?: string
          raised_by: string
          reason: string
          resolved_at?: string | null
          session_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          freelancer_response?: string | null
          id?: string
          raised_by?: string
          reason?: string
          resolved_at?: string | null
          session_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_disputes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "tracked_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_screenshots: {
        Row: {
          activity_pct: number
          blurred: boolean
          created_at: string
          expires_at: string
          hash: string | null
          id: string
          session_id: string
          storage_path: string
          suspicious: boolean
          taken_at: string
          user_id: string
        }
        Insert: {
          activity_pct?: number
          blurred?: boolean
          created_at?: string
          expires_at?: string
          hash?: string | null
          id?: string
          session_id: string
          storage_path: string
          suspicious?: boolean
          taken_at?: string
          user_id: string
        }
        Update: {
          activity_pct?: number
          blurred?: boolean
          created_at?: string
          expires_at?: string
          hash?: string | null
          id?: string
          session_id?: string
          storage_path?: string
          suspicious?: boolean
          taken_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_screenshots_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "tracked_sessions"
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
      tracked_sessions: {
        Row: {
          activity_score: number
          client_viewed_at: string | null
          created_at: string
          device_fingerprint: string | null
          duration_seconds: number
          end_ip: unknown
          ended_at: string | null
          entry_hash: string | null
          flags: Json
          id: string
          locked: boolean
          notes: string | null
          productivity_score: number
          project_id: string
          screenshot_count: number
          start_ip: unknown
          start_timezone: string | null
          start_user_agent: string | null
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_score?: number
          client_viewed_at?: string | null
          created_at?: string
          device_fingerprint?: string | null
          duration_seconds?: number
          end_ip?: unknown
          ended_at?: string | null
          entry_hash?: string | null
          flags?: Json
          id?: string
          locked?: boolean
          notes?: string | null
          productivity_score?: number
          project_id: string
          screenshot_count?: number
          start_ip?: unknown
          start_timezone?: string | null
          start_user_agent?: string | null
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_score?: number
          client_viewed_at?: string | null
          created_at?: string
          device_fingerprint?: string | null
          duration_seconds?: number
          end_ip?: unknown
          ended_at?: string | null
          entry_hash?: string | null
          flags?: Json
          id?: string
          locked?: boolean
          notes?: string | null
          productivity_score?: number
          project_id?: string
          screenshot_count?: number
          start_ip?: unknown
          start_timezone?: string | null
          start_user_agent?: string | null
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracked_sessions_project_id_fkey"
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
      next_invoice_number: { Args: { _user_id: string }; Returns: string }
    }
    Enums: {
      ai_chat_role: "user" | "assistant" | "system"
      app_role: "admin" | "moderator" | "user"
      change_order_status: "proposed" | "accepted" | "rejected" | "converted"
      contract_status: "draft" | "sent" | "signed" | "declined" | "void"
      invoice_status:
        | "draft"
        | "sent"
        | "viewed"
        | "partially_paid"
        | "paid"
        | "overdue"
        | "void"
      payment_kind:
        | "invoice"
        | "escrow_deposit"
        | "escrow_release"
        | "milestone"
      payment_status:
        | "pending"
        | "processing"
        | "succeeded"
        | "failed"
        | "refunded"
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
      ai_chat_role: ["user", "assistant", "system"],
      app_role: ["admin", "moderator", "user"],
      change_order_status: ["proposed", "accepted", "rejected", "converted"],
      contract_status: ["draft", "sent", "signed", "declined", "void"],
      invoice_status: [
        "draft",
        "sent",
        "viewed",
        "partially_paid",
        "paid",
        "overdue",
        "void",
      ],
      payment_kind: [
        "invoice",
        "escrow_deposit",
        "escrow_release",
        "milestone",
      ],
      payment_status: [
        "pending",
        "processing",
        "succeeded",
        "failed",
        "refunded",
      ],
      project_status: ["draft", "active", "in_review", "completed", "archived"],
      rate_type: ["hourly", "fixed"],
      scope_status: ["pending", "in_progress", "done"],
    },
  },
} as const
