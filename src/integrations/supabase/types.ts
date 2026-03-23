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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      activity_events: {
        Row: {
          actor_role_id: string | null
          actor_type: Database["public"]["Enums"]["actor_type"]
          created_at: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          event_payload: Json | null
          event_type: string
          id: string
          project_id: string
        }
        Insert: {
          actor_role_id?: string | null
          actor_type?: Database["public"]["Enums"]["actor_type"]
          created_at?: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          event_payload?: Json | null
          event_type: string
          id?: string
          project_id: string
        }
        Update: {
          actor_role_id?: string | null
          actor_type?: Database["public"]["Enums"]["actor_type"]
          created_at?: string
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["entity_type"]
          event_payload?: Json | null
          event_type?: string
          id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_events_actor_role_id_fkey"
            columns: ["actor_role_id"]
            isOneToOne: false
            referencedRelation: "agent_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_roles: {
        Row: {
          allowed_actions: Json | null
          allowed_domains: Json | null
          code: string
          created_at: string
          description: string
          forbidden_actions: Json | null
          id: string
          model_preference: Json | null
          name: string
          performance_score: number
          prompt_template: string | null
          skill_profile: Json | null
          status: Database["public"]["Enums"]["agent_role_status"]
          success_rate: number
          total_runs: number
          updated_at: string
        }
        Insert: {
          allowed_actions?: Json | null
          allowed_domains?: Json | null
          code: string
          created_at?: string
          description: string
          forbidden_actions?: Json | null
          id?: string
          model_preference?: Json | null
          name: string
          performance_score?: number
          prompt_template?: string | null
          skill_profile?: Json | null
          status?: Database["public"]["Enums"]["agent_role_status"]
          success_rate?: number
          total_runs?: number
          updated_at?: string
        }
        Update: {
          allowed_actions?: Json | null
          allowed_domains?: Json | null
          code?: string
          created_at?: string
          description?: string
          forbidden_actions?: Json | null
          id?: string
          model_preference?: Json | null
          name?: string
          performance_score?: number
          prompt_template?: string | null
          skill_profile?: Json | null
          status?: Database["public"]["Enums"]["agent_role_status"]
          success_rate?: number
          total_runs?: number
          updated_at?: string
        }
        Relationships: []
      }
      agent_skills: {
        Row: {
          created_at: string
          description: string
          id: string
          name: string
          prompt_fragment: string
          role_id: string
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          name: string
          prompt_fragment?: string
          role_id: string
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          name?: string
          prompt_fragment?: string
          role_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "agent_skills_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "agent_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      approvals: {
        Row: {
          approval_type: Database["public"]["Enums"]["approval_type"]
          closed_at: string | null
          consequence_if_approved: string | null
          consequence_if_rejected: string | null
          created_at: string
          decided_at: string | null
          founder_decision_note: string | null
          id: string
          project_id: string
          recommendation: string | null
          requested_by_role_id: string | null
          state: Database["public"]["Enums"]["approval_state"]
          summary: string
          target_id: string
          target_type: Database["public"]["Enums"]["approval_target_type"]
          updated_at: string
          version: number
        }
        Insert: {
          approval_type: Database["public"]["Enums"]["approval_type"]
          closed_at?: string | null
          consequence_if_approved?: string | null
          consequence_if_rejected?: string | null
          created_at?: string
          decided_at?: string | null
          founder_decision_note?: string | null
          id?: string
          project_id: string
          recommendation?: string | null
          requested_by_role_id?: string | null
          state?: Database["public"]["Enums"]["approval_state"]
          summary: string
          target_id: string
          target_type: Database["public"]["Enums"]["approval_target_type"]
          updated_at?: string
          version?: number
        }
        Update: {
          approval_type?: Database["public"]["Enums"]["approval_type"]
          closed_at?: string | null
          consequence_if_approved?: string | null
          consequence_if_rejected?: string | null
          created_at?: string
          decided_at?: string | null
          founder_decision_note?: string | null
          id?: string
          project_id?: string
          recommendation?: string | null
          requested_by_role_id?: string | null
          state?: Database["public"]["Enums"]["approval_state"]
          summary?: string
          target_id?: string
          target_type?: Database["public"]["Enums"]["approval_target_type"]
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "approvals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approvals_requested_by_role_id_fkey"
            columns: ["requested_by_role_id"]
            isOneToOne: false
            referencedRelation: "agent_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      artifacts: {
        Row: {
          artifact_type: Database["public"]["Enums"]["artifact_type"]
          canonical_flag: boolean
          content_text: string | null
          created_at: string
          external_ref: string | null
          file_path: string | null
          id: string
          project_id: string
          run_id: string | null
          state: Database["public"]["Enums"]["artifact_state"]
          storage_kind: Database["public"]["Enums"]["storage_kind"]
          summary: string | null
          supersedes_artifact_id: string | null
          task_id: string | null
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          artifact_type: Database["public"]["Enums"]["artifact_type"]
          canonical_flag?: boolean
          content_text?: string | null
          created_at?: string
          external_ref?: string | null
          file_path?: string | null
          id?: string
          project_id: string
          run_id?: string | null
          state?: Database["public"]["Enums"]["artifact_state"]
          storage_kind?: Database["public"]["Enums"]["storage_kind"]
          summary?: string | null
          supersedes_artifact_id?: string | null
          task_id?: string | null
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          artifact_type?: Database["public"]["Enums"]["artifact_type"]
          canonical_flag?: boolean
          content_text?: string | null
          created_at?: string
          external_ref?: string | null
          file_path?: string | null
          id?: string
          project_id?: string
          run_id?: string | null
          state?: Database["public"]["Enums"]["artifact_state"]
          storage_kind?: Database["public"]["Enums"]["storage_kind"]
          summary?: string | null
          supersedes_artifact_id?: string | null
          task_id?: string | null
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "artifacts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artifacts_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artifacts_supersedes_artifact_id_fkey"
            columns: ["supersedes_artifact_id"]
            isOneToOne: false
            referencedRelation: "artifacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artifacts_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      autonomy_settings: {
        Row: {
          auto_execute_implementation: boolean
          auto_generate_tasks: boolean
          auto_retry_enabled: boolean
          created_at: string
          id: string
          max_parallel_runs: number
          project_id: string
          updated_at: string
        }
        Insert: {
          auto_execute_implementation?: boolean
          auto_generate_tasks?: boolean
          auto_retry_enabled?: boolean
          created_at?: string
          id?: string
          max_parallel_runs?: number
          project_id: string
          updated_at?: string
        }
        Update: {
          auto_execute_implementation?: boolean
          auto_generate_tasks?: boolean
          auto_retry_enabled?: boolean
          created_at?: string
          id?: string
          max_parallel_runs?: number
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "autonomy_settings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      context_packs: {
        Row: {
          assumptions: Json | null
          created_at: string
          id: string
          included_artifact_ids: Json | null
          included_document_ids: Json | null
          included_file_paths: Json | null
          missing_context_notes: string | null
          project_id: string
          summary: string | null
          task_id: string
          updated_at: string
        }
        Insert: {
          assumptions?: Json | null
          created_at?: string
          id?: string
          included_artifact_ids?: Json | null
          included_document_ids?: Json | null
          included_file_paths?: Json | null
          missing_context_notes?: string | null
          project_id: string
          summary?: string | null
          task_id: string
          updated_at?: string
        }
        Update: {
          assumptions?: Json | null
          created_at?: string
          id?: string
          included_artifact_ids?: Json | null
          included_document_ids?: Json | null
          included_file_paths?: Json | null
          missing_context_notes?: string | null
          project_id?: string
          summary?: string | null
          task_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "context_packs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "context_packs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      context_snapshots: {
        Row: {
          created_at: string
          id: string
          project_id: string
          summary: string
          task_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          summary?: string
          task_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          summary?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "context_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "context_snapshots_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          content_markdown: string
          created_at: string
          doc_type: Database["public"]["Enums"]["doc_type"]
          file_path: string
          id: string
          project_id: string
          source_artifact_id: string | null
          source_task_id: string | null
          status: Database["public"]["Enums"]["doc_status"]
          title: string
          updated_at: string
          version_label: string | null
        }
        Insert: {
          content_markdown?: string
          created_at?: string
          doc_type?: Database["public"]["Enums"]["doc_type"]
          file_path: string
          id?: string
          project_id: string
          source_artifact_id?: string | null
          source_task_id?: string | null
          status?: Database["public"]["Enums"]["doc_status"]
          title: string
          updated_at?: string
          version_label?: string | null
        }
        Update: {
          content_markdown?: string
          created_at?: string
          doc_type?: Database["public"]["Enums"]["doc_type"]
          file_path?: string
          id?: string
          project_id?: string
          source_artifact_id?: string | null
          source_task_id?: string | null
          status?: Database["public"]["Enums"]["doc_status"]
          title?: string
          updated_at?: string
          version_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_documents_source_artifact"
            columns: ["source_artifact_id"]
            isOneToOne: false
            referencedRelation: "artifacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_documents_source_task"
            columns: ["source_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      office_events: {
        Row: {
          actor_role_id: string | null
          entity_id: string
          entity_type: string
          event_type: string
          from_zone: string | null
          id: string
          project_id: string
          timestamp: string
          to_zone: string | null
        }
        Insert: {
          actor_role_id?: string | null
          entity_id: string
          entity_type: string
          event_type: string
          from_zone?: string | null
          id?: string
          project_id: string
          timestamp?: string
          to_zone?: string | null
        }
        Update: {
          actor_role_id?: string | null
          entity_id?: string
          entity_type?: string
          event_type?: string
          from_zone?: string | null
          id?: string
          project_id?: string
          timestamp?: string
          to_zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "office_events_actor_role_id_fkey"
            columns: ["actor_role_id"]
            isOneToOne: false
            referencedRelation: "agent_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "office_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          archived_at: string | null
          created_at: string
          current_phase: string | null
          founder_notes: string | null
          id: string
          name: string
          project_type: string | null
          purpose: string
          slug: string
          state: Database["public"]["Enums"]["project_state"]
          updated_at: string
          version: number
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          current_phase?: string | null
          founder_notes?: string | null
          id?: string
          name: string
          project_type?: string | null
          purpose: string
          slug: string
          state?: Database["public"]["Enums"]["project_state"]
          updated_at?: string
          version?: number
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          current_phase?: string | null
          founder_notes?: string | null
          id?: string
          name?: string
          project_type?: string | null
          purpose?: string
          slug?: string
          state?: Database["public"]["Enums"]["project_state"]
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      prompt_experiments: {
        Row: {
          base_version_id: string
          created_at: string
          end_date: string | null
          experimental_version_id: string
          id: string
          performance_delta: Json | null
          role_id: string
          start_date: string
          status: string
          traffic_percentage: number
          updated_at: string
        }
        Insert: {
          base_version_id: string
          created_at?: string
          end_date?: string | null
          experimental_version_id: string
          id?: string
          performance_delta?: Json | null
          role_id: string
          start_date?: string
          status?: string
          traffic_percentage?: number
          updated_at?: string
        }
        Update: {
          base_version_id?: string
          created_at?: string
          end_date?: string | null
          experimental_version_id?: string
          id?: string
          performance_delta?: Json | null
          role_id?: string
          start_date?: string
          status?: string
          traffic_percentage?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prompt_experiments_base_version_id_fkey"
            columns: ["base_version_id"]
            isOneToOne: false
            referencedRelation: "prompt_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompt_experiments_experimental_version_id_fkey"
            columns: ["experimental_version_id"]
            isOneToOne: false
            referencedRelation: "prompt_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompt_experiments_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "agent_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_improvement_suggestions: {
        Row: {
          approved: boolean
          approved_at: string | null
          created_at: string
          current_version_id: string | null
          id: string
          reason: string
          resulting_version_id: string | null
          role_id: string
          suggested_prompt: string
        }
        Insert: {
          approved?: boolean
          approved_at?: string | null
          created_at?: string
          current_version_id?: string | null
          id?: string
          reason?: string
          resulting_version_id?: string | null
          role_id: string
          suggested_prompt?: string
        }
        Update: {
          approved?: boolean
          approved_at?: string | null
          created_at?: string
          current_version_id?: string | null
          id?: string
          reason?: string
          resulting_version_id?: string | null
          role_id?: string
          suggested_prompt?: string
        }
        Relationships: [
          {
            foreignKeyName: "prompt_improvement_suggestions_current_version_id_fkey"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "prompt_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompt_improvement_suggestions_resulting_version_id_fkey"
            columns: ["resulting_version_id"]
            isOneToOne: false
            referencedRelation: "prompt_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompt_improvement_suggestions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "agent_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_versions: {
        Row: {
          created_at: string
          created_by: string
          full_prompt: string
          id: string
          is_active: boolean
          performance_snapshot: Json | null
          role_id: string
          version_number: number
        }
        Insert: {
          created_at?: string
          created_by?: string
          full_prompt?: string
          id?: string
          is_active?: boolean
          performance_snapshot?: Json | null
          role_id: string
          version_number?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          full_prompt?: string
          id?: string
          is_active?: boolean
          performance_snapshot?: Json | null
          role_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "prompt_versions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "agent_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_credentials: {
        Row: {
          created_at: string
          credential_label: string
          id: string
          last_error: string | null
          last_validated_at: string | null
          provider_id: string
          secret_ref: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          credential_label: string
          id?: string
          last_error?: string | null
          last_validated_at?: string | null
          provider_id: string
          secret_ref?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          credential_label?: string
          id?: string
          last_error?: string | null
          last_validated_at?: string | null
          provider_id?: string
          secret_ref?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_credentials_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_models: {
        Row: {
          cost_profile_hint: string | null
          created_at: string
          display_name: string
          id: string
          intended_use: string | null
          latency_profile_hint: string | null
          max_context: number | null
          model_code: string
          provider_id: string
          quality_profile_hint: string | null
          status: string
          supports_json: boolean | null
          supports_streaming: boolean | null
          supports_tool_use: boolean | null
          updated_at: string
        }
        Insert: {
          cost_profile_hint?: string | null
          created_at?: string
          display_name: string
          id?: string
          intended_use?: string | null
          latency_profile_hint?: string | null
          max_context?: number | null
          model_code: string
          provider_id: string
          quality_profile_hint?: string | null
          status?: string
          supports_json?: boolean | null
          supports_streaming?: boolean | null
          supports_tool_use?: boolean | null
          updated_at?: string
        }
        Update: {
          cost_profile_hint?: string | null
          created_at?: string
          display_name?: string
          id?: string
          intended_use?: string | null
          latency_profile_hint?: string | null
          max_context?: number | null
          model_code?: string
          provider_id?: string
          quality_profile_hint?: string | null
          status?: string
          supports_json?: boolean | null
          supports_streaming?: boolean | null
          supports_tool_use?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_models_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_usage_logs: {
        Row: {
          created_at: string
          error_message: string | null
          estimated_cost_usd: number | null
          id: string
          input_tokens: number | null
          latency_ms: number | null
          model_id: string | null
          output_tokens: number | null
          project_id: string | null
          provider_id: string | null
          run_id: string | null
          success: boolean | null
          total_tokens: number | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          estimated_cost_usd?: number | null
          id?: string
          input_tokens?: number | null
          latency_ms?: number | null
          model_id?: string | null
          output_tokens?: number | null
          project_id?: string | null
          provider_id?: string | null
          run_id?: string | null
          success?: boolean | null
          total_tokens?: number | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          estimated_cost_usd?: number | null
          id?: string
          input_tokens?: number | null
          latency_ms?: number | null
          model_id?: string | null
          output_tokens?: number | null
          project_id?: string | null
          provider_id?: string | null
          run_id?: string | null
          success?: boolean | null
          total_tokens?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_usage_logs_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "provider_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_usage_logs_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      providers: {
        Row: {
          base_url: string | null
          code: string
          created_at: string
          id: string
          name: string
          status: string
          supports_streaming: boolean
          supports_text: boolean
          supports_tools: boolean
          updated_at: string
        }
        Insert: {
          base_url?: string | null
          code: string
          created_at?: string
          id?: string
          name: string
          status?: string
          supports_streaming?: boolean
          supports_text?: boolean
          supports_tools?: boolean
          updated_at?: string
        }
        Update: {
          base_url?: string | null
          code?: string
          created_at?: string
          id?: string
          name?: string
          status?: string
          supports_streaming?: boolean
          supports_text?: boolean
          supports_tools?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          artifact_id: string
          blocking_issues: Json | null
          closed_at: string | null
          created_at: string
          id: string
          non_blocking_notes: Json | null
          project_id: string
          reason: string | null
          reviewer_role_id: string
          state: Database["public"]["Enums"]["review_state"]
          suggested_next_step: string | null
          task_id: string | null
          updated_at: string
          verdict: Database["public"]["Enums"]["review_verdict"] | null
          version: number
        }
        Insert: {
          artifact_id: string
          blocking_issues?: Json | null
          closed_at?: string | null
          created_at?: string
          id?: string
          non_blocking_notes?: Json | null
          project_id: string
          reason?: string | null
          reviewer_role_id: string
          state?: Database["public"]["Enums"]["review_state"]
          suggested_next_step?: string | null
          task_id?: string | null
          updated_at?: string
          verdict?: Database["public"]["Enums"]["review_verdict"] | null
          version?: number
        }
        Update: {
          artifact_id?: string
          blocking_issues?: Json | null
          closed_at?: string | null
          created_at?: string
          id?: string
          non_blocking_notes?: Json | null
          project_id?: string
          reason?: string | null
          reviewer_role_id?: string
          state?: Database["public"]["Enums"]["review_state"]
          suggested_next_step?: string | null
          task_id?: string | null
          updated_at?: string
          verdict?: Database["public"]["Enums"]["review_verdict"] | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "reviews_artifact_id_fkey"
            columns: ["artifact_id"]
            isOneToOne: false
            referencedRelation: "artifacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_role_id_fkey"
            columns: ["reviewer_role_id"]
            isOneToOne: false
            referencedRelation: "agent_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      routing_policies: {
        Row: {
          allow_cross_provider_retry: boolean
          allow_fallback: boolean
          created_at: string
          enable_dual_verification: boolean
          fallback_model_id: string | null
          fallback_provider_id: string | null
          id: string
          max_cost_threshold: number | null
          max_latency_threshold: number | null
          min_success_rate_threshold: number | null
          notes: string | null
          policy_name: string
          preferred_model_id: string
          preferred_provider_id: string
          requested_outcome: string | null
          role_code: string
          status: string
          task_domain: string
          updated_at: string
        }
        Insert: {
          allow_cross_provider_retry?: boolean
          allow_fallback?: boolean
          created_at?: string
          enable_dual_verification?: boolean
          fallback_model_id?: string | null
          fallback_provider_id?: string | null
          id?: string
          max_cost_threshold?: number | null
          max_latency_threshold?: number | null
          min_success_rate_threshold?: number | null
          notes?: string | null
          policy_name: string
          preferred_model_id: string
          preferred_provider_id: string
          requested_outcome?: string | null
          role_code: string
          status?: string
          task_domain: string
          updated_at?: string
        }
        Update: {
          allow_cross_provider_retry?: boolean
          allow_fallback?: boolean
          created_at?: string
          enable_dual_verification?: boolean
          fallback_model_id?: string | null
          fallback_provider_id?: string | null
          id?: string
          max_cost_threshold?: number | null
          max_latency_threshold?: number | null
          min_success_rate_threshold?: number | null
          notes?: string | null
          policy_name?: string
          preferred_model_id?: string
          preferred_provider_id?: string
          requested_outcome?: string | null
          role_code?: string
          status?: string
          task_domain?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "routing_policies_fallback_model_id_fkey"
            columns: ["fallback_model_id"]
            isOneToOne: false
            referencedRelation: "provider_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routing_policies_fallback_provider_id_fkey"
            columns: ["fallback_provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routing_policies_preferred_model_id_fkey"
            columns: ["preferred_model_id"]
            isOneToOne: false
            referencedRelation: "provider_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routing_policies_preferred_provider_id_fkey"
            columns: ["preferred_provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      run_evaluations: {
        Row: {
          cost_score: number
          created_at: string
          id: string
          latency_ms: number | null
          quality_score: number
          review_outcome: string | null
          role_id: string | null
          run_id: string
          validation_passed: boolean | null
          validation_risk_level: string | null
        }
        Insert: {
          cost_score?: number
          created_at?: string
          id?: string
          latency_ms?: number | null
          quality_score?: number
          review_outcome?: string | null
          role_id?: string | null
          run_id: string
          validation_passed?: boolean | null
          validation_risk_level?: string | null
        }
        Update: {
          cost_score?: number
          created_at?: string
          id?: string
          latency_ms?: number | null
          quality_score?: number
          review_outcome?: string | null
          role_id?: string | null
          run_id?: string
          validation_passed?: boolean | null
          validation_risk_level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "run_evaluations_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "agent_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "run_evaluations_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "runs"
            referencedColumns: ["id"]
          },
        ]
      }
      runs: {
        Row: {
          agent_role_id: string
          context_pack_id: string | null
          created_at: string
          duration_ms: number | null
          ended_at: string | null
          failure_reason: string | null
          id: string
          output_summary: string | null
          project_id: string
          retry_of_run_id: string | null
          run_number: number
          started_at: string | null
          state: Database["public"]["Enums"]["run_state"]
          status_summary: string | null
          superseded_by_run_id: string | null
          task_id: string
          updated_at: string
          version: number
        }
        Insert: {
          agent_role_id: string
          context_pack_id?: string | null
          created_at?: string
          duration_ms?: number | null
          ended_at?: string | null
          failure_reason?: string | null
          id?: string
          output_summary?: string | null
          project_id: string
          retry_of_run_id?: string | null
          run_number: number
          started_at?: string | null
          state?: Database["public"]["Enums"]["run_state"]
          status_summary?: string | null
          superseded_by_run_id?: string | null
          task_id: string
          updated_at?: string
          version?: number
        }
        Update: {
          agent_role_id?: string
          context_pack_id?: string | null
          created_at?: string
          duration_ms?: number | null
          ended_at?: string | null
          failure_reason?: string | null
          id?: string
          output_summary?: string | null
          project_id?: string
          retry_of_run_id?: string | null
          run_number?: number
          started_at?: string | null
          state?: Database["public"]["Enums"]["run_state"]
          status_summary?: string | null
          superseded_by_run_id?: string | null
          task_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "runs_agent_role_id_fkey"
            columns: ["agent_role_id"]
            isOneToOne: false
            referencedRelation: "agent_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "runs_context_pack_id_fkey"
            columns: ["context_pack_id"]
            isOneToOne: false
            referencedRelation: "context_packs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "runs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "runs_retry_of_run_id_fkey"
            columns: ["retry_of_run_id"]
            isOneToOne: false
            referencedRelation: "runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "runs_superseded_by_run_id_fkey"
            columns: ["superseded_by_run_id"]
            isOneToOne: false
            referencedRelation: "runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "runs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          acceptance_criteria: Json
          blocker_reason: string | null
          closed_at: string | null
          constraints: Json | null
          created_at: string
          domain: Database["public"]["Enums"]["task_domain"]
          escalation_reason: string | null
          expected_output_type: Database["public"]["Enums"]["task_output_type"]
          id: string
          owner_role_id: string | null
          parent_task_id: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          project_id: string
          purpose: string
          requested_outcome: string | null
          state: Database["public"]["Enums"]["task_state"]
          title: string
          updated_at: string
          urgency: Database["public"]["Enums"]["task_urgency"] | null
          version: number
        }
        Insert: {
          acceptance_criteria?: Json
          blocker_reason?: string | null
          closed_at?: string | null
          constraints?: Json | null
          created_at?: string
          domain: Database["public"]["Enums"]["task_domain"]
          escalation_reason?: string | null
          expected_output_type: Database["public"]["Enums"]["task_output_type"]
          id?: string
          owner_role_id?: string | null
          parent_task_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id: string
          purpose: string
          requested_outcome?: string | null
          state?: Database["public"]["Enums"]["task_state"]
          title: string
          updated_at?: string
          urgency?: Database["public"]["Enums"]["task_urgency"] | null
          version?: number
        }
        Update: {
          acceptance_criteria?: Json
          blocker_reason?: string | null
          closed_at?: string | null
          constraints?: Json | null
          created_at?: string
          domain?: Database["public"]["Enums"]["task_domain"]
          escalation_reason?: string | null
          expected_output_type?: Database["public"]["Enums"]["task_output_type"]
          id?: string
          owner_role_id?: string | null
          parent_task_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string
          purpose?: string
          requested_outcome?: string | null
          state?: Database["public"]["Enums"]["task_state"]
          title?: string
          updated_at?: string
          urgency?: Database["public"]["Enums"]["task_urgency"] | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "tasks_owner_role_id_fkey"
            columns: ["owner_role_id"]
            isOneToOne: false
            referencedRelation: "agent_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      actor_type: "founder" | "system" | "agent_role"
      agent_role_status: "active" | "inactive"
      approval_state:
        | "pending"
        | "approved"
        | "rejected"
        | "deferred"
        | "expired"
        | "closed"
      approval_target_type:
        | "project"
        | "task"
        | "artifact"
        | "review"
        | "document"
      approval_type:
        | "project_activation"
        | "architecture"
        | "schema"
        | "scope_change"
        | "release"
        | "cancellation"
      artifact_state:
        | "created"
        | "classified"
        | "submitted"
        | "under_review"
        | "accepted"
        | "rejected"
        | "superseded"
        | "frozen"
        | "archived"
      artifact_type:
        | "document"
        | "architecture"
        | "frontend"
        | "backend"
        | "schema"
        | "test"
        | "review"
        | "release"
      doc_status: "draft" | "active" | "canonical" | "superseded" | "archived"
      doc_type:
        | "brief"
        | "domain"
        | "lifecycle"
        | "collaboration"
        | "agent_instructions"
        | "ui_spec"
        | "data_model"
        | "other"
      entity_type:
        | "project"
        | "document"
        | "task"
        | "context_pack"
        | "run"
        | "artifact"
        | "review"
        | "approval"
      project_state:
        | "draft"
        | "scoped"
        | "active"
        | "blocked"
        | "in_review"
        | "paused"
        | "completed"
        | "archived"
      review_state:
        | "created"
        | "in_progress"
        | "needs_clarification"
        | "approved"
        | "approved_with_notes"
        | "rejected"
        | "escalated"
        | "closed"
      review_verdict:
        | "approved"
        | "approved_with_notes"
        | "rejected"
        | "escalated"
      run_state:
        | "created"
        | "preparing"
        | "running"
        | "produced_output"
        | "failed"
        | "timed_out"
        | "cancelled"
        | "superseded"
        | "finalized"
      storage_kind: "db_text" | "file_path" | "github_ref" | "external"
      task_domain:
        | "founder_control"
        | "docs"
        | "orchestration"
        | "frontend"
        | "backend"
        | "review"
        | "qa"
        | "release"
      task_output_type:
        | "document"
        | "frontend"
        | "backend"
        | "schema"
        | "review"
        | "approval_packet"
        | "test"
        | "release"
      task_priority: "low" | "medium" | "high" | "critical"
      task_state:
        | "draft"
        | "ready"
        | "assigned"
        | "in_progress"
        | "waiting_review"
        | "rework_required"
        | "blocked"
        | "escalated"
        | "approved"
        | "done"
        | "cancelled"
      task_urgency: "normal" | "high" | "blocker"
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
      actor_type: ["founder", "system", "agent_role"],
      agent_role_status: ["active", "inactive"],
      approval_state: [
        "pending",
        "approved",
        "rejected",
        "deferred",
        "expired",
        "closed",
      ],
      approval_target_type: [
        "project",
        "task",
        "artifact",
        "review",
        "document",
      ],
      approval_type: [
        "project_activation",
        "architecture",
        "schema",
        "scope_change",
        "release",
        "cancellation",
      ],
      artifact_state: [
        "created",
        "classified",
        "submitted",
        "under_review",
        "accepted",
        "rejected",
        "superseded",
        "frozen",
        "archived",
      ],
      artifact_type: [
        "document",
        "architecture",
        "frontend",
        "backend",
        "schema",
        "test",
        "review",
        "release",
      ],
      doc_status: ["draft", "active", "canonical", "superseded", "archived"],
      doc_type: [
        "brief",
        "domain",
        "lifecycle",
        "collaboration",
        "agent_instructions",
        "ui_spec",
        "data_model",
        "other",
      ],
      entity_type: [
        "project",
        "document",
        "task",
        "context_pack",
        "run",
        "artifact",
        "review",
        "approval",
      ],
      project_state: [
        "draft",
        "scoped",
        "active",
        "blocked",
        "in_review",
        "paused",
        "completed",
        "archived",
      ],
      review_state: [
        "created",
        "in_progress",
        "needs_clarification",
        "approved",
        "approved_with_notes",
        "rejected",
        "escalated",
        "closed",
      ],
      review_verdict: [
        "approved",
        "approved_with_notes",
        "rejected",
        "escalated",
      ],
      run_state: [
        "created",
        "preparing",
        "running",
        "produced_output",
        "failed",
        "timed_out",
        "cancelled",
        "superseded",
        "finalized",
      ],
      storage_kind: ["db_text", "file_path", "github_ref", "external"],
      task_domain: [
        "founder_control",
        "docs",
        "orchestration",
        "frontend",
        "backend",
        "review",
        "qa",
        "release",
      ],
      task_output_type: [
        "document",
        "frontend",
        "backend",
        "schema",
        "review",
        "approval_packet",
        "test",
        "release",
      ],
      task_priority: ["low", "medium", "high", "critical"],
      task_state: [
        "draft",
        "ready",
        "assigned",
        "in_progress",
        "waiting_review",
        "rework_required",
        "blocked",
        "escalated",
        "approved",
        "done",
        "cancelled",
      ],
      task_urgency: ["normal", "high", "blocker"],
    },
  },
} as const
