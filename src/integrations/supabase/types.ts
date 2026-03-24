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
          capacity_score: number
          code: string
          created_at: string
          description: string
          forbidden_actions: Json | null
          id: string
          max_parallel_tasks: number
          model_preference: Json | null
          name: string
          performance_score: number
          prompt_template: string | null
          skill_profile: Json | null
          status: Database["public"]["Enums"]["agent_role_status"]
          success_rate: number
          team_id: string | null
          total_runs: number
          updated_at: string
        }
        Insert: {
          allowed_actions?: Json | null
          allowed_domains?: Json | null
          capacity_score?: number
          code: string
          created_at?: string
          description: string
          forbidden_actions?: Json | null
          id?: string
          max_parallel_tasks?: number
          model_preference?: Json | null
          name: string
          performance_score?: number
          prompt_template?: string | null
          skill_profile?: Json | null
          status?: Database["public"]["Enums"]["agent_role_status"]
          success_rate?: number
          team_id?: string | null
          total_runs?: number
          updated_at?: string
        }
        Update: {
          allowed_actions?: Json | null
          allowed_domains?: Json | null
          capacity_score?: number
          code?: string
          created_at?: string
          description?: string
          forbidden_actions?: Json | null
          id?: string
          max_parallel_tasks?: number
          model_preference?: Json | null
          name?: string
          performance_score?: number
          prompt_template?: string | null
          skill_profile?: Json | null
          status?: Database["public"]["Enums"]["agent_role_status"]
          success_rate?: number
          team_id?: string | null
          total_runs?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_roles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
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
      ai_employees: {
        Row: {
          avg_cost: number
          avg_latency: number
          bug_rate: number
          created_at: string
          escalation_rate: number
          hired_at: string
          id: string
          last_evaluated_at: string | null
          model_name: string | null
          name: string
          prompt_version_id: string | null
          provider: string | null
          reputation_score: number
          role_code: string
          role_id: string | null
          status: string
          success_rate: number
          team_id: string | null
          updated_at: string
        }
        Insert: {
          avg_cost?: number
          avg_latency?: number
          bug_rate?: number
          created_at?: string
          escalation_rate?: number
          hired_at?: string
          id?: string
          last_evaluated_at?: string | null
          model_name?: string | null
          name: string
          prompt_version_id?: string | null
          provider?: string | null
          reputation_score?: number
          role_code: string
          role_id?: string | null
          status?: string
          success_rate?: number
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          avg_cost?: number
          avg_latency?: number
          bug_rate?: number
          created_at?: string
          escalation_rate?: number
          hired_at?: string
          id?: string
          last_evaluated_at?: string | null
          model_name?: string | null
          name?: string
          prompt_version_id?: string | null
          provider?: string | null
          reputation_score?: number
          role_code?: string
          role_id?: string | null
          status?: string
          success_rate?: number
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_employees_prompt_version_id_fkey"
            columns: ["prompt_version_id"]
            isOneToOne: false
            referencedRelation: "prompt_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_employees_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "agent_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_employees_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
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
          decision: Database["public"]["Enums"]["approval_decision"] | null
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
          decision?: Database["public"]["Enums"]["approval_decision"] | null
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
          decision?: Database["public"]["Enums"]["approval_decision"] | null
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
          autonomy_token_budget: number
          created_at: string
          id: string
          max_autonomy_depth: number
          max_parallel_runs: number
          project_id: string
          updated_at: string
        }
        Insert: {
          auto_execute_implementation?: boolean
          auto_generate_tasks?: boolean
          auto_retry_enabled?: boolean
          autonomy_token_budget?: number
          created_at?: string
          id?: string
          max_autonomy_depth?: number
          max_parallel_runs?: number
          project_id: string
          updated_at?: string
        }
        Update: {
          auto_execute_implementation?: boolean
          auto_generate_tasks?: boolean
          auto_retry_enabled?: boolean
          autonomy_token_budget?: number
          created_at?: string
          id?: string
          max_autonomy_depth?: number
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
      blog_posts: {
        Row: {
          approved_at: string | null
          content: string
          created_at: string
          event_reference_id: string | null
          event_type: string
          id: string
          platform: string
          status: string
          title: string
          tone: string
        }
        Insert: {
          approved_at?: string | null
          content?: string
          created_at?: string
          event_reference_id?: string | null
          event_type: string
          id?: string
          platform?: string
          status?: string
          title: string
          tone?: string
        }
        Update: {
          approved_at?: string | null
          content?: string
          created_at?: string
          event_reference_id?: string | null
          event_type?: string
          id?: string
          platform?: string
          status?: string
          title?: string
          tone?: string
        }
        Relationships: []
      }
      blueprint_contracts: {
        Row: {
          acceptance_criteria_json: Json
          approved_at: string | null
          approved_by_founder: boolean
          created_at: string
          critical_risks_json: Json
          effort_band: string
          id: string
          intake_request_id: string
          key_decisions_json: Json
          out_of_scope_json: Json
          scope_json: Json
        }
        Insert: {
          acceptance_criteria_json?: Json
          approved_at?: string | null
          approved_by_founder?: boolean
          created_at?: string
          critical_risks_json?: Json
          effort_band?: string
          id?: string
          intake_request_id: string
          key_decisions_json?: Json
          out_of_scope_json?: Json
          scope_json?: Json
        }
        Update: {
          acceptance_criteria_json?: Json
          approved_at?: string | null
          approved_by_founder?: boolean
          created_at?: string
          critical_risks_json?: Json
          effort_band?: string
          id?: string
          intake_request_id?: string
          key_decisions_json?: Json
          out_of_scope_json?: Json
          scope_json?: Json
        }
        Relationships: [
          {
            foreignKeyName: "blueprint_contracts_intake_request_id_fkey"
            columns: ["intake_request_id"]
            isOneToOne: false
            referencedRelation: "intake_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      bottleneck_predictions: {
        Row: {
          confidence_score: number
          created_at: string
          explanation: string | null
          id: string
          prediction_type: string
          resolved: boolean
          role_id: string | null
          task_id: string
        }
        Insert: {
          confidence_score?: number
          created_at?: string
          explanation?: string | null
          id?: string
          prediction_type: string
          resolved?: boolean
          role_id?: string | null
          task_id: string
        }
        Update: {
          confidence_score?: number
          created_at?: string
          explanation?: string | null
          id?: string
          prediction_type?: string
          resolved?: boolean
          role_id?: string | null
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bottleneck_predictions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "agent_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bottleneck_predictions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_proposals: {
        Row: {
          approved: boolean
          created_at: string
          employee_id: string
          executed: boolean
          id: string
          projected_cost: number
          projected_latency: number
          projected_success_rate: number
          reason: string
          suggested_model: string | null
          suggested_prompt_version_id: string | null
          suggested_provider: string | null
        }
        Insert: {
          approved?: boolean
          created_at?: string
          employee_id: string
          executed?: boolean
          id?: string
          projected_cost?: number
          projected_latency?: number
          projected_success_rate?: number
          reason: string
          suggested_model?: string | null
          suggested_prompt_version_id?: string | null
          suggested_provider?: string | null
        }
        Update: {
          approved?: boolean
          created_at?: string
          employee_id?: string
          executed?: boolean
          id?: string
          projected_cost?: number
          projected_latency?: number
          projected_success_rate?: number
          reason?: string
          suggested_model?: string | null
          suggested_prompt_version_id?: string | null
          suggested_provider?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_proposals_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "ai_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_proposals_suggested_prompt_version_id_fkey"
            columns: ["suggested_prompt_version_id"]
            isOneToOne: false
            referencedRelation: "prompt_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      check_suites: {
        Row: {
          external_run_ref: string | null
          finished_at: string | null
          id: string
          logs_ref: string | null
          project_id: string
          provider: Database["public"]["Enums"]["ci_provider"]
          pull_request_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["check_suite_status"]
          summary: string | null
          task_id: string
        }
        Insert: {
          external_run_ref?: string | null
          finished_at?: string | null
          id?: string
          logs_ref?: string | null
          project_id: string
          provider?: Database["public"]["Enums"]["ci_provider"]
          pull_request_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["check_suite_status"]
          summary?: string | null
          task_id: string
        }
        Update: {
          external_run_ref?: string | null
          finished_at?: string | null
          id?: string
          logs_ref?: string | null
          project_id?: string
          provider?: Database["public"]["Enums"]["ci_provider"]
          pull_request_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["check_suite_status"]
          summary?: string | null
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "check_suites_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_suites_pull_request_id_fkey"
            columns: ["pull_request_id"]
            isOneToOne: false
            referencedRelation: "pull_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_suites_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      client_project_access: {
        Row: {
          access_token_hash: string
          client_id: string
          created_at: string
          expires_at: string
          id: string
          project_id: string
        }
        Insert: {
          access_token_hash: string
          client_id: string
          created_at?: string
          expires_at: string
          id?: string
          project_id: string
        }
        Update: {
          access_token_hash?: string
          client_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_project_access_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_project_access_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          contact_email: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          contact_email: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          contact_email?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      company_mode_settings: {
        Row: {
          created_at: string
          cross_team_allowed: boolean
          enable_multi_team: boolean
          id: string
          max_parallel_projects: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          cross_team_allowed?: boolean
          enable_multi_team?: boolean
          id?: string
          max_parallel_projects?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          cross_team_allowed?: boolean
          enable_multi_team?: boolean
          id?: string
          max_parallel_projects?: number
          updated_at?: string
        }
        Relationships: []
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
      departments: {
        Row: {
          created_at: string
          description: string
          icon: string
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      deployments: {
        Row: {
          environment: Database["public"]["Enums"]["deploy_environment"]
          finished_at: string | null
          id: string
          logs_ref: string | null
          preview_url: string | null
          project_id: string
          rollback_of_deployment_id: string | null
          source_ref: string
          source_type: Database["public"]["Enums"]["deploy_source_type"]
          started_at: string | null
          status: Database["public"]["Enums"]["deploy_status"]
          version_label: string | null
        }
        Insert: {
          environment: Database["public"]["Enums"]["deploy_environment"]
          finished_at?: string | null
          id?: string
          logs_ref?: string | null
          preview_url?: string | null
          project_id: string
          rollback_of_deployment_id?: string | null
          source_ref: string
          source_type: Database["public"]["Enums"]["deploy_source_type"]
          started_at?: string | null
          status?: Database["public"]["Enums"]["deploy_status"]
          version_label?: string | null
        }
        Update: {
          environment?: Database["public"]["Enums"]["deploy_environment"]
          finished_at?: string | null
          id?: string
          logs_ref?: string | null
          preview_url?: string | null
          project_id?: string
          rollback_of_deployment_id?: string | null
          source_ref?: string
          source_type?: Database["public"]["Enums"]["deploy_source_type"]
          started_at?: string | null
          status?: Database["public"]["Enums"]["deploy_status"]
          version_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deployments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deployments_rollback_of_deployment_id_fkey"
            columns: ["rollback_of_deployment_id"]
            isOneToOne: false
            referencedRelation: "deployments"
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
      domain_bindings: {
        Row: {
          dns_status: string
          domain: string
          environment: Database["public"]["Enums"]["deploy_environment"]
          healthcheck_url: string | null
          id: string
          project_id: string
          status: Database["public"]["Enums"]["domain_binding_status"]
          target_type: Database["public"]["Enums"]["domain_target_type"]
          target_value: string
          tls_status: string
        }
        Insert: {
          dns_status?: string
          domain: string
          environment: Database["public"]["Enums"]["deploy_environment"]
          healthcheck_url?: string | null
          id?: string
          project_id: string
          status?: Database["public"]["Enums"]["domain_binding_status"]
          target_type?: Database["public"]["Enums"]["domain_target_type"]
          target_value: string
          tls_status?: string
        }
        Update: {
          dns_status?: string
          domain?: string
          environment?: Database["public"]["Enums"]["deploy_environment"]
          healthcheck_url?: string | null
          id?: string
          project_id?: string
          status?: Database["public"]["Enums"]["domain_binding_status"]
          target_type?: Database["public"]["Enums"]["domain_target_type"]
          target_value?: string
          tls_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "domain_bindings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      estimate_reports: {
        Row: {
          approved_at: string | null
          approved_by_founder: boolean
          avg_cost_estimate: number
          avg_token_estimate: number
          blueprint_contract_id: string
          created_at: string
          id: string
          min_cost_estimate: number
          min_token_estimate: number
          risk_notes_json: Json
          timeline_days_estimate: number
          worst_case_cost_estimate: number
          worst_case_token_estimate: number
        }
        Insert: {
          approved_at?: string | null
          approved_by_founder?: boolean
          avg_cost_estimate?: number
          avg_token_estimate?: number
          blueprint_contract_id: string
          created_at?: string
          id?: string
          min_cost_estimate?: number
          min_token_estimate?: number
          risk_notes_json?: Json
          timeline_days_estimate?: number
          worst_case_cost_estimate?: number
          worst_case_token_estimate?: number
        }
        Update: {
          approved_at?: string | null
          approved_by_founder?: boolean
          avg_cost_estimate?: number
          avg_token_estimate?: number
          blueprint_contract_id?: string
          created_at?: string
          id?: string
          min_cost_estimate?: number
          min_token_estimate?: number
          risk_notes_json?: Json
          timeline_days_estimate?: number
          worst_case_cost_estimate?: number
          worst_case_token_estimate?: number
        }
        Relationships: [
          {
            foreignKeyName: "estimate_reports_blueprint_contract_id_fkey"
            columns: ["blueprint_contract_id"]
            isOneToOne: false
            referencedRelation: "blueprint_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      handoffs: {
        Row: {
          acceptance_criteria_json: Json
          acknowledged_at: string | null
          closed_at: string | null
          constraints_json: Json | null
          context_pack_id: string | null
          created_at: string
          created_from_review_id: string | null
          id: string
          open_questions_json: Json | null
          project_id: string
          requested_outcome: Database["public"]["Enums"]["handoff_outcome"]
          source_artifact_ids_json: Json | null
          source_role_id: string
          status: Database["public"]["Enums"]["handoff_status"]
          target_role_id: string
          task_id: string
          urgency: Database["public"]["Enums"]["task_urgency"]
        }
        Insert: {
          acceptance_criteria_json?: Json
          acknowledged_at?: string | null
          closed_at?: string | null
          constraints_json?: Json | null
          context_pack_id?: string | null
          created_at?: string
          created_from_review_id?: string | null
          id?: string
          open_questions_json?: Json | null
          project_id: string
          requested_outcome: Database["public"]["Enums"]["handoff_outcome"]
          source_artifact_ids_json?: Json | null
          source_role_id: string
          status?: Database["public"]["Enums"]["handoff_status"]
          target_role_id: string
          task_id: string
          urgency?: Database["public"]["Enums"]["task_urgency"]
        }
        Update: {
          acceptance_criteria_json?: Json
          acknowledged_at?: string | null
          closed_at?: string | null
          constraints_json?: Json | null
          context_pack_id?: string | null
          created_at?: string
          created_from_review_id?: string | null
          id?: string
          open_questions_json?: Json | null
          project_id?: string
          requested_outcome?: Database["public"]["Enums"]["handoff_outcome"]
          source_artifact_ids_json?: Json | null
          source_role_id?: string
          status?: Database["public"]["Enums"]["handoff_status"]
          target_role_id?: string
          task_id?: string
          urgency?: Database["public"]["Enums"]["task_urgency"]
        }
        Relationships: [
          {
            foreignKeyName: "handoffs_context_pack_id_fkey"
            columns: ["context_pack_id"]
            isOneToOne: false
            referencedRelation: "context_packs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "handoffs_created_from_review_id_fkey"
            columns: ["created_from_review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "handoffs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "handoffs_source_role_id_fkey"
            columns: ["source_role_id"]
            isOneToOne: false
            referencedRelation: "agent_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "handoffs_target_role_id_fkey"
            columns: ["target_role_id"]
            isOneToOne: false
            referencedRelation: "agent_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "handoffs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_suggestions: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          reason: string
          resolved: boolean
          suggestion_type: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          reason: string
          resolved?: boolean
          suggestion_type: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          reason?: string
          resolved?: boolean
          suggestion_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_suggestions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "ai_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      intake_requests: {
        Row: {
          business_goal: string
          client_name: string
          constraints_json: Json
          created_at: string
          department_id: string | null
          id: string
          non_goals_json: Json
          risk_class: string
          status: string
          success_metrics_json: Json
          target_users_json: Json
        }
        Insert: {
          business_goal?: string
          client_name?: string
          constraints_json?: Json
          created_at?: string
          department_id?: string | null
          id?: string
          non_goals_json?: Json
          risk_class?: string
          status?: string
          success_metrics_json?: Json
          target_users_json?: Json
        }
        Update: {
          business_goal?: string
          client_name?: string
          constraints_json?: Json
          created_at?: string
          department_id?: string | null
          id?: string
          non_goals_json?: Json
          risk_class?: string
          status?: string
          success_metrics_json?: Json
          target_users_json?: Json
        }
        Relationships: [
          {
            foreignKeyName: "intake_requests_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      launch_decisions: {
        Row: {
          created_at: string
          decision: string
          estimate_report_id: string
          founder_note: string | null
          id: string
        }
        Insert: {
          created_at?: string
          decision?: string
          estimate_report_id: string
          founder_note?: string | null
          id?: string
        }
        Update: {
          created_at?: string
          decision?: string
          estimate_report_id?: string
          founder_note?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "launch_decisions_estimate_report_id_fkey"
            columns: ["estimate_report_id"]
            isOneToOne: false
            referencedRelation: "estimate_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      model_benchmarks: {
        Row: {
          avg_cost: number
          avg_latency: number
          avg_success_rate: number
          bug_rate: number
          created_at: string
          id: string
          model_market_id: string
          sample_size: number
          team_id: string | null
          updated_at: string
        }
        Insert: {
          avg_cost?: number
          avg_latency?: number
          avg_success_rate?: number
          bug_rate?: number
          created_at?: string
          id?: string
          model_market_id: string
          sample_size?: number
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          avg_cost?: number
          avg_latency?: number
          avg_success_rate?: number
          bug_rate?: number
          created_at?: string
          id?: string
          model_market_id?: string
          sample_size?: number
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "model_benchmarks_model_market_id_fkey"
            columns: ["model_market_id"]
            isOneToOne: false
            referencedRelation: "model_market"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_benchmarks_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      model_market: {
        Row: {
          avg_latency_score: number
          avg_quality_score: number
          created_at: string
          estimated_cost_per_1k_tokens: number
          id: string
          last_updated: string
          max_context: number
          model_name: string
          provider: string
          reliability_score: number
        }
        Insert: {
          avg_latency_score?: number
          avg_quality_score?: number
          created_at?: string
          estimated_cost_per_1k_tokens?: number
          id?: string
          last_updated?: string
          max_context?: number
          model_name: string
          provider: string
          reliability_score?: number
        }
        Update: {
          avg_latency_score?: number
          avg_quality_score?: number
          created_at?: string
          estimated_cost_per_1k_tokens?: number
          id?: string
          last_updated?: string
          max_context?: number
          model_name?: string
          provider?: string
          reliability_score?: number
        }
        Relationships: []
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
      outbox_events: {
        Row: {
          aggregate_id: string
          aggregate_type: string
          causation_id: string | null
          correlation_id: string | null
          created_at: string
          dispatched_at: string | null
          event_type: string
          id: string
          idempotency_key: string | null
          payload_json: Json
          retry_count: number
          status: string
        }
        Insert: {
          aggregate_id: string
          aggregate_type: string
          causation_id?: string | null
          correlation_id?: string | null
          created_at?: string
          dispatched_at?: string | null
          event_type: string
          id?: string
          idempotency_key?: string | null
          payload_json?: Json
          retry_count?: number
          status?: string
        }
        Update: {
          aggregate_id?: string
          aggregate_type?: string
          causation_id?: string | null
          correlation_id?: string | null
          created_at?: string
          dispatched_at?: string | null
          event_type?: string
          id?: string
          idempotency_key?: string | null
          payload_json?: Json
          retry_count?: number
          status?: string
        }
        Relationships: []
      }
      presale_sessions: {
        Row: {
          blueprint_id: string | null
          client_brief: string
          client_name: string
          converted_project_id: string | null
          created_at: string
          department_slug: string
          estimate_cost_max: number
          estimate_cost_min: number
          estimate_timeline_days: number
          estimate_tokens_avg: number
          estimate_tokens_max: number
          estimate_tokens_min: number
          id: string
          risk_level: string
          risk_notes: string
          spec_content: string
          status: string
          updated_at: string
        }
        Insert: {
          blueprint_id?: string | null
          client_brief?: string
          client_name?: string
          converted_project_id?: string | null
          created_at?: string
          department_slug: string
          estimate_cost_max?: number
          estimate_cost_min?: number
          estimate_timeline_days?: number
          estimate_tokens_avg?: number
          estimate_tokens_max?: number
          estimate_tokens_min?: number
          id?: string
          risk_level?: string
          risk_notes?: string
          spec_content?: string
          status?: string
          updated_at?: string
        }
        Update: {
          blueprint_id?: string | null
          client_brief?: string
          client_name?: string
          converted_project_id?: string | null
          created_at?: string
          department_slug?: string
          estimate_cost_max?: number
          estimate_cost_min?: number
          estimate_timeline_days?: number
          estimate_tokens_avg?: number
          estimate_tokens_max?: number
          estimate_tokens_min?: number
          id?: string
          risk_level?: string
          risk_notes?: string
          spec_content?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "presale_sessions_blueprint_id_fkey"
            columns: ["blueprint_id"]
            isOneToOne: false
            referencedRelation: "product_blueprints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presale_sessions_converted_project_id_fkey"
            columns: ["converted_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      product_blueprints: {
        Row: {
          created_at: string
          default_autonomy_level: string
          department_slug: string
          estimate_profile: Json
          id: string
          name: string
          required_roles: Json
          scope_template: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_autonomy_level?: string
          department_slug: string
          estimate_profile?: Json
          id?: string
          name: string
          required_roles?: Json
          scope_template?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_autonomy_level?: string
          department_slug?: string
          estimate_profile?: Json
          id?: string
          name?: string
          required_roles?: Json
          scope_template?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          archived_at: string | null
          blueprint_contract_id: string | null
          created_at: string
          current_phase: string | null
          estimate_report_id: string | null
          founder_notes: string | null
          id: string
          intake_request_id: string | null
          name: string
          project_type: string | null
          purpose: string
          slug: string
          state: Database["public"]["Enums"]["project_state"]
          team_id: string | null
          updated_at: string
          version: number
        }
        Insert: {
          archived_at?: string | null
          blueprint_contract_id?: string | null
          created_at?: string
          current_phase?: string | null
          estimate_report_id?: string | null
          founder_notes?: string | null
          id?: string
          intake_request_id?: string | null
          name: string
          project_type?: string | null
          purpose: string
          slug: string
          state?: Database["public"]["Enums"]["project_state"]
          team_id?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          archived_at?: string | null
          blueprint_contract_id?: string | null
          created_at?: string
          current_phase?: string | null
          estimate_report_id?: string | null
          founder_notes?: string | null
          id?: string
          intake_request_id?: string | null
          name?: string
          project_type?: string | null
          purpose?: string
          slug?: string
          state?: Database["public"]["Enums"]["project_state"]
          team_id?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "projects_blueprint_contract_id_fkey"
            columns: ["blueprint_contract_id"]
            isOneToOne: false
            referencedRelation: "blueprint_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_estimate_report_id_fkey"
            columns: ["estimate_report_id"]
            isOneToOne: false
            referencedRelation: "estimate_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_intake_request_id_fkey"
            columns: ["intake_request_id"]
            isOneToOne: false
            referencedRelation: "intake_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
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
      pull_requests: {
        Row: {
          closed_at: string | null
          id: string
          merged_at: string | null
          opened_at: string
          pr_number: number | null
          project_id: string
          repository_id: string
          run_id: string
          source_branch: string
          status: Database["public"]["Enums"]["pr_status"]
          target_branch: string
          task_id: string
          title: string
        }
        Insert: {
          closed_at?: string | null
          id?: string
          merged_at?: string | null
          opened_at?: string
          pr_number?: number | null
          project_id: string
          repository_id: string
          run_id: string
          source_branch: string
          status?: Database["public"]["Enums"]["pr_status"]
          target_branch: string
          task_id: string
          title: string
        }
        Update: {
          closed_at?: string | null
          id?: string
          merged_at?: string | null
          opened_at?: string
          pr_number?: number | null
          project_id?: string
          repository_id?: string
          run_id?: string
          source_branch?: string
          status?: Database["public"]["Enums"]["pr_status"]
          target_branch?: string
          task_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "pull_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pull_requests_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: false
            referencedRelation: "repositories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pull_requests_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pull_requests_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      repo_workspaces: {
        Row: {
          branch_name: string
          created_at: string
          head_sha: string | null
          id: string
          project_id: string
          released_at: string | null
          repository_id: string
          run_id: string
          sandbox_mode: Database["public"]["Enums"]["sandbox_mode"]
          status: Database["public"]["Enums"]["workspace_status"]
          task_id: string
          worktree_path: string | null
        }
        Insert: {
          branch_name: string
          created_at?: string
          head_sha?: string | null
          id?: string
          project_id: string
          released_at?: string | null
          repository_id: string
          run_id: string
          sandbox_mode?: Database["public"]["Enums"]["sandbox_mode"]
          status?: Database["public"]["Enums"]["workspace_status"]
          task_id: string
          worktree_path?: string | null
        }
        Update: {
          branch_name?: string
          created_at?: string
          head_sha?: string | null
          id?: string
          project_id?: string
          released_at?: string | null
          repository_id?: string
          run_id?: string
          sandbox_mode?: Database["public"]["Enums"]["sandbox_mode"]
          status?: Database["public"]["Enums"]["workspace_status"]
          task_id?: string
          worktree_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "repo_workspaces_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repo_workspaces_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: false
            referencedRelation: "repositories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repo_workspaces_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repo_workspaces_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      repositories: {
        Row: {
          created_at: string
          default_branch: string
          id: string
          project_id: string
          provider: Database["public"]["Enums"]["repo_provider"]
          repo_name: string
          repo_owner: string
          status: Database["public"]["Enums"]["repo_status"]
        }
        Insert: {
          created_at?: string
          default_branch?: string
          id?: string
          project_id: string
          provider?: Database["public"]["Enums"]["repo_provider"]
          repo_name: string
          repo_owner: string
          status?: Database["public"]["Enums"]["repo_status"]
        }
        Update: {
          created_at?: string
          default_branch?: string
          id?: string
          project_id?: string
          provider?: Database["public"]["Enums"]["repo_provider"]
          repo_name?: string
          repo_owner?: string
          status?: Database["public"]["Enums"]["repo_status"]
        }
        Relationships: [
          {
            foreignKeyName: "repositories_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
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
          branch_name: string | null
          causation_id: string | null
          commit_sha: string | null
          context_pack_id: string | null
          correlation_id: string | null
          created_at: string
          duration_ms: number | null
          ended_at: string | null
          error_class: string | null
          estimated_cost: number | null
          exit_code: number | null
          failure_reason: string | null
          heartbeat_at: string | null
          id: string
          idempotency_key: string | null
          input_tokens: number | null
          lease_acquired_at: string | null
          lease_expires_at: string | null
          lease_owner: string | null
          logs_ref: string | null
          output_summary: string | null
          output_tokens: number | null
          project_id: string
          prompt_version_ref: string | null
          provider_id: string | null
          provider_model_id: string | null
          retry_class: string | null
          retry_of_run_id: string | null
          run_number: number
          sandbox_policy_id: string | null
          skill_pack_version_ref: string | null
          started_at: string | null
          state: Database["public"]["Enums"]["run_state"]
          status_summary: string | null
          superseded_by_run_id: string | null
          task_id: string
          tool_policy_ref: string | null
          updated_at: string
          version: number
          workspace_id: string | null
        }
        Insert: {
          agent_role_id: string
          branch_name?: string | null
          causation_id?: string | null
          commit_sha?: string | null
          context_pack_id?: string | null
          correlation_id?: string | null
          created_at?: string
          duration_ms?: number | null
          ended_at?: string | null
          error_class?: string | null
          estimated_cost?: number | null
          exit_code?: number | null
          failure_reason?: string | null
          heartbeat_at?: string | null
          id?: string
          idempotency_key?: string | null
          input_tokens?: number | null
          lease_acquired_at?: string | null
          lease_expires_at?: string | null
          lease_owner?: string | null
          logs_ref?: string | null
          output_summary?: string | null
          output_tokens?: number | null
          project_id: string
          prompt_version_ref?: string | null
          provider_id?: string | null
          provider_model_id?: string | null
          retry_class?: string | null
          retry_of_run_id?: string | null
          run_number: number
          sandbox_policy_id?: string | null
          skill_pack_version_ref?: string | null
          started_at?: string | null
          state?: Database["public"]["Enums"]["run_state"]
          status_summary?: string | null
          superseded_by_run_id?: string | null
          task_id: string
          tool_policy_ref?: string | null
          updated_at?: string
          version?: number
          workspace_id?: string | null
        }
        Update: {
          agent_role_id?: string
          branch_name?: string | null
          causation_id?: string | null
          commit_sha?: string | null
          context_pack_id?: string | null
          correlation_id?: string | null
          created_at?: string
          duration_ms?: number | null
          ended_at?: string | null
          error_class?: string | null
          estimated_cost?: number | null
          exit_code?: number | null
          failure_reason?: string | null
          heartbeat_at?: string | null
          id?: string
          idempotency_key?: string | null
          input_tokens?: number | null
          lease_acquired_at?: string | null
          lease_expires_at?: string | null
          lease_owner?: string | null
          logs_ref?: string | null
          output_summary?: string | null
          output_tokens?: number | null
          project_id?: string
          prompt_version_ref?: string | null
          provider_id?: string | null
          provider_model_id?: string | null
          retry_class?: string | null
          retry_of_run_id?: string | null
          run_number?: number
          sandbox_policy_id?: string | null
          skill_pack_version_ref?: string | null
          started_at?: string | null
          state?: Database["public"]["Enums"]["run_state"]
          status_summary?: string | null
          superseded_by_run_id?: string | null
          task_id?: string
          tool_policy_ref?: string | null
          updated_at?: string
          version?: number
          workspace_id?: string | null
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
            foreignKeyName: "runs_prompt_version_ref_fkey"
            columns: ["prompt_version_ref"]
            isOneToOne: false
            referencedRelation: "prompt_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "runs_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "runs_provider_model_id_fkey"
            columns: ["provider_model_id"]
            isOneToOne: false
            referencedRelation: "provider_models"
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
            foreignKeyName: "runs_sandbox_policy_id_fkey"
            columns: ["sandbox_policy_id"]
            isOneToOne: false
            referencedRelation: "sandbox_policies"
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
          {
            foreignKeyName: "runs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "repo_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sandbox_policies: {
        Row: {
          allowed_network: boolean
          allowed_paths_json: Json
          allowed_ports_json: Json
          cpu_limit: number
          created_at: string
          id: string
          memory_limit_mb: number
          name: string
          read_only_root: boolean
          timeout_seconds: number
          updated_at: string
        }
        Insert: {
          allowed_network?: boolean
          allowed_paths_json?: Json
          allowed_ports_json?: Json
          cpu_limit?: number
          created_at?: string
          id?: string
          memory_limit_mb?: number
          name: string
          read_only_root?: boolean
          timeout_seconds?: number
          updated_at?: string
        }
        Update: {
          allowed_network?: boolean
          allowed_paths_json?: Json
          allowed_ports_json?: Json
          cpu_limit?: number
          created_at?: string
          id?: string
          memory_limit_mb?: number
          name?: string
          read_only_root?: boolean
          timeout_seconds?: number
          updated_at?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          experimental_features: Json
          id: string
          mode: string
          updated_at: string
        }
        Insert: {
          experimental_features?: Json
          id?: string
          mode?: string
          updated_at?: string
        }
        Update: {
          experimental_features?: Json
          id?: string
          mode?: string
          updated_at?: string
        }
        Relationships: []
      }
      system_suggestions: {
        Row: {
          created_at: string
          entity_id: string
          id: string
          message: string
          resolved: boolean
          severity: string
          type: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          id?: string
          message: string
          resolved?: boolean
          severity?: string
          type: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          id?: string
          message?: string
          resolved?: boolean
          severity?: string
          type?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          acceptance_criteria: Json
          blocker_reason: string | null
          closed_at: string | null
          constraints: Json | null
          created_at: string
          current_handoff_id: string | null
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
          current_handoff_id?: string | null
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
          current_handoff_id?: string | null
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
            foreignKeyName: "tasks_current_handoff_id_fkey"
            columns: ["current_handoff_id"]
            isOneToOne: false
            referencedRelation: "handoffs"
            referencedColumns: ["id"]
          },
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
      teams: {
        Row: {
          created_at: string
          focus_domain: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          focus_domain?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          focus_domain?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      worker_nodes: {
        Row: {
          active_runs_count: number
          cpu_usage_pct: number | null
          created_at: string
          disk_usage_pct: number | null
          docker_container_count: number | null
          hostname: string
          id: string
          last_heartbeat_at: string
          memory_usage_pct: number | null
          metadata_json: Json
          status: string
          updated_at: string
        }
        Insert: {
          active_runs_count?: number
          cpu_usage_pct?: number | null
          created_at?: string
          disk_usage_pct?: number | null
          docker_container_count?: number | null
          hostname: string
          id?: string
          last_heartbeat_at?: string
          memory_usage_pct?: number | null
          metadata_json?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          active_runs_count?: number
          cpu_usage_pct?: number | null
          created_at?: string
          disk_usage_pct?: number | null
          docker_container_count?: number | null
          hostname?: string
          id?: string
          last_heartbeat_at?: string
          memory_usage_pct?: number | null
          metadata_json?: Json
          status?: string
          updated_at?: string
        }
        Relationships: []
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
      approval_decision: "approved" | "rejected" | "deferred"
      approval_state:
        | "pending"
        | "approved"
        | "rejected"
        | "deferred"
        | "expired"
        | "closed"
        | "decided"
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
      check_suite_status: "queued" | "running" | "passed" | "failed"
      ci_provider: "github_actions" | "other"
      deploy_environment: "staging" | "production" | "preview"
      deploy_source_type: "branch" | "pr" | "tag"
      deploy_status: "pending" | "deploying" | "live" | "failed" | "rolled_back"
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
      domain_binding_status: "active" | "misconfigured" | "pending"
      domain_target_type: "ip" | "cname" | "platform"
      entity_type:
        | "project"
        | "document"
        | "task"
        | "context_pack"
        | "run"
        | "artifact"
        | "review"
        | "approval"
      handoff_outcome:
        | "implementation"
        | "review"
        | "clarification"
        | "approval_prep"
        | "qa"
        | "release"
      handoff_status: "created" | "acknowledged" | "completed" | "cancelled"
      pr_status: "opened" | "merged" | "closed"
      project_state:
        | "draft"
        | "scoped"
        | "active"
        | "blocked"
        | "in_review"
        | "paused"
        | "completed"
        | "archived"
      repo_provider: "github" | "gitea" | "gitlab" | "other"
      repo_status: "active" | "archived"
      review_state:
        | "created"
        | "in_progress"
        | "needs_clarification"
        | "approved"
        | "approved_with_notes"
        | "rejected"
        | "escalated"
        | "closed"
        | "resolved"
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
      sandbox_mode: "isolated" | "host"
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
        | "validated"
      task_urgency: "normal" | "high" | "blocker"
      workspace_status: "created" | "active" | "merged" | "discarded"
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
      approval_decision: ["approved", "rejected", "deferred"],
      approval_state: [
        "pending",
        "approved",
        "rejected",
        "deferred",
        "expired",
        "closed",
        "decided",
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
      check_suite_status: ["queued", "running", "passed", "failed"],
      ci_provider: ["github_actions", "other"],
      deploy_environment: ["staging", "production", "preview"],
      deploy_source_type: ["branch", "pr", "tag"],
      deploy_status: ["pending", "deploying", "live", "failed", "rolled_back"],
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
      domain_binding_status: ["active", "misconfigured", "pending"],
      domain_target_type: ["ip", "cname", "platform"],
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
      handoff_outcome: [
        "implementation",
        "review",
        "clarification",
        "approval_prep",
        "qa",
        "release",
      ],
      handoff_status: ["created", "acknowledged", "completed", "cancelled"],
      pr_status: ["opened", "merged", "closed"],
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
      repo_provider: ["github", "gitea", "gitlab", "other"],
      repo_status: ["active", "archived"],
      review_state: [
        "created",
        "in_progress",
        "needs_clarification",
        "approved",
        "approved_with_notes",
        "rejected",
        "escalated",
        "closed",
        "resolved",
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
      sandbox_mode: ["isolated", "host"],
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
        "validated",
      ],
      task_urgency: ["normal", "high", "blocker"],
      workspace_status: ["created", "active", "merged", "discarded"],
    },
  },
} as const
