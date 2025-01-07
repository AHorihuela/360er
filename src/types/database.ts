export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      ai_reports: {
        Row: {
          content: string | null
          created_at: string
          error: string | null
          feedback_request_id: string
          id: string
          is_final: boolean
          status: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          error?: string | null
          feedback_request_id: string
          id?: string
          is_final?: boolean
          status?: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          error?: string | null
          feedback_request_id?: string
          id?: string
          is_final?: boolean
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_reports_feedback_request_id_fkey"
            columns: ["feedback_request_id"]
            isOneToOne: false
            referencedRelation: "feedback_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_reports_feedback_request_id_fkey"
            columns: ["feedback_request_id"]
            isOneToOne: false
            referencedRelation: "review_cycles_with_feedback"
            referencedColumns: ["feedback_request_id"]
          },
          {
            foreignKeyName: "ai_reports_feedback_request_id_fkey"
            columns: ["feedback_request_id"]
            isOneToOne: false
            referencedRelation: "user_review_cycles"
            referencedColumns: ["feedback_request_id"]
          },
        ]
      }
      employees: {
        Row: {
          created_at: string | null
          id: string
          name: string
          role: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          role: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          role?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      feedback_analyses: {
        Row: {
          analysis: Json
          areas_for_improvement: string
          created_at: string
          id: string
          model_version: string
          prompt_version: string
          strengths: string
        }
        Insert: {
          analysis: Json
          areas_for_improvement: string
          created_at?: string
          id?: string
          model_version: string
          prompt_version: string
          strengths: string
        }
        Update: {
          analysis?: Json
          areas_for_improvement?: string
          created_at?: string
          id?: string
          model_version?: string
          prompt_version?: string
          strengths?: string
        }
        Relationships: []
      }
      feedback_analytics: {
        Row: {
          created_at: string | null
          feedback_hash: string
          feedback_request_id: string | null
          id: string
          insights: Json
          last_analyzed_at: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          feedback_hash: string
          feedback_request_id?: string | null
          id?: string
          insights: Json
          last_analyzed_at?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          feedback_hash?: string
          feedback_request_id?: string | null
          id?: string
          insights?: Json
          last_analyzed_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_analytics_feedback_request_id_fkey"
            columns: ["feedback_request_id"]
            isOneToOne: true
            referencedRelation: "feedback_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_analytics_feedback_request_id_fkey"
            columns: ["feedback_request_id"]
            isOneToOne: true
            referencedRelation: "review_cycles_with_feedback"
            referencedColumns: ["feedback_request_id"]
          },
          {
            foreignKeyName: "feedback_analytics_feedback_request_id_fkey"
            columns: ["feedback_request_id"]
            isOneToOne: true
            referencedRelation: "user_review_cycles"
            referencedColumns: ["feedback_request_id"]
          },
        ]
      }
      feedback_requests: {
        Row: {
          created_at: string | null
          employee_id: string | null
          id: string
          manually_completed: boolean | null
          review_cycle_id: string | null
          status: string
          target_responses: number | null
          unique_link: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          employee_id?: string | null
          id?: string
          manually_completed?: boolean | null
          review_cycle_id?: string | null
          status?: string
          target_responses?: number | null
          unique_link: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          employee_id?: string | null
          id?: string
          manually_completed?: boolean | null
          review_cycle_id?: string | null
          status?: string
          target_responses?: number | null
          unique_link?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_access_paths"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employees_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_cycles_id_fkey"
            columns: ["review_cycle_id"]
            isOneToOne: false
            referencedRelation: "review_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_cycles_id_fkey"
            columns: ["review_cycle_id"]
            isOneToOne: false
            referencedRelation: "review_cycles_feedback_summary"
            referencedColumns: ["review_cycle_id"]
          },
          {
            foreignKeyName: "review_cycles_id_fkey"
            columns: ["review_cycle_id"]
            isOneToOne: false
            referencedRelation: "review_cycles_with_feedback"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_cycles_id_fkey"
            columns: ["review_cycle_id"]
            isOneToOne: false
            referencedRelation: "user_review_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_responses: {
        Row: {
          areas_for_improvement: string
          created_at: string | null
          feedback_request_id: string
          id: string
          overall_rating: number | null
          previous_version_id: string | null
          relationship: string
          session_id: string | null
          status: string
          strengths: string
          submitted_at: string | null
        }
        Insert: {
          areas_for_improvement?: string
          created_at?: string | null
          feedback_request_id: string
          id?: string
          overall_rating?: number | null
          previous_version_id?: string | null
          relationship: string
          session_id?: string | null
          status: string
          strengths?: string
          submitted_at?: string | null
        }
        Update: {
          areas_for_improvement?: string
          created_at?: string | null
          feedback_request_id?: string
          id?: string
          overall_rating?: number | null
          previous_version_id?: string | null
          relationship?: string
          session_id?: string | null
          status?: string
          strengths?: string
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_responses_feedback_request_id_fkey"
            columns: ["feedback_request_id"]
            isOneToOne: false
            referencedRelation: "feedback_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_responses_feedback_request_id_fkey"
            columns: ["feedback_request_id"]
            isOneToOne: false
            referencedRelation: "review_cycles_with_feedback"
            referencedColumns: ["feedback_request_id"]
          },
          {
            foreignKeyName: "feedback_responses_feedback_request_id_fkey"
            columns: ["feedback_request_id"]
            isOneToOne: false
            referencedRelation: "user_review_cycles"
            referencedColumns: ["feedback_request_id"]
          },
          {
            foreignKeyName: "feedback_responses_previous_version_id_fkey"
            columns: ["previous_version_id"]
            isOneToOne: false
            referencedRelation: "feedback_responses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_responses_previous_version_id_fkey"
            columns: ["previous_version_id"]
            isOneToOne: false
            referencedRelation: "review_cycles_with_feedback"
            referencedColumns: ["response_id"]
          },
        ]
      }
      feedback_responses_backup: {
        Row: {
          areas_for_improvement: string
          created_at: string | null
          feedback_request_id: string
          id: string
          overall_rating: number | null
          relationship: string
          session_id: string | null
          status: string
          strengths: string
          submitted_at: string | null
        }
        Insert: {
          areas_for_improvement?: string
          created_at?: string | null
          feedback_request_id: string
          id?: string
          overall_rating?: number | null
          relationship: string
          session_id?: string | null
          status?: string
          strengths?: string
          submitted_at?: string | null
        }
        Update: {
          areas_for_improvement?: string
          created_at?: string | null
          feedback_request_id?: string
          id?: string
          overall_rating?: number | null
          relationship?: string
          session_id?: string | null
          status?: string
          strengths?: string
          submitted_at?: string | null
        }
        Relationships: []
      }
      page_views: {
        Row: {
          created_at: string | null
          feedback_request_id: string | null
          id: string
          page_url: string
          session_id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          feedback_request_id?: string | null
          id?: string
          page_url: string
          session_id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          feedback_request_id?: string | null
          id?: string
          page_url?: string
          session_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "page_views_feedback_request_id_fkey"
            columns: ["feedback_request_id"]
            isOneToOne: false
            referencedRelation: "feedback_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "page_views_feedback_request_id_fkey"
            columns: ["feedback_request_id"]
            isOneToOne: false
            referencedRelation: "review_cycles_with_feedback"
            referencedColumns: ["feedback_request_id"]
          },
          {
            foreignKeyName: "page_views_feedback_request_id_fkey"
            columns: ["feedback_request_id"]
            isOneToOne: false
            referencedRelation: "user_review_cycles"
            referencedColumns: ["feedback_request_id"]
          },
        ]
      }
      policy_backup_20240130: {
        Row: {
          cmd: string | null
          permissive: string | null
          policyname: unknown | null
          qual: string | null
          roles: unknown[] | null
          schemaname: unknown | null
          tablename: unknown | null
          with_check: string | null
        }
        Insert: {
          cmd?: string | null
          permissive?: string | null
          policyname?: unknown | null
          qual?: string | null
          roles?: unknown[] | null
          schemaname?: unknown | null
          tablename?: unknown | null
          with_check?: string | null
        }
        Update: {
          cmd?: string | null
          permissive?: string | null
          policyname?: unknown | null
          qual?: string | null
          roles?: unknown[] | null
          schemaname?: unknown | null
          tablename?: unknown | null
          with_check?: string | null
        }
        Relationships: []
      }
      policy_backup_20240130_circular: {
        Row: {
          cmd: string | null
          permissive: string | null
          policyname: unknown | null
          qual: string | null
          roles: unknown[] | null
          schemaname: unknown | null
          tablename: unknown | null
          with_check: string | null
        }
        Insert: {
          cmd?: string | null
          permissive?: string | null
          policyname?: unknown | null
          qual?: string | null
          roles?: unknown[] | null
          schemaname?: unknown | null
          tablename?: unknown | null
          with_check?: string | null
        }
        Update: {
          cmd?: string | null
          permissive?: string | null
          policyname?: unknown | null
          qual?: string | null
          roles?: unknown[] | null
          schemaname?: unknown | null
          tablename?: unknown | null
          with_check?: string | null
        }
        Relationships: []
      }
      policy_backup_20240130_employees: {
        Row: {
          cmd: string | null
          permissive: string | null
          policyname: unknown | null
          qual: string | null
          roles: unknown[] | null
          schemaname: unknown | null
          tablename: unknown | null
          with_check: string | null
        }
        Insert: {
          cmd?: string | null
          permissive?: string | null
          policyname?: unknown | null
          qual?: string | null
          roles?: unknown[] | null
          schemaname?: unknown | null
          tablename?: unknown | null
          with_check?: string | null
        }
        Update: {
          cmd?: string | null
          permissive?: string | null
          policyname?: unknown | null
          qual?: string | null
          roles?: unknown[] | null
          schemaname?: unknown | null
          tablename?: unknown | null
          with_check?: string | null
        }
        Relationships: []
      }
      policy_backup_20240130_employees_final: {
        Row: {
          cmd: string | null
          permissive: string | null
          policyname: unknown | null
          qual: string | null
          roles: unknown[] | null
          schemaname: unknown | null
          tablename: unknown | null
          with_check: string | null
        }
        Insert: {
          cmd?: string | null
          permissive?: string | null
          policyname?: unknown | null
          qual?: string | null
          roles?: unknown[] | null
          schemaname?: unknown | null
          tablename?: unknown | null
          with_check?: string | null
        }
        Update: {
          cmd?: string | null
          permissive?: string | null
          policyname?: unknown | null
          qual?: string | null
          roles?: unknown[] | null
          schemaname?: unknown | null
          tablename?: unknown | null
          with_check?: string | null
        }
        Relationships: []
      }
      policy_backup_20240130_feedback: {
        Row: {
          cmd: string | null
          permissive: string | null
          policyname: unknown | null
          qual: string | null
          roles: unknown[] | null
          schemaname: unknown | null
          tablename: unknown | null
          with_check: string | null
        }
        Insert: {
          cmd?: string | null
          permissive?: string | null
          policyname?: unknown | null
          qual?: string | null
          roles?: unknown[] | null
          schemaname?: unknown | null
          tablename?: unknown | null
          with_check?: string | null
        }
        Update: {
          cmd?: string | null
          permissive?: string | null
          policyname?: unknown | null
          qual?: string | null
          roles?: unknown[] | null
          schemaname?: unknown | null
          tablename?: unknown | null
          with_check?: string | null
        }
        Relationships: []
      }
      policy_backup_20240130_final: {
        Row: {
          cmd: string | null
          permissive: string | null
          policyname: unknown | null
          qual: string | null
          roles: unknown[] | null
          schemaname: unknown | null
          tablename: unknown | null
          with_check: string | null
        }
        Insert: {
          cmd?: string | null
          permissive?: string | null
          policyname?: unknown | null
          qual?: string | null
          roles?: unknown[] | null
          schemaname?: unknown | null
          tablename?: unknown | null
          with_check?: string | null
        }
        Update: {
          cmd?: string | null
          permissive?: string | null
          policyname?: unknown | null
          qual?: string | null
          roles?: unknown[] | null
          schemaname?: unknown | null
          tablename?: unknown | null
          with_check?: string | null
        }
        Relationships: []
      }
      policy_backup_20240130_full: {
        Row: {
          cmd: string | null
          permissive: string | null
          policyname: unknown | null
          qual: string | null
          roles: unknown[] | null
          schemaname: unknown | null
          tablename: unknown | null
          with_check: string | null
        }
        Insert: {
          cmd?: string | null
          permissive?: string | null
          policyname?: unknown | null
          qual?: string | null
          roles?: unknown[] | null
          schemaname?: unknown | null
          tablename?: unknown | null
          with_check?: string | null
        }
        Update: {
          cmd?: string | null
          permissive?: string | null
          policyname?: unknown | null
          qual?: string | null
          roles?: unknown[] | null
          schemaname?: unknown | null
          tablename?: unknown | null
          with_check?: string | null
        }
        Relationships: []
      }
      policy_backup_20240130_responses: {
        Row: {
          cmd: string | null
          permissive: string | null
          policyname: unknown | null
          qual: string | null
          roles: unknown[] | null
          schemaname: unknown | null
          tablename: unknown | null
          with_check: string | null
        }
        Insert: {
          cmd?: string | null
          permissive?: string | null
          policyname?: unknown | null
          qual?: string | null
          roles?: unknown[] | null
          schemaname?: unknown | null
          tablename?: unknown | null
          with_check?: string | null
        }
        Update: {
          cmd?: string | null
          permissive?: string | null
          policyname?: unknown | null
          qual?: string | null
          roles?: unknown[] | null
          schemaname?: unknown | null
          tablename?: unknown | null
          with_check?: string | null
        }
        Relationships: []
      }
      policy_backup_20240131: {
        Row: {
          cmd: string | null
          permissive: string | null
          policyname: unknown | null
          qual: string | null
          roles: unknown[] | null
          schemaname: unknown | null
          tablename: unknown | null
          with_check: string | null
        }
        Insert: {
          cmd?: string | null
          permissive?: string | null
          policyname?: unknown | null
          qual?: string | null
          roles?: unknown[] | null
          schemaname?: unknown | null
          tablename?: unknown | null
          with_check?: string | null
        }
        Update: {
          cmd?: string | null
          permissive?: string | null
          policyname?: unknown | null
          qual?: string | null
          roles?: unknown[] | null
          schemaname?: unknown | null
          tablename?: unknown | null
          with_check?: string | null
        }
        Relationships: []
      }
      policy_backup_20240131_all: {
        Row: {
          cmd: string | null
          permissive: string | null
          policyname: unknown | null
          qual: string | null
          roles: unknown[] | null
          schemaname: unknown | null
          tablename: unknown | null
          with_check: string | null
        }
        Insert: {
          cmd?: string | null
          permissive?: string | null
          policyname?: unknown | null
          qual?: string | null
          roles?: unknown[] | null
          schemaname?: unknown | null
          tablename?: unknown | null
          with_check?: string | null
        }
        Update: {
          cmd?: string | null
          permissive?: string | null
          policyname?: unknown | null
          qual?: string | null
          roles?: unknown[] | null
          schemaname?: unknown | null
          tablename?: unknown | null
          with_check?: string | null
        }
        Relationships: []
      }
      policy_backup_20240131_all_final: {
        Row: {
          cmd: string | null
          permissive: string | null
          policyname: unknown | null
          qual: string | null
          roles: unknown[] | null
          schemaname: unknown | null
          tablename: unknown | null
          with_check: string | null
        }
        Insert: {
          cmd?: string | null
          permissive?: string | null
          policyname?: unknown | null
          qual?: string | null
          roles?: unknown[] | null
          schemaname?: unknown | null
          tablename?: unknown | null
          with_check?: string | null
        }
        Update: {
          cmd?: string | null
          permissive?: string | null
          policyname?: unknown | null
          qual?: string | null
          roles?: unknown[] | null
          schemaname?: unknown | null
          tablename?: unknown | null
          with_check?: string | null
        }
        Relationships: []
      }
      policy_backup_20240131_employees: {
        Row: {
          cmd: string | null
          permissive: string | null
          policyname: unknown | null
          qual: string | null
          roles: unknown[] | null
          schemaname: unknown | null
          tablename: unknown | null
          with_check: string | null
        }
        Insert: {
          cmd?: string | null
          permissive?: string | null
          policyname?: unknown | null
          qual?: string | null
          roles?: unknown[] | null
          schemaname?: unknown | null
          tablename?: unknown | null
          with_check?: string | null
        }
        Update: {
          cmd?: string | null
          permissive?: string | null
          policyname?: unknown | null
          qual?: string | null
          roles?: unknown[] | null
          schemaname?: unknown | null
          tablename?: unknown | null
          with_check?: string | null
        }
        Relationships: []
      }
      policy_backup_20240131_employees_auth: {
        Row: {
          cmd: string | null
          permissive: string | null
          policyname: unknown | null
          qual: string | null
          roles: unknown[] | null
          schemaname: unknown | null
          tablename: unknown | null
          with_check: string | null
        }
        Insert: {
          cmd?: string | null
          permissive?: string | null
          policyname?: unknown | null
          qual?: string | null
          roles?: unknown[] | null
          schemaname?: unknown | null
          tablename?: unknown | null
          with_check?: string | null
        }
        Update: {
          cmd?: string | null
          permissive?: string | null
          policyname?: unknown | null
          qual?: string | null
          roles?: unknown[] | null
          schemaname?: unknown | null
          tablename?: unknown | null
          with_check?: string | null
        }
        Relationships: []
      }
      policy_backup_20240131_employees_auth2: {
        Row: {
          cmd: string | null
          permissive: string | null
          policyname: unknown | null
          qual: string | null
          roles: unknown[] | null
          schemaname: unknown | null
          tablename: unknown | null
          with_check: string | null
        }
        Insert: {
          cmd?: string | null
          permissive?: string | null
          policyname?: unknown | null
          qual?: string | null
          roles?: unknown[] | null
          schemaname?: unknown | null
          tablename?: unknown | null
          with_check?: string | null
        }
        Update: {
          cmd?: string | null
          permissive?: string | null
          policyname?: unknown | null
          qual?: string | null
          roles?: unknown[] | null
          schemaname?: unknown | null
          tablename?: unknown | null
          with_check?: string | null
        }
        Relationships: []
      }
      policy_backup_20240131_employees_final: {
        Row: {
          cmd: string | null
          permissive: string | null
          policyname: unknown | null
          qual: string | null
          roles: unknown[] | null
          schemaname: unknown | null
          tablename: unknown | null
          with_check: string | null
        }
        Insert: {
          cmd?: string | null
          permissive?: string | null
          policyname?: unknown | null
          qual?: string | null
          roles?: unknown[] | null
          schemaname?: unknown | null
          tablename?: unknown | null
          with_check?: string | null
        }
        Update: {
          cmd?: string | null
          permissive?: string | null
          policyname?: unknown | null
          qual?: string | null
          roles?: unknown[] | null
          schemaname?: unknown | null
          tablename?: unknown | null
          with_check?: string | null
        }
        Relationships: []
      }
      policy_backup_20240131_employees_final2: {
        Row: {
          cmd: string | null
          permissive: string | null
          policyname: unknown | null
          qual: string | null
          roles: unknown[] | null
          schemaname: unknown | null
          tablename: unknown | null
          with_check: string | null
        }
        Insert: {
          cmd?: string | null
          permissive?: string | null
          policyname?: unknown | null
          qual?: string | null
          roles?: unknown[] | null
          schemaname?: unknown | null
          tablename?: unknown | null
          with_check?: string | null
        }
        Update: {
          cmd?: string | null
          permissive?: string | null
          policyname?: unknown | null
          qual?: string | null
          roles?: unknown[] | null
          schemaname?: unknown | null
          tablename?: unknown | null
          with_check?: string | null
        }
        Relationships: []
      }
      policy_backup_20240131_employees_final3: {
        Row: {
          cmd: string | null
          permissive: string | null
          policyname: unknown | null
          qual: string | null
          roles: unknown[] | null
          schemaname: unknown | null
          tablename: unknown | null
          with_check: string | null
        }
        Insert: {
          cmd?: string | null
          permissive?: string | null
          policyname?: unknown | null
          qual?: string | null
          roles?: unknown[] | null
          schemaname?: unknown | null
          tablename?: unknown | null
          with_check?: string | null
        }
        Update: {
          cmd?: string | null
          permissive?: string | null
          policyname?: unknown | null
          qual?: string | null
          roles?: unknown[] | null
          schemaname?: unknown | null
          tablename?: unknown | null
          with_check?: string | null
        }
        Relationships: []
      }
      policy_backup_20240131_employees_final4: {
        Row: {
          cmd: string | null
          permissive: string | null
          policyname: unknown | null
          qual: string | null
          roles: unknown[] | null
          schemaname: unknown | null
          tablename: unknown | null
          with_check: string | null
        }
        Insert: {
          cmd?: string | null
          permissive?: string | null
          policyname?: unknown | null
          qual?: string | null
          roles?: unknown[] | null
          schemaname?: unknown | null
          tablename?: unknown | null
          with_check?: string | null
        }
        Update: {
          cmd?: string | null
          permissive?: string | null
          policyname?: unknown | null
          qual?: string | null
          roles?: unknown[] | null
          schemaname?: unknown | null
          tablename?: unknown | null
          with_check?: string | null
        }
        Relationships: []
      }
      policy_backup_20240131_feedback_auth: {
        Row: {
          cmd: string | null
          permissive: string | null
          policyname: unknown | null
          qual: string | null
          roles: unknown[] | null
          schemaname: unknown | null
          tablename: unknown | null
          with_check: string | null
        }
        Insert: {
          cmd?: string | null
          permissive?: string | null
          policyname?: unknown | null
          qual?: string | null
          roles?: unknown[] | null
          schemaname?: unknown | null
          tablename?: unknown | null
          with_check?: string | null
        }
        Update: {
          cmd?: string | null
          permissive?: string | null
          policyname?: unknown | null
          qual?: string | null
          roles?: unknown[] | null
          schemaname?: unknown | null
          tablename?: unknown | null
          with_check?: string | null
        }
        Relationships: []
      }
      policy_backup_20240131_feedback_final: {
        Row: {
          cmd: string | null
          permissive: string | null
          policyname: unknown | null
          qual: string | null
          roles: unknown[] | null
          schemaname: unknown | null
          tablename: unknown | null
          with_check: string | null
        }
        Insert: {
          cmd?: string | null
          permissive?: string | null
          policyname?: unknown | null
          qual?: string | null
          roles?: unknown[] | null
          schemaname?: unknown | null
          tablename?: unknown | null
          with_check?: string | null
        }
        Update: {
          cmd?: string | null
          permissive?: string | null
          policyname?: unknown | null
          qual?: string | null
          roles?: unknown[] | null
          schemaname?: unknown | null
          tablename?: unknown | null
          with_check?: string | null
        }
        Relationships: []
      }
      policy_backup_20240131_feedback_requests: {
        Row: {
          cmd: string | null
          permissive: string | null
          policyname: unknown | null
          qual: string | null
          roles: unknown[] | null
          schemaname: unknown | null
          tablename: unknown | null
          with_check: string | null
        }
        Insert: {
          cmd?: string | null
          permissive?: string | null
          policyname?: unknown | null
          qual?: string | null
          roles?: unknown[] | null
          schemaname?: unknown | null
          tablename?: unknown | null
          with_check?: string | null
        }
        Update: {
          cmd?: string | null
          permissive?: string | null
          policyname?: unknown | null
          qual?: string | null
          roles?: unknown[] | null
          schemaname?: unknown | null
          tablename?: unknown | null
          with_check?: string | null
        }
        Relationships: []
      }
      policy_backup_20240131_final: {
        Row: {
          cmd: string | null
          permissive: string | null
          policyname: unknown | null
          qual: string | null
          roles: unknown[] | null
          schemaname: unknown | null
          tablename: unknown | null
          with_check: string | null
        }
        Insert: {
          cmd?: string | null
          permissive?: string | null
          policyname?: unknown | null
          qual?: string | null
          roles?: unknown[] | null
          schemaname?: unknown | null
          tablename?: unknown | null
          with_check?: string | null
        }
        Update: {
          cmd?: string | null
          permissive?: string | null
          policyname?: unknown | null
          qual?: string | null
          roles?: unknown[] | null
          schemaname?: unknown | null
          tablename?: unknown | null
          with_check?: string | null
        }
        Relationships: []
      }
      policy_backup_20240131_final5: {
        Row: {
          cmd: string | null
          permissive: string | null
          policyname: unknown | null
          qual: string | null
          roles: unknown[] | null
          schemaname: unknown | null
          tablename: unknown | null
          with_check: string | null
        }
        Insert: {
          cmd?: string | null
          permissive?: string | null
          policyname?: unknown | null
          qual?: string | null
          roles?: unknown[] | null
          schemaname?: unknown | null
          tablename?: unknown | null
          with_check?: string | null
        }
        Update: {
          cmd?: string | null
          permissive?: string | null
          policyname?: unknown | null
          qual?: string | null
          roles?: unknown[] | null
          schemaname?: unknown | null
          tablename?: unknown | null
          with_check?: string | null
        }
        Relationships: []
      }
      policy_backup_20240131_final6: {
        Row: {
          cmd: string | null
          permissive: string | null
          policyname: unknown | null
          qual: string | null
          roles: unknown[] | null
          schemaname: unknown | null
          tablename: unknown | null
          with_check: string | null
        }
        Insert: {
          cmd?: string | null
          permissive?: string | null
          policyname?: unknown | null
          qual?: string | null
          roles?: unknown[] | null
          schemaname?: unknown | null
          tablename?: unknown | null
          with_check?: string | null
        }
        Update: {
          cmd?: string | null
          permissive?: string | null
          policyname?: unknown | null
          qual?: string | null
          roles?: unknown[] | null
          schemaname?: unknown | null
          tablename?: unknown | null
          with_check?: string | null
        }
        Relationships: []
      }
      policy_backup_20240131_review_cycles: {
        Row: {
          cmd: string | null
          permissive: string | null
          policyname: unknown | null
          qual: string | null
          roles: unknown[] | null
          schemaname: unknown | null
          tablename: unknown | null
          with_check: string | null
        }
        Insert: {
          cmd?: string | null
          permissive?: string | null
          policyname?: unknown | null
          qual?: string | null
          roles?: unknown[] | null
          schemaname?: unknown | null
          tablename?: unknown | null
          with_check?: string | null
        }
        Update: {
          cmd?: string | null
          permissive?: string | null
          policyname?: unknown | null
          qual?: string | null
          roles?: unknown[] | null
          schemaname?: unknown | null
          tablename?: unknown | null
          with_check?: string | null
        }
        Relationships: []
      }
      policy_backup_20240131_review_cycles_anon: {
        Row: {
          cmd: string | null
          permissive: string | null
          policyname: unknown | null
          qual: string | null
          roles: unknown[] | null
          schemaname: unknown | null
          tablename: unknown | null
          with_check: string | null
        }
        Insert: {
          cmd?: string | null
          permissive?: string | null
          policyname?: unknown | null
          qual?: string | null
          roles?: unknown[] | null
          schemaname?: unknown | null
          tablename?: unknown | null
          with_check?: string | null
        }
        Update: {
          cmd?: string | null
          permissive?: string | null
          policyname?: unknown | null
          qual?: string | null
          roles?: unknown[] | null
          schemaname?: unknown | null
          tablename?: unknown | null
          with_check?: string | null
        }
        Relationships: []
      }
      policy_backup_20240131_review_cycles_final: {
        Row: {
          cmd: string | null
          permissive: string | null
          policyname: unknown | null
          qual: string | null
          roles: unknown[] | null
          schemaname: unknown | null
          tablename: unknown | null
          with_check: string | null
        }
        Insert: {
          cmd?: string | null
          permissive?: string | null
          policyname?: unknown | null
          qual?: string | null
          roles?: unknown[] | null
          schemaname?: unknown | null
          tablename?: unknown | null
          with_check?: string | null
        }
        Update: {
          cmd?: string | null
          permissive?: string | null
          policyname?: unknown | null
          qual?: string | null
          roles?: unknown[] | null
          schemaname?: unknown | null
          tablename?: unknown | null
          with_check?: string | null
        }
        Relationships: []
      }
      policy_backup_20240131_review_cycles_final2: {
        Row: {
          cmd: string | null
          permissive: string | null
          policyname: unknown | null
          qual: string | null
          roles: unknown[] | null
          schemaname: unknown | null
          tablename: unknown | null
          with_check: string | null
        }
        Insert: {
          cmd?: string | null
          permissive?: string | null
          policyname?: unknown | null
          qual?: string | null
          roles?: unknown[] | null
          schemaname?: unknown | null
          tablename?: unknown | null
          with_check?: string | null
        }
        Update: {
          cmd?: string | null
          permissive?: string | null
          policyname?: unknown | null
          qual?: string | null
          roles?: unknown[] | null
          schemaname?: unknown | null
          tablename?: unknown | null
          with_check?: string | null
        }
        Relationships: []
      }
      review_cycles: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          review_by_date: string
          status: string
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          review_by_date: string
          status?: string
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          review_by_date?: string
          status?: string
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      schema_migrations: {
        Row: {
          executed_at: string | null
          version: string
        }
        Insert: {
          executed_at?: string | null
          version: string
        }
        Update: {
          executed_at?: string | null
          version?: string
        }
        Relationships: []
      }
    }
    Views: {
      employee_access_paths: {
        Row: {
          employee_id: string | null
          has_public_access: boolean | null
          manager_id: string | null
        }
        Relationships: []
      }
      review_cycles_feedback_summary: {
        Row: {
          completed_requests: number | null
          review_cycle_id: string | null
          total_requests: number | null
          user_id: string | null
        }
        Relationships: []
      }
      review_cycles_with_feedback: {
        Row: {
          ai_report_content: string | null
          ai_report_created_at: string | null
          ai_report_error: string | null
          ai_report_id: string | null
          ai_report_status: string | null
          ai_report_updated_at: string | null
          areas_for_improvement: string | null
          created_at: string | null
          employee_id: string | null
          feedback_request_id: string | null
          id: string | null
          is_final: boolean | null
          manually_completed: boolean | null
          overall_rating: number | null
          relationship: string | null
          request_created_at: string | null
          request_status: string | null
          request_updated_at: string | null
          response_created_at: string | null
          response_id: string | null
          response_status: string | null
          response_submitted_at: string | null
          review_by_date: string | null
          review_cycle_id: string | null
          status: string | null
          strengths: string | null
          target_responses: number | null
          title: string | null
          unique_link: string | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_access_paths"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employees_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_cycles_id_fkey"
            columns: ["review_cycle_id"]
            isOneToOne: false
            referencedRelation: "review_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_cycles_id_fkey"
            columns: ["review_cycle_id"]
            isOneToOne: false
            referencedRelation: "review_cycles_feedback_summary"
            referencedColumns: ["review_cycle_id"]
          },
          {
            foreignKeyName: "review_cycles_id_fkey"
            columns: ["review_cycle_id"]
            isOneToOne: false
            referencedRelation: "review_cycles_with_feedback"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_cycles_id_fkey"
            columns: ["review_cycle_id"]
            isOneToOne: false
            referencedRelation: "user_review_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_review_cycles: {
        Row: {
          completed_feedback_count: number | null
          created_at: string | null
          created_by: string | null
          employee_name: string | null
          employee_role: string | null
          feedback_request_count: number | null
          feedback_request_id: string | null
          feedback_request_status: string | null
          id: string | null
          review_by_date: string | null
          status: string | null
          target_responses: number | null
          title: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      create_feedback_response: {
        Args: {
          p_feedback_request_id: string
          p_session_id: string
          p_relationship: string
          p_strengths: string
          p_areas_for_improvement: string
          p_status: string
          p_submitted_at: string
        }
        Returns: string
      }
      delete_feedback_with_references: {
        Args: {
          feedback_id: string
        }
        Returns: undefined
      }
      delete_user_account: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      random_feedback_text: {
        Args: {
          category: string
        }
        Returns: string
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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
