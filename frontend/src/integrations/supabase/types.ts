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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_generation_log: {
        Row: {
          created_at: string
          engagement_id: string | null
          error_message: string | null
          function_name: string
          id: string
          input_tokens: number | null
          latency_ms: number | null
          model: string
          output_tokens: number | null
          prompt_context: Json | null
          status: string
          subject_id: string | null
          subject_type: string | null
          total_tokens: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          engagement_id?: string | null
          error_message?: string | null
          function_name: string
          id?: string
          input_tokens?: number | null
          latency_ms?: number | null
          model: string
          output_tokens?: number | null
          prompt_context?: Json | null
          status?: string
          subject_id?: string | null
          subject_type?: string | null
          total_tokens?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          engagement_id?: string | null
          error_message?: string | null
          function_name?: string
          id?: string
          input_tokens?: number | null
          latency_ms?: number | null
          model?: string
          output_tokens?: number | null
          prompt_context?: Json | null
          status?: string
          subject_id?: string | null
          subject_type?: string | null
          total_tokens?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_generation_log_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts_samples: {
        Row: {
          alert_date: string | null
          alert_id: string | null
          alert_type: string | null
          case_notes: string | null
          created_at: string
          disposition: string | null
          engagement_id: string
          escalation_decision: string | null
          evidence_ids: string[] | null
          id: string
          test_result: string | null
          updated_at: string
        }
        Insert: {
          alert_date?: string | null
          alert_id?: string | null
          alert_type?: string | null
          case_notes?: string | null
          created_at?: string
          disposition?: string | null
          engagement_id: string
          escalation_decision?: string | null
          evidence_ids?: string[] | null
          id?: string
          test_result?: string | null
          updated_at?: string
        }
        Update: {
          alert_date?: string | null
          alert_id?: string | null
          alert_type?: string | null
          case_notes?: string | null
          created_at?: string
          disposition?: string | null
          engagement_id?: string
          escalation_decision?: string | null
          evidence_ids?: string[] | null
          id?: string
          test_result?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_samples_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      aml_pp_control_results: {
        Row: {
          auto_flag_reason: string | null
          control_area: string
          control_category: string
          created_at: string
          deficiency_explanation: string | null
          deficiency_flag: boolean | null
          doc_reference: string | null
          evidence_file_ids: string[] | null
          evidence_reviewed: string | null
          finding_type: string | null
          id: string
          notes: string | null
          observation_best_practice: string | null
          points_achieved: number | null
          pp_review_id: string
          question_number: number
          question_text: string
          remediation_notes: string | null
          response: string | null
          reviewer_recommendation: string | null
          risk_rating: string | null
          severity_suggested: string | null
          updated_at: string
        }
        Insert: {
          auto_flag_reason?: string | null
          control_area: string
          control_category: string
          created_at?: string
          deficiency_explanation?: string | null
          deficiency_flag?: boolean | null
          doc_reference?: string | null
          evidence_file_ids?: string[] | null
          evidence_reviewed?: string | null
          finding_type?: string | null
          id?: string
          notes?: string | null
          observation_best_practice?: string | null
          points_achieved?: number | null
          pp_review_id: string
          question_number: number
          question_text: string
          remediation_notes?: string | null
          response?: string | null
          reviewer_recommendation?: string | null
          risk_rating?: string | null
          severity_suggested?: string | null
          updated_at?: string
        }
        Update: {
          auto_flag_reason?: string | null
          control_area?: string
          control_category?: string
          created_at?: string
          deficiency_explanation?: string | null
          deficiency_flag?: boolean | null
          doc_reference?: string | null
          evidence_file_ids?: string[] | null
          evidence_reviewed?: string | null
          finding_type?: string | null
          id?: string
          notes?: string | null
          observation_best_practice?: string | null
          points_achieved?: number | null
          pp_review_id?: string
          question_number?: number
          question_text?: string
          remediation_notes?: string | null
          response?: string | null
          reviewer_recommendation?: string | null
          risk_rating?: string | null
          severity_suggested?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "aml_pp_control_results_pp_review_id_fkey"
            columns: ["pp_review_id"]
            isOneToOne: false
            referencedRelation: "aml_pp_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      aml_pp_documents: {
        Row: {
          approval_authority: string | null
          created_at: string
          date_approved: string | null
          date_prepared: string | null
          id: string
          name: string
          pp_review_id: string
          scope: string | null
          sort_order: number
          updated_at: string
          version_number: string | null
        }
        Insert: {
          approval_authority?: string | null
          created_at?: string
          date_approved?: string | null
          date_prepared?: string | null
          id?: string
          name: string
          pp_review_id: string
          scope?: string | null
          sort_order?: number
          updated_at?: string
          version_number?: string | null
        }
        Update: {
          approval_authority?: string | null
          created_at?: string
          date_approved?: string | null
          date_prepared?: string | null
          id?: string
          name?: string
          pp_review_id?: string
          scope?: string | null
          sort_order?: number
          updated_at?: string
          version_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aml_pp_documents_pp_review_id_fkey"
            columns: ["pp_review_id"]
            isOneToOne: false
            referencedRelation: "aml_pp_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      aml_pp_reviews: {
        Row: {
          account_based_relationships: boolean | null
          approval_evidence_ids: string[] | null
          approval_present: string | null
          business_activities: string[] | null
          created_at: string
          current_step: number | null
          deals_in_virtual_currency: boolean | null
          document_names: string[] | null
          id: string
          last_updated_date: string | null
          offers_international_efts: boolean | null
          overall_design_rating: string | null
          overall_finding_type: string | null
          overall_finding_type_overridden: boolean
          policy_document_ids: string[] | null
          program_review_id: string
          status: string
          summary_narrative: string | null
          updated_at: string
          uses_agents_branches: boolean | null
          version_control_present: string | null
          version_number: string | null
        }
        Insert: {
          account_based_relationships?: boolean | null
          approval_evidence_ids?: string[] | null
          approval_present?: string | null
          business_activities?: string[] | null
          created_at?: string
          current_step?: number | null
          deals_in_virtual_currency?: boolean | null
          document_names?: string[] | null
          id?: string
          last_updated_date?: string | null
          offers_international_efts?: boolean | null
          overall_design_rating?: string | null
          overall_finding_type?: string | null
          overall_finding_type_overridden?: boolean
          policy_document_ids?: string[] | null
          program_review_id: string
          status?: string
          summary_narrative?: string | null
          updated_at?: string
          uses_agents_branches?: boolean | null
          version_control_present?: string | null
          version_number?: string | null
        }
        Update: {
          account_based_relationships?: boolean | null
          approval_evidence_ids?: string[] | null
          approval_present?: string | null
          business_activities?: string[] | null
          created_at?: string
          current_step?: number | null
          deals_in_virtual_currency?: boolean | null
          document_names?: string[] | null
          id?: string
          last_updated_date?: string | null
          offers_international_efts?: boolean | null
          overall_design_rating?: string | null
          overall_finding_type?: string | null
          overall_finding_type_overridden?: boolean
          policy_document_ids?: string[] | null
          program_review_id?: string
          status?: string
          summary_narrative?: string | null
          updated_at?: string
          uses_agents_branches?: boolean | null
          version_control_present?: string | null
          version_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aml_pp_reviews_program_review_id_fkey"
            columns: ["program_review_id"]
            isOneToOne: true
            referencedRelation: "aml_program_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      aml_program_findings: {
        Row: {
          control_result_id: string | null
          created_at: string
          engagement_id: string
          finding_description: string | null
          finding_title: string
          id: string
          is_auto_generated: boolean | null
          management_response: string | null
          pp_review_id: string | null
          recommendation: string | null
          severity: string
          status: string
          updated_at: string
        }
        Insert: {
          control_result_id?: string | null
          created_at?: string
          engagement_id: string
          finding_description?: string | null
          finding_title: string
          id?: string
          is_auto_generated?: boolean | null
          management_response?: string | null
          pp_review_id?: string | null
          recommendation?: string | null
          severity?: string
          status?: string
          updated_at?: string
        }
        Update: {
          control_result_id?: string | null
          created_at?: string
          engagement_id?: string
          finding_description?: string | null
          finding_title?: string
          id?: string
          is_auto_generated?: boolean | null
          management_response?: string | null
          pp_review_id?: string | null
          recommendation?: string | null
          severity?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "aml_program_findings_control_result_id_fkey"
            columns: ["control_result_id"]
            isOneToOne: false
            referencedRelation: "aml_pp_control_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aml_program_findings_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aml_program_findings_pp_review_id_fkey"
            columns: ["pp_review_id"]
            isOneToOne: false
            referencedRelation: "aml_pp_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      aml_program_question_templates: {
        Row: {
          analyst_guidance: string | null
          applicability: string | null
          auto_flag_condition: Json | null
          condition_field: string | null
          condition_value: string | null
          control_area: string
          control_category: string
          created_at: string
          evidence_required: boolean | null
          guidance: string | null
          id: string
          is_active: boolean | null
          is_conditional: boolean | null
          is_new_or_updated: boolean | null
          max_points: number | null
          pass_criteria: string | null
          procedure_statement: string | null
          question_code: string | null
          question_number: number
          question_text: string
          regulatory_category: string | null
          regulatory_reference: string | null
          section_code: string | null
          section_name: string | null
          sort_order: number | null
          submodule: string
          subsection: string | null
          suggested_finding_type: string | null
          test_procedure: string | null
        }
        Insert: {
          analyst_guidance?: string | null
          applicability?: string | null
          auto_flag_condition?: Json | null
          condition_field?: string | null
          condition_value?: string | null
          control_area: string
          control_category: string
          created_at?: string
          evidence_required?: boolean | null
          guidance?: string | null
          id?: string
          is_active?: boolean | null
          is_conditional?: boolean | null
          is_new_or_updated?: boolean | null
          max_points?: number | null
          pass_criteria?: string | null
          procedure_statement?: string | null
          question_code?: string | null
          question_number: number
          question_text: string
          regulatory_category?: string | null
          regulatory_reference?: string | null
          section_code?: string | null
          section_name?: string | null
          sort_order?: number | null
          submodule: string
          subsection?: string | null
          suggested_finding_type?: string | null
          test_procedure?: string | null
        }
        Update: {
          analyst_guidance?: string | null
          applicability?: string | null
          auto_flag_condition?: Json | null
          condition_field?: string | null
          condition_value?: string | null
          control_area?: string
          control_category?: string
          created_at?: string
          evidence_required?: boolean | null
          guidance?: string | null
          id?: string
          is_active?: boolean | null
          is_conditional?: boolean | null
          is_new_or_updated?: boolean | null
          max_points?: number | null
          pass_criteria?: string | null
          procedure_statement?: string | null
          question_code?: string | null
          question_number?: number
          question_text?: string
          regulatory_category?: string | null
          regulatory_reference?: string | null
          section_code?: string | null
          section_name?: string | null
          sort_order?: number | null
          submodule?: string
          subsection?: string | null
          suggested_finding_type?: string | null
          test_procedure?: string | null
        }
        Relationships: []
      }
      aml_program_reviews: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          engagement_id: string
          finalized_at: string | null
          finalized_by: string | null
          id: string
          last_unlocked_at: string | null
          last_unlocked_by: string | null
          lock_state: string
          overall_assessment: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          summary_for_report: string | null
          unlock_count: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          engagement_id: string
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          last_unlocked_at?: string | null
          last_unlocked_by?: string | null
          lock_state?: string
          overall_assessment?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          summary_for_report?: string | null
          unlock_count?: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          engagement_id?: string
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          last_unlocked_at?: string | null
          last_unlocked_by?: string | null
          lock_state?: string
          overall_assessment?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          summary_for_report?: string | null
          unlock_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "aml_program_reviews_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: true
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      audit_report_appendix_items: {
        Row: {
          action_status: string | null
          appendix_type: string
          created_at: string
          deficiency_description: string | null
          deficiency_evidence: string | null
          evidence_file_id: string | null
          file_size_kb: number | null
          file_type: string | null
          filename: string | null
          finding_reference: string | null
          id: string
          item_order: number
          management_action: string | null
          report_id: string
          responsible_person: string | null
          reviewer_bio: string | null
          reviewer_name: string | null
          target_date: string | null
          updated_at: string
        }
        Insert: {
          action_status?: string | null
          appendix_type: string
          created_at?: string
          deficiency_description?: string | null
          deficiency_evidence?: string | null
          evidence_file_id?: string | null
          file_size_kb?: number | null
          file_type?: string | null
          filename?: string | null
          finding_reference?: string | null
          id?: string
          item_order?: number
          management_action?: string | null
          report_id: string
          responsible_person?: string | null
          reviewer_bio?: string | null
          reviewer_name?: string | null
          target_date?: string | null
          updated_at?: string
        }
        Update: {
          action_status?: string | null
          appendix_type?: string
          created_at?: string
          deficiency_description?: string | null
          deficiency_evidence?: string | null
          evidence_file_id?: string | null
          file_size_kb?: number | null
          file_type?: string | null
          filename?: string | null
          finding_reference?: string | null
          id?: string
          item_order?: number
          management_action?: string | null
          report_id?: string
          responsible_person?: string | null
          reviewer_bio?: string | null
          reviewer_name?: string | null
          target_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_report_appendix_items_evidence_file_id_fkey"
            columns: ["evidence_file_id"]
            isOneToOne: false
            referencedRelation: "evidence_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_report_appendix_items_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "audit_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_report_findings_summary: {
        Row: {
          categorization: string | null
          created_at: string
          display_order: number
          finding_id: string | null
          finding_summary: string | null
          id: string
          is_manually_edited: boolean | null
          page_reference: string | null
          regulatory_requirement: string
          report_id: string
          updated_at: string
        }
        Insert: {
          categorization?: string | null
          created_at?: string
          display_order?: number
          finding_id?: string | null
          finding_summary?: string | null
          id?: string
          is_manually_edited?: boolean | null
          page_reference?: string | null
          regulatory_requirement: string
          report_id: string
          updated_at?: string
        }
        Update: {
          categorization?: string | null
          created_at?: string
          display_order?: number
          finding_id?: string | null
          finding_summary?: string | null
          id?: string
          is_manually_edited?: boolean | null
          page_reference?: string | null
          regulatory_requirement?: string
          report_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_report_findings_summary_finding_id_fkey"
            columns: ["finding_id"]
            isOneToOne: false
            referencedRelation: "findings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_report_findings_summary_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "audit_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_report_scope_templates: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          sort_order: number | null
          template_content: string
          template_key: string
          template_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          template_content: string
          template_key: string
          template_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          template_content?: string
          template_key?: string
          template_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_report_sections: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          ai_drafted_at: string | null
          ai_drafted_by: string | null
          ai_model: string | null
          ai_prompt_context: string | null
          content: string | null
          created_at: string
          draft_history: Json
          id: string
          is_ai_draft: boolean
          is_editable: boolean
          is_visible: boolean
          report_id: string
          section_key: string
          section_order: number
          section_title: string
          source_module: string | null
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          ai_drafted_at?: string | null
          ai_drafted_by?: string | null
          ai_model?: string | null
          ai_prompt_context?: string | null
          content?: string | null
          created_at?: string
          draft_history?: Json
          id?: string
          is_ai_draft?: boolean
          is_editable?: boolean
          is_visible?: boolean
          report_id: string
          section_key: string
          section_order?: number
          section_title: string
          source_module?: string | null
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          ai_drafted_at?: string | null
          ai_drafted_by?: string | null
          ai_model?: string | null
          ai_prompt_context?: string | null
          content?: string | null
          created_at?: string
          draft_history?: Json
          id?: string
          is_ai_draft?: boolean
          is_editable?: boolean
          is_visible?: boolean
          report_id?: string
          section_key?: string
          section_order?: number
          section_title?: string
          source_module?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_report_sections_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "audit_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_reports: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          draft_report_date: string | null
          engagement_id: string
          executive_summary: string | null
          executive_summary_accepted_at: string | null
          executive_summary_accepted_by: string | null
          executive_summary_ai_drafted_at: string | null
          executive_summary_ai_drafted_by: string | null
          executive_summary_ai_model: string | null
          executive_summary_ai_prompt_context: string | null
          executive_summary_edited_at: string | null
          executive_summary_edited_by: string | null
          executive_summary_is_ai_draft: boolean
          final_report_date: string | null
          finalized_at: string | null
          finalized_by: string | null
          id: string
          last_unlocked_at: string | null
          last_unlocked_by: string | null
          lead_reviewer_credentials: string | null
          lead_reviewer_name: string | null
          lock_state: string
          methodology_text: string | null
          prepared_by_address: string | null
          prepared_by_company: string | null
          prepared_by_contact: string | null
          prepared_for_address: string | null
          prepared_for_company: string | null
          prepared_for_name: string | null
          prepared_for_title: string | null
          report_title: string | null
          report_type: string
          scope_selections: string[] | null
          status: string
          unlock_count: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          draft_report_date?: string | null
          engagement_id: string
          executive_summary?: string | null
          executive_summary_accepted_at?: string | null
          executive_summary_accepted_by?: string | null
          executive_summary_ai_drafted_at?: string | null
          executive_summary_ai_drafted_by?: string | null
          executive_summary_ai_model?: string | null
          executive_summary_ai_prompt_context?: string | null
          executive_summary_edited_at?: string | null
          executive_summary_edited_by?: string | null
          executive_summary_is_ai_draft?: boolean
          final_report_date?: string | null
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          last_unlocked_at?: string | null
          last_unlocked_by?: string | null
          lead_reviewer_credentials?: string | null
          lead_reviewer_name?: string | null
          lock_state?: string
          methodology_text?: string | null
          prepared_by_address?: string | null
          prepared_by_company?: string | null
          prepared_by_contact?: string | null
          prepared_for_address?: string | null
          prepared_for_company?: string | null
          prepared_for_name?: string | null
          prepared_for_title?: string | null
          report_title?: string | null
          report_type?: string
          scope_selections?: string[] | null
          status?: string
          unlock_count?: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          draft_report_date?: string | null
          engagement_id?: string
          executive_summary?: string | null
          executive_summary_accepted_at?: string | null
          executive_summary_accepted_by?: string | null
          executive_summary_ai_drafted_at?: string | null
          executive_summary_ai_drafted_by?: string | null
          executive_summary_ai_model?: string | null
          executive_summary_ai_prompt_context?: string | null
          executive_summary_edited_at?: string | null
          executive_summary_edited_by?: string | null
          executive_summary_is_ai_draft?: boolean
          final_report_date?: string | null
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          last_unlocked_at?: string | null
          last_unlocked_by?: string | null
          lead_reviewer_credentials?: string | null
          lead_reviewer_name?: string | null
          lock_state?: string
          methodology_text?: string | null
          prepared_by_address?: string | null
          prepared_by_company?: string | null
          prepared_by_contact?: string | null
          prepared_for_address?: string | null
          prepared_for_company?: string | null
          prepared_for_name?: string | null
          prepared_for_title?: string | null
          report_title?: string | null
          report_type?: string
          scope_selections?: string[] | null
          status?: string
          unlock_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_reports_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: true
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_responses: {
        Row: {
          answer: string | null
          created_at: string
          evidence_ids: string[] | null
          id: string
          notes: string | null
          question_text: string
          template_id: string | null
          updated_at: string
          workpaper_id: string
        }
        Insert: {
          answer?: string | null
          created_at?: string
          evidence_ids?: string[] | null
          id?: string
          notes?: string | null
          question_text: string
          template_id?: string | null
          updated_at?: string
          workpaper_id: string
        }
        Update: {
          answer?: string | null
          created_at?: string
          evidence_ids?: string[] | null
          id?: string
          notes?: string | null
          question_text?: string
          template_id?: string | null
          updated_at?: string
          workpaper_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_responses_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_responses_workpaper_id_fkey"
            columns: ["workpaper_id"]
            isOneToOne: false
            referencedRelation: "workpapers"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_templates: {
        Row: {
          created_at: string
          guidance: string | null
          id: string
          is_active: boolean | null
          module: string
          question_text: string
          regulation_reference: string | null
          sort_order: number | null
          submodule: string | null
        }
        Insert: {
          created_at?: string
          guidance?: string | null
          id?: string
          is_active?: boolean | null
          module: string
          question_text: string
          regulation_reference?: string | null
          sort_order?: number | null
          submodule?: string | null
        }
        Update: {
          created_at?: string
          guidance?: string | null
          id?: string
          is_active?: boolean | null
          module?: string
          question_text?: string
          regulation_reference?: string | null
          sort_order?: number | null
          submodule?: string | null
        }
        Relationships: []
      }
      client_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          client_id: string
          id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          client_id: string
          id?: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          client_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_assignments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_documents: {
        Row: {
          category: string | null
          client_id: string
          created_at: string
          engagement_id: string
          file_size: number | null
          file_type: string | null
          filename: string
          id: string
          notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          storage_path: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          category?: string | null
          client_id: string
          created_at?: string
          engagement_id: string
          file_size?: number | null
          file_type?: string | null
          filename: string
          id?: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          storage_path: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          category?: string | null
          client_id?: string
          created_at?: string
          engagement_id?: string
          file_size?: number | null
          file_type?: string | null
          filename?: string
          id?: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          storage_path?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_documents_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      client_files_checklist_responses: {
        Row: {
          comment: string | null
          created_at: string
          engagement_id: string
          id: string
          status: string
          template_id: string
          updated_at: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          engagement_id: string
          id?: string
          status?: string
          template_id: string
          updated_at?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          engagement_id?: string
          id?: string
          status?: string
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_files_checklist_responses_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_files_checklist_responses_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "client_files_checklist_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      client_files_checklist_templates: {
        Row: {
          created_at: string
          description: string
          entity_profile: string
          guidance: string | null
          id: string
          is_active: boolean
          item_code: string
          item_number: number
          section: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description: string
          entity_profile: string
          guidance?: string | null
          id?: string
          is_active?: boolean
          item_code: string
          item_number: number
          section: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string
          entity_profile?: string
          guidance?: string | null
          id?: string
          is_active?: boolean
          item_code?: string
          item_number?: number
          section?: string
          sort_order?: number
        }
        Relationships: []
      }
      client_files_uploads: {
        Row: {
          client_id: string
          created_at: string
          engagement_id: string
          file_size: number | null
          file_type: string | null
          filename: string
          id: string
          notes: string | null
          sample_id: string | null
          sample_label: string | null
          sample_type: string | null
          sha256: string
          storage_path: string
          template_id: string | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          engagement_id: string
          file_size?: number | null
          file_type?: string | null
          filename: string
          id?: string
          notes?: string | null
          sample_id?: string | null
          sample_label?: string | null
          sample_type?: string | null
          sha256: string
          storage_path: string
          template_id?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          engagement_id?: string
          file_size?: number | null
          file_type?: string | null
          filename?: string
          id?: string
          notes?: string | null
          sample_id?: string | null
          sample_label?: string | null
          sample_type?: string | null
          sha256?: string
          storage_path?: string
          template_id?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_files_uploads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_files_uploads_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_files_uploads_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "client_files_checklist_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      client_invitations: {
        Row: {
          accepted_at: string | null
          client_id: string
          created_at: string
          email: string
          engagement_id: string
          expires_at: string
          id: string
          invited_by: string
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          client_id: string
          created_at?: string
          email: string
          engagement_id: string
          expires_at?: string
          id?: string
          invited_by: string
          status?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          client_id?: string
          created_at?: string
          email?: string
          engagement_id?: string
          expires_at?: string
          id?: string
          invited_by?: string
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_invitations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_invitations_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          entity_type: string
          id: string
          msb_activities: string[]
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          entity_type: string
          id?: string
          msb_activities?: string[]
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          entity_type?: string
          id?: string
          msb_activities?: string[]
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      effectiveness_reviews: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          comments: string | null
          created_at: string
          curr_engagement_letter_date: string | null
          curr_first_correspondence_date: string | null
          curr_start_basis: string | null
          curr_start_date: string | null
          deficiency_flag: boolean | null
          document_reference: string | null
          elapsed_months: number | null
          engagement_id: string
          evidence_reviewed: string | null
          finalized_at: string | null
          finalized_by: string | null
          id: string
          is_first_review: boolean | null
          last_unlocked_at: string | null
          last_unlocked_by: string | null
          lock_state: string
          max_points: number
          msb_registration_date: string | null
          observation_best_practice: string | null
          operations_commenced_date: string | null
          points_achieved: number | null
          prev_completion_date: string | null
          prev_engagement_letter_date: string | null
          prev_first_correspondence_date: string | null
          prev_start_basis: string | null
          prev_start_date: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          summary_for_report: string | null
          test_result: string | null
          unlock_count: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          comments?: string | null
          created_at?: string
          curr_engagement_letter_date?: string | null
          curr_first_correspondence_date?: string | null
          curr_start_basis?: string | null
          curr_start_date?: string | null
          deficiency_flag?: boolean | null
          document_reference?: string | null
          elapsed_months?: number | null
          engagement_id: string
          evidence_reviewed?: string | null
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          is_first_review?: boolean | null
          last_unlocked_at?: string | null
          last_unlocked_by?: string | null
          lock_state?: string
          max_points?: number
          msb_registration_date?: string | null
          observation_best_practice?: string | null
          operations_commenced_date?: string | null
          points_achieved?: number | null
          prev_completion_date?: string | null
          prev_engagement_letter_date?: string | null
          prev_first_correspondence_date?: string | null
          prev_start_basis?: string | null
          prev_start_date?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          summary_for_report?: string | null
          test_result?: string | null
          unlock_count?: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          comments?: string | null
          created_at?: string
          curr_engagement_letter_date?: string | null
          curr_first_correspondence_date?: string | null
          curr_start_basis?: string | null
          curr_start_date?: string | null
          deficiency_flag?: boolean | null
          document_reference?: string | null
          elapsed_months?: number | null
          engagement_id?: string
          evidence_reviewed?: string | null
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          is_first_review?: boolean | null
          last_unlocked_at?: string | null
          last_unlocked_by?: string | null
          lock_state?: string
          max_points?: number
          msb_registration_date?: string | null
          observation_best_practice?: string | null
          operations_commenced_date?: string | null
          points_achieved?: number | null
          prev_completion_date?: string | null
          prev_engagement_letter_date?: string | null
          prev_first_correspondence_date?: string | null
          prev_start_basis?: string | null
          prev_start_date?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          summary_for_report?: string | null
          test_result?: string | null
          unlock_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "effectiveness_reviews_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: true
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      engagement_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          engagement_id: string
          id: string
          role: string | null
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          engagement_id: string
          id?: string
          role?: string | null
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          engagement_id?: string
          id?: string
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "engagement_assignments_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      engagement_module_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          engagement_id: string
          id: string
          module: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          engagement_id: string
          id?: string
          module: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          engagement_id?: string
          id?: string
          module?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "engagement_module_assignments_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      engagements: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          period_end: string
          period_start: string
          scope: string | null
          status: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          period_end: string
          period_start: string
          scope?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          period_end?: string
          period_start?: string
          scope?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "engagements_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_files: {
        Row: {
          category: string | null
          client_id: string
          created_at: string
          engagement_id: string | null
          file_size: number | null
          file_type: string | null
          filename: string
          id: string
          parsed_json: Json | null
          storage_path: string
          tags: string[] | null
          uploaded_by: string | null
          version: number | null
        }
        Insert: {
          category?: string | null
          client_id: string
          created_at?: string
          engagement_id?: string | null
          file_size?: number | null
          file_type?: string | null
          filename: string
          id?: string
          parsed_json?: Json | null
          storage_path: string
          tags?: string[] | null
          uploaded_by?: string | null
          version?: number | null
        }
        Update: {
          category?: string | null
          client_id?: string
          created_at?: string
          engagement_id?: string | null
          file_size?: number | null
          file_type?: string | null
          filename?: string
          id?: string
          parsed_json?: Json | null
          storage_path?: string
          tags?: string[] | null
          uploaded_by?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "evidence_files_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_files_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_links: {
        Row: {
          created_at: string
          evidence_id: string
          finding_id: string | null
          id: string
          interview_id: string | null
          kyc_sample_id: string | null
          reporting_sample_id: string | null
          workpaper_id: string | null
        }
        Insert: {
          created_at?: string
          evidence_id: string
          finding_id?: string | null
          id?: string
          interview_id?: string | null
          kyc_sample_id?: string | null
          reporting_sample_id?: string | null
          workpaper_id?: string | null
        }
        Update: {
          created_at?: string
          evidence_id?: string
          finding_id?: string | null
          id?: string
          interview_id?: string | null
          kyc_sample_id?: string | null
          reporting_sample_id?: string | null
          workpaper_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evidence_links_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "evidence_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_links_finding_id_fkey"
            columns: ["finding_id"]
            isOneToOne: false
            referencedRelation: "findings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_links_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_links_kyc_sample_id_fkey"
            columns: ["kyc_sample_id"]
            isOneToOne: false
            referencedRelation: "kyc_samples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_links_reporting_sample_id_fkey"
            columns: ["reporting_sample_id"]
            isOneToOne: false
            referencedRelation: "reporting_samples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_links_workpaper_id_fkey"
            columns: ["workpaper_id"]
            isOneToOne: false
            referencedRelation: "workpapers"
            referencedColumns: ["id"]
          },
        ]
      }
      findings: {
        Row: {
          auto_flag_weaknesses: Json | null
          compliance_dimension: string | null
          consolidated_from_ids: string[] | null
          created_at: string
          created_by: string | null
          date_identified: string | null
          description: string | null
          engagement_id: string
          evidence_ids: string[] | null
          finding_type: string
          id: string
          is_consolidated: boolean | null
          is_first_miss: boolean | null
          management_response: string | null
          management_response_date: string | null
          management_response_owner: string | null
          module: string
          nature_of_obligation: string | null
          observation: string | null
          original_severity: string | null
          recommendation: string | null
          regulation_reference: string | null
          remediation_status: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          root_cause: string | null
          severity: string
          severity_changed_at: string | null
          severity_changed_by: string | null
          severity_override_reason: string | null
          source_aml_finding_id: string | null
          source_governance_response_id: string | null
          source_interview_id: string | null
          source_kyc_business_id: string | null
          source_kyc_individual_id: string | null
          source_reporting_sample_id: string | null
          source_workpaper_id: string | null
          status: string
          submodule: string | null
          target_remediation_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          auto_flag_weaknesses?: Json | null
          compliance_dimension?: string | null
          consolidated_from_ids?: string[] | null
          created_at?: string
          created_by?: string | null
          date_identified?: string | null
          description?: string | null
          engagement_id: string
          evidence_ids?: string[] | null
          finding_type?: string
          id?: string
          is_consolidated?: boolean | null
          is_first_miss?: boolean | null
          management_response?: string | null
          management_response_date?: string | null
          management_response_owner?: string | null
          module: string
          nature_of_obligation?: string | null
          observation?: string | null
          original_severity?: string | null
          recommendation?: string | null
          regulation_reference?: string | null
          remediation_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          root_cause?: string | null
          severity?: string
          severity_changed_at?: string | null
          severity_changed_by?: string | null
          severity_override_reason?: string | null
          source_aml_finding_id?: string | null
          source_governance_response_id?: string | null
          source_interview_id?: string | null
          source_kyc_business_id?: string | null
          source_kyc_individual_id?: string | null
          source_reporting_sample_id?: string | null
          source_workpaper_id?: string | null
          status?: string
          submodule?: string | null
          target_remediation_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          auto_flag_weaknesses?: Json | null
          compliance_dimension?: string | null
          consolidated_from_ids?: string[] | null
          created_at?: string
          created_by?: string | null
          date_identified?: string | null
          description?: string | null
          engagement_id?: string
          evidence_ids?: string[] | null
          finding_type?: string
          id?: string
          is_consolidated?: boolean | null
          is_first_miss?: boolean | null
          management_response?: string | null
          management_response_date?: string | null
          management_response_owner?: string | null
          module?: string
          nature_of_obligation?: string | null
          observation?: string | null
          original_severity?: string | null
          recommendation?: string | null
          regulation_reference?: string | null
          remediation_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          root_cause?: string | null
          severity?: string
          severity_changed_at?: string | null
          severity_changed_by?: string | null
          severity_override_reason?: string | null
          source_aml_finding_id?: string | null
          source_governance_response_id?: string | null
          source_interview_id?: string | null
          source_kyc_business_id?: string | null
          source_kyc_individual_id?: string | null
          source_reporting_sample_id?: string | null
          source_workpaper_id?: string | null
          status?: string
          submodule?: string | null
          target_remediation_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "findings_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "findings_source_aml_finding_id_fkey"
            columns: ["source_aml_finding_id"]
            isOneToOne: false
            referencedRelation: "aml_program_findings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "findings_source_governance_response_id_fkey"
            columns: ["source_governance_response_id"]
            isOneToOne: false
            referencedRelation: "governance_responses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "findings_source_interview_id_fkey"
            columns: ["source_interview_id"]
            isOneToOne: false
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "findings_source_kyc_business_id_fkey"
            columns: ["source_kyc_business_id"]
            isOneToOne: false
            referencedRelation: "kyc_business_samples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "findings_source_kyc_individual_id_fkey"
            columns: ["source_kyc_individual_id"]
            isOneToOne: false
            referencedRelation: "kyc_individual_samples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "findings_source_reporting_sample_id_fkey"
            columns: ["source_reporting_sample_id"]
            isOneToOne: false
            referencedRelation: "reporting_samples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "findings_source_workpaper_id_fkey"
            columns: ["source_workpaper_id"]
            isOneToOne: false
            referencedRelation: "workpapers"
            referencedColumns: ["id"]
          },
        ]
      }
      governance_changes: {
        Row: {
          change_description: string | null
          change_occurred: boolean | null
          change_type: string
          created_at: string
          effective_date: string | null
          engagement_id: string
          escalation_gap_flag: boolean | null
          id: string
          notes: string | null
          reportable_to_fintrac: string | null
          reported_to_fintrac: string | null
          reporting_date: string | null
          reporting_evidence_ids: string[] | null
          source_interview_id: string | null
          source_response_id: string | null
          updated_at: string
        }
        Insert: {
          change_description?: string | null
          change_occurred?: boolean | null
          change_type: string
          created_at?: string
          effective_date?: string | null
          engagement_id: string
          escalation_gap_flag?: boolean | null
          id?: string
          notes?: string | null
          reportable_to_fintrac?: string | null
          reported_to_fintrac?: string | null
          reporting_date?: string | null
          reporting_evidence_ids?: string[] | null
          source_interview_id?: string | null
          source_response_id?: string | null
          updated_at?: string
        }
        Update: {
          change_description?: string | null
          change_occurred?: boolean | null
          change_type?: string
          created_at?: string
          effective_date?: string | null
          engagement_id?: string
          escalation_gap_flag?: boolean | null
          id?: string
          notes?: string | null
          reportable_to_fintrac?: string | null
          reported_to_fintrac?: string | null
          reporting_date?: string | null
          reporting_evidence_ids?: string[] | null
          source_interview_id?: string | null
          source_response_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "governance_changes_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "governance_changes_source_interview_id_fkey"
            columns: ["source_interview_id"]
            isOneToOne: false
            referencedRelation: "governance_interviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "governance_changes_source_response_id_fkey"
            columns: ["source_response_id"]
            isOneToOne: false
            referencedRelation: "governance_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      governance_interview_evidence: {
        Row: {
          content_type: string | null
          evidence_kind: string
          file_size: number | null
          filename: string
          id: string
          interview_id: string
          storage_path: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          content_type?: string | null
          evidence_kind?: string
          file_size?: number | null
          filename: string
          id?: string
          interview_id: string
          storage_path: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          content_type?: string | null
          evidence_kind?: string
          file_size?: number | null
          filename?: string
          id?: string
          interview_id?: string
          storage_path?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "governance_interview_evidence_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "governance_interviews"
            referencedColumns: ["id"]
          },
        ]
      }
      governance_interviewees: {
        Row: {
          created_at: string
          id: string
          interview_id: string
          name: string
          role_context: string | null
          sort_order: number
          title: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          interview_id: string
          name: string
          role_context?: string | null
          sort_order?: number
          title?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          interview_id?: string
          name?: string
          role_context?: string | null
          sort_order?: number
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "governance_interviewees_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "governance_interviews"
            referencedColumns: ["id"]
          },
        ]
      }
      governance_interviews: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          conducted_by: string | null
          created_at: string
          engagement_id: string
          id: string
          interview_date: string | null
          interview_summary: string | null
          interview_type: string
          interviewee_name: string | null
          interviewee_title: string | null
          overall_assessment: string | null
          reviewer_id: string | null
          status: string
          transcript_file_id: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          conducted_by?: string | null
          created_at?: string
          engagement_id: string
          id?: string
          interview_date?: string | null
          interview_summary?: string | null
          interview_type: string
          interviewee_name?: string | null
          interviewee_title?: string | null
          overall_assessment?: string | null
          reviewer_id?: string | null
          status?: string
          transcript_file_id?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          conducted_by?: string | null
          created_at?: string
          engagement_id?: string
          id?: string
          interview_date?: string | null
          interview_summary?: string | null
          interview_type?: string
          interviewee_name?: string | null
          interviewee_title?: string | null
          overall_assessment?: string | null
          reviewer_id?: string | null
          status?: string
          transcript_file_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "governance_interviews_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "governance_interviews_transcript_file_id_fkey"
            columns: ["transcript_file_id"]
            isOneToOne: false
            referencedRelation: "evidence_files"
            referencedColumns: ["id"]
          },
        ]
      }
      governance_module_status: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          auto_flags_addressed: number | null
          auto_flags_count: number | null
          created_at: string
          engagement_id: string
          id: string
          interviews_completed: number | null
          interviews_required: number | null
          percent_complete: number | null
          reviewed_at: string | null
          reviewer_id: string | null
          status: string
          submodule: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          auto_flags_addressed?: number | null
          auto_flags_count?: number | null
          created_at?: string
          engagement_id: string
          id?: string
          interviews_completed?: number | null
          interviews_required?: number | null
          percent_complete?: number | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: string
          submodule: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          auto_flags_addressed?: number | null
          auto_flags_count?: number | null
          created_at?: string
          engagement_id?: string
          id?: string
          interviews_completed?: number | null
          interviews_required?: number | null
          percent_complete?: number | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: string
          submodule?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "governance_module_status_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      governance_question_templates: {
        Row: {
          auto_flag_condition: Json | null
          created_at: string
          creates_change_event: string | null
          evidence_required: boolean | null
          guidance: string | null
          id: string
          is_active: boolean | null
          question_number: number
          question_text: string
          regulation_reference: string | null
          response_options: Json | null
          response_type: string
          sort_order: number | null
          submodule: string
        }
        Insert: {
          auto_flag_condition?: Json | null
          created_at?: string
          creates_change_event?: string | null
          evidence_required?: boolean | null
          guidance?: string | null
          id?: string
          is_active?: boolean | null
          question_number: number
          question_text: string
          regulation_reference?: string | null
          response_options?: Json | null
          response_type?: string
          sort_order?: number | null
          submodule: string
        }
        Update: {
          auto_flag_condition?: Json | null
          created_at?: string
          creates_change_event?: string | null
          evidence_required?: boolean | null
          guidance?: string | null
          id?: string
          is_active?: boolean | null
          question_number?: number
          question_text?: string
          regulation_reference?: string | null
          response_options?: Json | null
          response_type?: string
          sort_order?: number | null
          submodule?: string
        }
        Relationships: []
      }
      governance_responses: {
        Row: {
          analyst_commentary: string | null
          auto_flag: boolean | null
          auto_flag_reason: string | null
          created_at: string
          evidence_ids: string[] | null
          evidence_provided: boolean | null
          evidence_required: boolean | null
          id: string
          interview_id: string
          question_id: string | null
          question_number: number
          question_text: string
          response: string | null
          response_details: string | null
          submodule: string
          updated_at: string
        }
        Insert: {
          analyst_commentary?: string | null
          auto_flag?: boolean | null
          auto_flag_reason?: string | null
          created_at?: string
          evidence_ids?: string[] | null
          evidence_provided?: boolean | null
          evidence_required?: boolean | null
          id?: string
          interview_id: string
          question_id?: string | null
          question_number: number
          question_text: string
          response?: string | null
          response_details?: string | null
          submodule: string
          updated_at?: string
        }
        Update: {
          analyst_commentary?: string | null
          auto_flag?: boolean | null
          auto_flag_reason?: string | null
          created_at?: string
          evidence_ids?: string[] | null
          evidence_provided?: boolean | null
          evidence_required?: boolean | null
          id?: string
          interview_id?: string
          question_id?: string | null
          question_number?: number
          question_text?: string
          response?: string | null
          response_details?: string | null
          submodule?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "governance_responses_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "governance_interviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "governance_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "governance_question_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      governance_summary: {
        Row: {
          created_at: string
          engagement_id: string
          final_reviewed_at: string | null
          final_reviewer_id: string | null
          id: string
          key_gaps: string | null
          key_strengths: string | null
          overall_assessment: string | null
          sign_off_at: string | null
          sign_off_by: string | null
          status: string
          summary_narrative: string | null
          total_auto_flags: number | null
          total_changes_detected: number | null
          total_interviews: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          engagement_id: string
          final_reviewed_at?: string | null
          final_reviewer_id?: string | null
          id?: string
          key_gaps?: string | null
          key_strengths?: string | null
          overall_assessment?: string | null
          sign_off_at?: string | null
          sign_off_by?: string | null
          status?: string
          summary_narrative?: string | null
          total_auto_flags?: number | null
          total_changes_detected?: number | null
          total_interviews?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          engagement_id?: string
          final_reviewed_at?: string | null
          final_reviewer_id?: string | null
          id?: string
          key_gaps?: string | null
          key_strengths?: string | null
          overall_assessment?: string | null
          sign_off_at?: string | null
          sign_off_by?: string | null
          status?: string
          summary_narrative?: string | null
          total_auto_flags?: number | null
          total_changes_detected?: number | null
          total_interviews?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "governance_summary_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: true
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      information_request_responses: {
        Row: {
          created_at: string
          evidence_file_ids: string[] | null
          id: string
          is_client_response: boolean
          request_id: string
          responded_by: string
          response_text: string
        }
        Insert: {
          created_at?: string
          evidence_file_ids?: string[] | null
          id?: string
          is_client_response?: boolean
          request_id: string
          responded_by: string
          response_text: string
        }
        Update: {
          created_at?: string
          evidence_file_ids?: string[] | null
          id?: string
          is_client_response?: boolean
          request_id?: string
          responded_by?: string
          response_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "information_request_responses_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "information_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      information_requests: {
        Row: {
          category: string
          client_id: string
          created_at: string
          description: string | null
          due_date: string | null
          engagement_id: string
          id: string
          module: string | null
          priority: string
          requested_by: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          client_id: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          engagement_id: string
          id?: string
          module?: string | null
          priority?: string
          requested_by: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          client_id?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          engagement_id?: string
          id?: string
          module?: string | null
          priority?: string
          requested_by?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "information_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "information_requests_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_responses: {
        Row: {
          answer: string | null
          created_at: string
          evidence_ids: string[] | null
          id: string
          interview_id: string
          notes: string | null
          question_text: string
        }
        Insert: {
          answer?: string | null
          created_at?: string
          evidence_ids?: string[] | null
          id?: string
          interview_id: string
          notes?: string | null
          question_text: string
        }
        Update: {
          answer?: string | null
          created_at?: string
          evidence_ids?: string[] | null
          id?: string
          interview_id?: string
          notes?: string | null
          question_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_responses_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
        ]
      }
      interviews: {
        Row: {
          created_at: string
          created_by: string | null
          engagement_id: string
          id: string
          interview_date: string | null
          interview_type: string
          interviewee_name: string | null
          interviewee_title: string | null
          status: string
          summary_text: string | null
          transcript_file_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          engagement_id: string
          id?: string
          interview_date?: string | null
          interview_type: string
          interviewee_name?: string | null
          interviewee_title?: string | null
          status?: string
          summary_text?: string | null
          transcript_file_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          engagement_id?: string
          id?: string
          interview_date?: string | null
          interview_type?: string
          interviewee_name?: string | null
          interviewee_title?: string | null
          status?: string
          summary_text?: string | null
          transcript_file_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interviews_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interviews_transcript_file_id_fkey"
            columns: ["transcript_file_id"]
            isOneToOne: false
            referencedRelation: "evidence_files"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_beneficial_owners: {
        Row: {
          business_sample_id: string
          created_at: string
          evidence_file_ids: string[] | null
          id: string
          identity_verified: boolean | null
          is_hio: boolean | null
          is_natural_person: boolean | null
          is_pep: boolean | null
          notes: string | null
          owner_name: string | null
          ownership_percentage: number | null
          pep_hio_determination_date: string | null
          updated_at: string
          verification_method:
            | Database["public"]["Enums"]["kyc_identification_method"]
            | null
        }
        Insert: {
          business_sample_id: string
          created_at?: string
          evidence_file_ids?: string[] | null
          id?: string
          identity_verified?: boolean | null
          is_hio?: boolean | null
          is_natural_person?: boolean | null
          is_pep?: boolean | null
          notes?: string | null
          owner_name?: string | null
          ownership_percentage?: number | null
          pep_hio_determination_date?: string | null
          updated_at?: string
          verification_method?:
            | Database["public"]["Enums"]["kyc_identification_method"]
            | null
        }
        Update: {
          business_sample_id?: string
          created_at?: string
          evidence_file_ids?: string[] | null
          id?: string
          identity_verified?: boolean | null
          is_hio?: boolean | null
          is_natural_person?: boolean | null
          is_pep?: boolean | null
          notes?: string | null
          owner_name?: string | null
          ownership_percentage?: number | null
          pep_hio_determination_date?: string | null
          updated_at?: string
          verification_method?:
            | Database["public"]["Enums"]["kyc_identification_method"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "kyc_beneficial_owners_business_sample_id_fkey"
            columns: ["business_sample_id"]
            isOneToOne: false
            referencedRelation: "kyc_business_samples"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_business_samples: {
        Row: {
          address_present: boolean | null
          articles_or_bylaws_obtained: boolean | null
          authorized_persons_documented: boolean | null
          authorized_persons_id_verified: boolean | null
          authorized_persons_names_recorded: boolean | null
          bo_25_percent_identified: boolean | null
          bo_identity_verified: boolean | null
          bo_name_address_recorded: boolean | null
          bo_natural_persons_identified: boolean | null
          bo_pep_hio_determination_completed: boolean | null
          bo_percentage_gap_explanation: boolean | null
          bo_percentages_total_100: boolean | null
          bo_supporting_docs_obtained: boolean | null
          bo_test_result: string | null
          business_name: string | null
          cheque_account_holder_name: boolean | null
          cheque_account_number: boolean | null
          cheque_account_type: boolean | null
          cheque_date_cashed: boolean | null
          cheque_issuer_name: boolean | null
          cheque_provider_address: boolean | null
          cheque_provider_dob: boolean | null
          cheque_provider_name: boolean | null
          cheque_provider_occupation: boolean | null
          cheque_reference_number: boolean | null
          cheque_total_amount: boolean | null
          cheque_vc_transaction_identifier: boolean | null
          control_structure_documented: boolean | null
          corp_25pct_owners_name_address: boolean | null
          corp_directors_names_recorded: boolean | null
          corp_ownership_control_structure: boolean | null
          created_at: string
          customer_id: string | null
          deficiencies: string | null
          directors_list_obtained: boolean | null
          eft_account_details: boolean | null
          eft_beneficiary_address: boolean | null
          eft_beneficiary_name: boolean | null
          eft_date_of_initiation: boolean | null
          eft_exchange_rate: boolean | null
          eft_exchange_rate_source: boolean | null
          eft_fund_type_amount: boolean | null
          eft_ordering_client_address: boolean | null
          eft_ordering_client_name: boolean | null
          eft_receiving_fi: boolean | null
          eft_record_complete: boolean | null
          eft_reference_number: boolean | null
          eft_requesting_client_match_kyc: boolean | null
          eft_sending_fi: boolean | null
          enhanced_monitoring_evidenced: boolean | null
          entity_is_corporation: boolean | null
          entity_is_nfp: boolean | null
          entity_is_other: boolean | null
          entity_is_trust: boolean | null
          entity_is_widely_held: boolean | null
          evidence_file_ids: string[] | null
          evidence_type: string | null
          finding_type: string | null
          id: string
          incorporation_number_present: boolean | null
          is_transaction_related: boolean | null
          jurisdiction_documented: boolean | null
          lctr_24h_aggregation: boolean | null
          lctr_amount_confirmed: boolean | null
          lctr_client_address: boolean | null
          lctr_client_dob: boolean | null
          lctr_client_name: boolean | null
          lctr_conductor_address: boolean | null
          lctr_conductor_name: boolean | null
          lctr_currency_conversion: boolean | null
          lctr_occupation: boolean | null
          lctr_purpose: boolean | null
          lctr_record_complete: boolean | null
          lctr_third_party_details: boolean | null
          lctr_third_party_determination: boolean | null
          lctr_transaction_time: boolean | null
          legal_name_present: boolean | null
          mandatory_test_result: string | null
          nature_of_business_documented: boolean | null
          nfp_non_charity_soliciting: boolean | null
          nfp_registered_charity: boolean | null
          notes: string | null
          onboarding_date: string | null
          other_25pct_owners_identified: boolean | null
          other_ownership_control_documented: boolean | null
          overall_result: string | null
          override_rationale: string | null
          ownership_structure_documented: boolean | null
          pep_hio_identified: boolean | null
          reasonable_measures_result: string | null
          record_retention_evidenced: boolean | null
          relationship_documented: boolean | null
          review_id: string
          risk_rating: Database["public"]["Enums"]["risk_rating"]
          senior_management_review_completed: boolean | null
          signature_card_obtained: boolean | null
          smo_identified_if_bo_unknown: boolean | null
          source_of_funds_documented: boolean | null
          source_of_wealth_documented: boolean | null
          supporting_evidence_available: boolean | null
          system_finding_type: string | null
          telephone_present: boolean | null
          third_party_determination_made: boolean | null
          third_party_documented: boolean | null
          third_party_entity_address: boolean | null
          third_party_entity_incorporation_number: boolean | null
          third_party_entity_name: boolean | null
          third_party_entity_nature_of_business: boolean | null
          third_party_entity_place_of_incorporation: boolean | null
          third_party_individual_address: boolean | null
          third_party_individual_dob: boolean | null
          third_party_individual_name: boolean | null
          third_party_individual_occupation: boolean | null
          third_party_relationship_documented: boolean | null
          third_party_relationship_type: string | null
          third_party_required: boolean | null
          third_party_type: string | null
          transaction_amount: number | null
          transaction_currency: string | null
          transaction_date: string | null
          transaction_type: string | null
          triggered_obligation:
            | Database["public"]["Enums"]["kyc_triggered_obligation"]
            | null
          trust_beneficiaries_name_address: boolean | null
          trust_ownership_control_structure: boolean | null
          trust_settlors_name_address: boolean | null
          trust_trustees_name_address: boolean | null
          updated_at: string
          vc_amount: boolean | null
          vc_amount_confirmed: boolean | null
          vc_client_address: boolean | null
          vc_client_name: boolean | null
          vc_exchange_rate: boolean | null
          vc_exchange_rate_source: boolean | null
          vc_fiat_equivalent: boolean | null
          vc_receiving_wallet: boolean | null
          vc_record_complete: boolean | null
          vc_reference_number: boolean | null
          vc_sending_wallet: boolean | null
          vc_third_party_determination: boolean | null
          vc_type_of_vc: boolean | null
          wht_25pct_owners_identified: boolean | null
          wht_ownership_control_documented: boolean | null
          wht_trustees_names: boolean | null
        }
        Insert: {
          address_present?: boolean | null
          articles_or_bylaws_obtained?: boolean | null
          authorized_persons_documented?: boolean | null
          authorized_persons_id_verified?: boolean | null
          authorized_persons_names_recorded?: boolean | null
          bo_25_percent_identified?: boolean | null
          bo_identity_verified?: boolean | null
          bo_name_address_recorded?: boolean | null
          bo_natural_persons_identified?: boolean | null
          bo_pep_hio_determination_completed?: boolean | null
          bo_percentage_gap_explanation?: boolean | null
          bo_percentages_total_100?: boolean | null
          bo_supporting_docs_obtained?: boolean | null
          bo_test_result?: string | null
          business_name?: string | null
          cheque_account_holder_name?: boolean | null
          cheque_account_number?: boolean | null
          cheque_account_type?: boolean | null
          cheque_date_cashed?: boolean | null
          cheque_issuer_name?: boolean | null
          cheque_provider_address?: boolean | null
          cheque_provider_dob?: boolean | null
          cheque_provider_name?: boolean | null
          cheque_provider_occupation?: boolean | null
          cheque_reference_number?: boolean | null
          cheque_total_amount?: boolean | null
          cheque_vc_transaction_identifier?: boolean | null
          control_structure_documented?: boolean | null
          corp_25pct_owners_name_address?: boolean | null
          corp_directors_names_recorded?: boolean | null
          corp_ownership_control_structure?: boolean | null
          created_at?: string
          customer_id?: string | null
          deficiencies?: string | null
          directors_list_obtained?: boolean | null
          eft_account_details?: boolean | null
          eft_beneficiary_address?: boolean | null
          eft_beneficiary_name?: boolean | null
          eft_date_of_initiation?: boolean | null
          eft_exchange_rate?: boolean | null
          eft_exchange_rate_source?: boolean | null
          eft_fund_type_amount?: boolean | null
          eft_ordering_client_address?: boolean | null
          eft_ordering_client_name?: boolean | null
          eft_receiving_fi?: boolean | null
          eft_record_complete?: boolean | null
          eft_reference_number?: boolean | null
          eft_requesting_client_match_kyc?: boolean | null
          eft_sending_fi?: boolean | null
          enhanced_monitoring_evidenced?: boolean | null
          entity_is_corporation?: boolean | null
          entity_is_nfp?: boolean | null
          entity_is_other?: boolean | null
          entity_is_trust?: boolean | null
          entity_is_widely_held?: boolean | null
          evidence_file_ids?: string[] | null
          evidence_type?: string | null
          finding_type?: string | null
          id?: string
          incorporation_number_present?: boolean | null
          is_transaction_related?: boolean | null
          jurisdiction_documented?: boolean | null
          lctr_24h_aggregation?: boolean | null
          lctr_amount_confirmed?: boolean | null
          lctr_client_address?: boolean | null
          lctr_client_dob?: boolean | null
          lctr_client_name?: boolean | null
          lctr_conductor_address?: boolean | null
          lctr_conductor_name?: boolean | null
          lctr_currency_conversion?: boolean | null
          lctr_occupation?: boolean | null
          lctr_purpose?: boolean | null
          lctr_record_complete?: boolean | null
          lctr_third_party_details?: boolean | null
          lctr_third_party_determination?: boolean | null
          lctr_transaction_time?: boolean | null
          legal_name_present?: boolean | null
          mandatory_test_result?: string | null
          nature_of_business_documented?: boolean | null
          nfp_non_charity_soliciting?: boolean | null
          nfp_registered_charity?: boolean | null
          notes?: string | null
          onboarding_date?: string | null
          other_25pct_owners_identified?: boolean | null
          other_ownership_control_documented?: boolean | null
          overall_result?: string | null
          override_rationale?: string | null
          ownership_structure_documented?: boolean | null
          pep_hio_identified?: boolean | null
          reasonable_measures_result?: string | null
          record_retention_evidenced?: boolean | null
          relationship_documented?: boolean | null
          review_id: string
          risk_rating?: Database["public"]["Enums"]["risk_rating"]
          senior_management_review_completed?: boolean | null
          signature_card_obtained?: boolean | null
          smo_identified_if_bo_unknown?: boolean | null
          source_of_funds_documented?: boolean | null
          source_of_wealth_documented?: boolean | null
          supporting_evidence_available?: boolean | null
          system_finding_type?: string | null
          telephone_present?: boolean | null
          third_party_determination_made?: boolean | null
          third_party_documented?: boolean | null
          third_party_entity_address?: boolean | null
          third_party_entity_incorporation_number?: boolean | null
          third_party_entity_name?: boolean | null
          third_party_entity_nature_of_business?: boolean | null
          third_party_entity_place_of_incorporation?: boolean | null
          third_party_individual_address?: boolean | null
          third_party_individual_dob?: boolean | null
          third_party_individual_name?: boolean | null
          third_party_individual_occupation?: boolean | null
          third_party_relationship_documented?: boolean | null
          third_party_relationship_type?: string | null
          third_party_required?: boolean | null
          third_party_type?: string | null
          transaction_amount?: number | null
          transaction_currency?: string | null
          transaction_date?: string | null
          transaction_type?: string | null
          triggered_obligation?:
            | Database["public"]["Enums"]["kyc_triggered_obligation"]
            | null
          trust_beneficiaries_name_address?: boolean | null
          trust_ownership_control_structure?: boolean | null
          trust_settlors_name_address?: boolean | null
          trust_trustees_name_address?: boolean | null
          updated_at?: string
          vc_amount?: boolean | null
          vc_amount_confirmed?: boolean | null
          vc_client_address?: boolean | null
          vc_client_name?: boolean | null
          vc_exchange_rate?: boolean | null
          vc_exchange_rate_source?: boolean | null
          vc_fiat_equivalent?: boolean | null
          vc_receiving_wallet?: boolean | null
          vc_record_complete?: boolean | null
          vc_reference_number?: boolean | null
          vc_sending_wallet?: boolean | null
          vc_third_party_determination?: boolean | null
          vc_type_of_vc?: boolean | null
          wht_25pct_owners_identified?: boolean | null
          wht_ownership_control_documented?: boolean | null
          wht_trustees_names?: boolean | null
        }
        Update: {
          address_present?: boolean | null
          articles_or_bylaws_obtained?: boolean | null
          authorized_persons_documented?: boolean | null
          authorized_persons_id_verified?: boolean | null
          authorized_persons_names_recorded?: boolean | null
          bo_25_percent_identified?: boolean | null
          bo_identity_verified?: boolean | null
          bo_name_address_recorded?: boolean | null
          bo_natural_persons_identified?: boolean | null
          bo_pep_hio_determination_completed?: boolean | null
          bo_percentage_gap_explanation?: boolean | null
          bo_percentages_total_100?: boolean | null
          bo_supporting_docs_obtained?: boolean | null
          bo_test_result?: string | null
          business_name?: string | null
          cheque_account_holder_name?: boolean | null
          cheque_account_number?: boolean | null
          cheque_account_type?: boolean | null
          cheque_date_cashed?: boolean | null
          cheque_issuer_name?: boolean | null
          cheque_provider_address?: boolean | null
          cheque_provider_dob?: boolean | null
          cheque_provider_name?: boolean | null
          cheque_provider_occupation?: boolean | null
          cheque_reference_number?: boolean | null
          cheque_total_amount?: boolean | null
          cheque_vc_transaction_identifier?: boolean | null
          control_structure_documented?: boolean | null
          corp_25pct_owners_name_address?: boolean | null
          corp_directors_names_recorded?: boolean | null
          corp_ownership_control_structure?: boolean | null
          created_at?: string
          customer_id?: string | null
          deficiencies?: string | null
          directors_list_obtained?: boolean | null
          eft_account_details?: boolean | null
          eft_beneficiary_address?: boolean | null
          eft_beneficiary_name?: boolean | null
          eft_date_of_initiation?: boolean | null
          eft_exchange_rate?: boolean | null
          eft_exchange_rate_source?: boolean | null
          eft_fund_type_amount?: boolean | null
          eft_ordering_client_address?: boolean | null
          eft_ordering_client_name?: boolean | null
          eft_receiving_fi?: boolean | null
          eft_record_complete?: boolean | null
          eft_reference_number?: boolean | null
          eft_requesting_client_match_kyc?: boolean | null
          eft_sending_fi?: boolean | null
          enhanced_monitoring_evidenced?: boolean | null
          entity_is_corporation?: boolean | null
          entity_is_nfp?: boolean | null
          entity_is_other?: boolean | null
          entity_is_trust?: boolean | null
          entity_is_widely_held?: boolean | null
          evidence_file_ids?: string[] | null
          evidence_type?: string | null
          finding_type?: string | null
          id?: string
          incorporation_number_present?: boolean | null
          is_transaction_related?: boolean | null
          jurisdiction_documented?: boolean | null
          lctr_24h_aggregation?: boolean | null
          lctr_amount_confirmed?: boolean | null
          lctr_client_address?: boolean | null
          lctr_client_dob?: boolean | null
          lctr_client_name?: boolean | null
          lctr_conductor_address?: boolean | null
          lctr_conductor_name?: boolean | null
          lctr_currency_conversion?: boolean | null
          lctr_occupation?: boolean | null
          lctr_purpose?: boolean | null
          lctr_record_complete?: boolean | null
          lctr_third_party_details?: boolean | null
          lctr_third_party_determination?: boolean | null
          lctr_transaction_time?: boolean | null
          legal_name_present?: boolean | null
          mandatory_test_result?: string | null
          nature_of_business_documented?: boolean | null
          nfp_non_charity_soliciting?: boolean | null
          nfp_registered_charity?: boolean | null
          notes?: string | null
          onboarding_date?: string | null
          other_25pct_owners_identified?: boolean | null
          other_ownership_control_documented?: boolean | null
          overall_result?: string | null
          override_rationale?: string | null
          ownership_structure_documented?: boolean | null
          pep_hio_identified?: boolean | null
          reasonable_measures_result?: string | null
          record_retention_evidenced?: boolean | null
          relationship_documented?: boolean | null
          review_id?: string
          risk_rating?: Database["public"]["Enums"]["risk_rating"]
          senior_management_review_completed?: boolean | null
          signature_card_obtained?: boolean | null
          smo_identified_if_bo_unknown?: boolean | null
          source_of_funds_documented?: boolean | null
          source_of_wealth_documented?: boolean | null
          supporting_evidence_available?: boolean | null
          system_finding_type?: string | null
          telephone_present?: boolean | null
          third_party_determination_made?: boolean | null
          third_party_documented?: boolean | null
          third_party_entity_address?: boolean | null
          third_party_entity_incorporation_number?: boolean | null
          third_party_entity_name?: boolean | null
          third_party_entity_nature_of_business?: boolean | null
          third_party_entity_place_of_incorporation?: boolean | null
          third_party_individual_address?: boolean | null
          third_party_individual_dob?: boolean | null
          third_party_individual_name?: boolean | null
          third_party_individual_occupation?: boolean | null
          third_party_relationship_documented?: boolean | null
          third_party_relationship_type?: string | null
          third_party_required?: boolean | null
          third_party_type?: string | null
          transaction_amount?: number | null
          transaction_currency?: string | null
          transaction_date?: string | null
          transaction_type?: string | null
          triggered_obligation?:
            | Database["public"]["Enums"]["kyc_triggered_obligation"]
            | null
          trust_beneficiaries_name_address?: boolean | null
          trust_ownership_control_structure?: boolean | null
          trust_settlors_name_address?: boolean | null
          trust_trustees_name_address?: boolean | null
          updated_at?: string
          vc_amount?: boolean | null
          vc_amount_confirmed?: boolean | null
          vc_client_address?: boolean | null
          vc_client_name?: boolean | null
          vc_exchange_rate?: boolean | null
          vc_exchange_rate_source?: boolean | null
          vc_fiat_equivalent?: boolean | null
          vc_receiving_wallet?: boolean | null
          vc_record_complete?: boolean | null
          vc_reference_number?: boolean | null
          vc_sending_wallet?: boolean | null
          vc_third_party_determination?: boolean | null
          vc_type_of_vc?: boolean | null
          wht_25pct_owners_identified?: boolean | null
          wht_ownership_control_documented?: boolean | null
          wht_trustees_names?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "kyc_business_samples_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "kyc_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_individual_samples: {
        Row: {
          address_present: boolean | null
          cf_consultation_date: boolean | null
          cf_credit_bureau_name: boolean | null
          cf_credit_file_number: boolean | null
          cf_existence_3_years: boolean | null
          cf_name_address_dob_match: boolean | null
          cf_two_tradelines: boolean | null
          cheque_account_holder_name: boolean | null
          cheque_account_number: boolean | null
          cheque_account_type: boolean | null
          cheque_date_cashed: boolean | null
          cheque_issuer_name: boolean | null
          cheque_provider_address: boolean | null
          cheque_provider_dob: boolean | null
          cheque_provider_name: boolean | null
          cheque_provider_occupation: boolean | null
          cheque_reference_number: boolean | null
          cheque_total_amount: boolean | null
          cheque_vc_transaction_identifier: boolean | null
          created_at: string
          customer_id: string | null
          customer_name: string | null
          deficiencies: string | null
          dob_present: boolean | null
          dp_date_verified: boolean | null
          dp_document_number: boolean | null
          dp_document_valid_current: boolean | null
          dp_information_type: boolean | null
          dp_person_name: boolean | null
          dp_two_independent_sources: boolean | null
          eft_account_details: boolean | null
          eft_beneficiary_address: boolean | null
          eft_beneficiary_name: boolean | null
          eft_date_of_initiation: boolean | null
          eft_exchange_rate: boolean | null
          eft_exchange_rate_source: boolean | null
          eft_fund_type_amount: boolean | null
          eft_ordering_client_address: boolean | null
          eft_ordering_client_name: boolean | null
          eft_receiving_fi: boolean | null
          eft_record_complete: boolean | null
          eft_reference_number: boolean | null
          eft_requesting_client_match_kyc: boolean | null
          eft_sending_fi: boolean | null
          enhanced_monitoring_evidenced: boolean | null
          evidence_file_ids: string[] | null
          evidence_type: string | null
          finding_type: string | null
          id: string
          id_attr_document_type: boolean | null
          id_attr_expiry_date: boolean | null
          id_attr_expiry_na: boolean | null
          id_attr_identifying_number: boolean | null
          id_attr_jurisdiction: boolean | null
          id_attr_person_name: boolean | null
          id_contains_required_attributes: boolean | null
          id_valid_at_verification: boolean | null
          id_verified: boolean | null
          identification_method:
            | Database["public"]["Enums"]["kyc_identification_method"]
            | null
          is_transaction_related: boolean | null
          lctr_24h_aggregation: boolean | null
          lctr_amount_confirmed: boolean | null
          lctr_client_address: boolean | null
          lctr_client_dob: boolean | null
          lctr_client_name: boolean | null
          lctr_conductor_address: boolean | null
          lctr_conductor_name: boolean | null
          lctr_currency_conversion: boolean | null
          lctr_occupation: boolean | null
          lctr_purpose: boolean | null
          lctr_record_complete: boolean | null
          lctr_third_party_details: boolean | null
          lctr_third_party_determination: boolean | null
          lctr_transaction_time: boolean | null
          mandatory_test_result: string | null
          name_present: boolean | null
          notes: string | null
          occupation_description: string | null
          occupation_present: boolean | null
          occupation_required: boolean | null
          onboarding_date: string | null
          overall_result: string | null
          override_rationale: string | null
          pep_classified_high_risk: boolean | null
          pep_determination_date_documented: boolean | null
          pep_hio_determination_completed: boolean | null
          pep_hio_identified: boolean | null
          pep_office_position_documented: boolean | null
          pep_senior_mgmt_approval: boolean | null
          pep_senior_mgmt_review_30_days: boolean | null
          pep_source_of_funds_measures: boolean | null
          pep_source_of_wealth_measures: boolean | null
          pep_status_recorded: boolean | null
          reasonable_measures_result: string | null
          record_retention_evidenced: boolean | null
          review_id: string
          risk_rating: Database["public"]["Enums"]["risk_rating"]
          senior_management_review_completed: boolean | null
          senior_management_review_within_30_days: boolean | null
          sole_prop_nature_of_business: string | null
          source_of_funds_documented: boolean | null
          source_of_wealth_documented: boolean | null
          system_finding_type: string | null
          telephone_present: boolean | null
          third_party_determination_made: boolean | null
          third_party_documented: boolean | null
          third_party_entity_address: boolean | null
          third_party_entity_incorporation_number: boolean | null
          third_party_entity_name: boolean | null
          third_party_entity_nature_of_business: boolean | null
          third_party_entity_place_of_incorporation: boolean | null
          third_party_individual_address: boolean | null
          third_party_individual_dob: boolean | null
          third_party_individual_name: boolean | null
          third_party_individual_occupation: boolean | null
          third_party_relationship_documented: boolean | null
          third_party_relationship_type: string | null
          third_party_required: boolean | null
          third_party_type: string | null
          transaction_amount: number | null
          transaction_currency: string | null
          transaction_date: string | null
          transaction_type: string | null
          triggered_obligation:
            | Database["public"]["Enums"]["kyc_triggered_obligation"]
            | null
          updated_at: string
          vc_amount: boolean | null
          vc_amount_confirmed: boolean | null
          vc_client_address: boolean | null
          vc_client_name: boolean | null
          vc_exchange_rate: boolean | null
          vc_exchange_rate_source: boolean | null
          vc_fiat_equivalent: boolean | null
          vc_receiving_wallet: boolean | null
          vc_record_complete: boolean | null
          vc_reference_number: boolean | null
          vc_sending_wallet: boolean | null
          vc_third_party_determination: boolean | null
          vc_type_of_vc: boolean | null
        }
        Insert: {
          address_present?: boolean | null
          cf_consultation_date?: boolean | null
          cf_credit_bureau_name?: boolean | null
          cf_credit_file_number?: boolean | null
          cf_existence_3_years?: boolean | null
          cf_name_address_dob_match?: boolean | null
          cf_two_tradelines?: boolean | null
          cheque_account_holder_name?: boolean | null
          cheque_account_number?: boolean | null
          cheque_account_type?: boolean | null
          cheque_date_cashed?: boolean | null
          cheque_issuer_name?: boolean | null
          cheque_provider_address?: boolean | null
          cheque_provider_dob?: boolean | null
          cheque_provider_name?: boolean | null
          cheque_provider_occupation?: boolean | null
          cheque_reference_number?: boolean | null
          cheque_total_amount?: boolean | null
          cheque_vc_transaction_identifier?: boolean | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          deficiencies?: string | null
          dob_present?: boolean | null
          dp_date_verified?: boolean | null
          dp_document_number?: boolean | null
          dp_document_valid_current?: boolean | null
          dp_information_type?: boolean | null
          dp_person_name?: boolean | null
          dp_two_independent_sources?: boolean | null
          eft_account_details?: boolean | null
          eft_beneficiary_address?: boolean | null
          eft_beneficiary_name?: boolean | null
          eft_date_of_initiation?: boolean | null
          eft_exchange_rate?: boolean | null
          eft_exchange_rate_source?: boolean | null
          eft_fund_type_amount?: boolean | null
          eft_ordering_client_address?: boolean | null
          eft_ordering_client_name?: boolean | null
          eft_receiving_fi?: boolean | null
          eft_record_complete?: boolean | null
          eft_reference_number?: boolean | null
          eft_requesting_client_match_kyc?: boolean | null
          eft_sending_fi?: boolean | null
          enhanced_monitoring_evidenced?: boolean | null
          evidence_file_ids?: string[] | null
          evidence_type?: string | null
          finding_type?: string | null
          id?: string
          id_attr_document_type?: boolean | null
          id_attr_expiry_date?: boolean | null
          id_attr_expiry_na?: boolean | null
          id_attr_identifying_number?: boolean | null
          id_attr_jurisdiction?: boolean | null
          id_attr_person_name?: boolean | null
          id_contains_required_attributes?: boolean | null
          id_valid_at_verification?: boolean | null
          id_verified?: boolean | null
          identification_method?:
            | Database["public"]["Enums"]["kyc_identification_method"]
            | null
          is_transaction_related?: boolean | null
          lctr_24h_aggregation?: boolean | null
          lctr_amount_confirmed?: boolean | null
          lctr_client_address?: boolean | null
          lctr_client_dob?: boolean | null
          lctr_client_name?: boolean | null
          lctr_conductor_address?: boolean | null
          lctr_conductor_name?: boolean | null
          lctr_currency_conversion?: boolean | null
          lctr_occupation?: boolean | null
          lctr_purpose?: boolean | null
          lctr_record_complete?: boolean | null
          lctr_third_party_details?: boolean | null
          lctr_third_party_determination?: boolean | null
          lctr_transaction_time?: boolean | null
          mandatory_test_result?: string | null
          name_present?: boolean | null
          notes?: string | null
          occupation_description?: string | null
          occupation_present?: boolean | null
          occupation_required?: boolean | null
          onboarding_date?: string | null
          overall_result?: string | null
          override_rationale?: string | null
          pep_classified_high_risk?: boolean | null
          pep_determination_date_documented?: boolean | null
          pep_hio_determination_completed?: boolean | null
          pep_hio_identified?: boolean | null
          pep_office_position_documented?: boolean | null
          pep_senior_mgmt_approval?: boolean | null
          pep_senior_mgmt_review_30_days?: boolean | null
          pep_source_of_funds_measures?: boolean | null
          pep_source_of_wealth_measures?: boolean | null
          pep_status_recorded?: boolean | null
          reasonable_measures_result?: string | null
          record_retention_evidenced?: boolean | null
          review_id: string
          risk_rating?: Database["public"]["Enums"]["risk_rating"]
          senior_management_review_completed?: boolean | null
          senior_management_review_within_30_days?: boolean | null
          sole_prop_nature_of_business?: string | null
          source_of_funds_documented?: boolean | null
          source_of_wealth_documented?: boolean | null
          system_finding_type?: string | null
          telephone_present?: boolean | null
          third_party_determination_made?: boolean | null
          third_party_documented?: boolean | null
          third_party_entity_address?: boolean | null
          third_party_entity_incorporation_number?: boolean | null
          third_party_entity_name?: boolean | null
          third_party_entity_nature_of_business?: boolean | null
          third_party_entity_place_of_incorporation?: boolean | null
          third_party_individual_address?: boolean | null
          third_party_individual_dob?: boolean | null
          third_party_individual_name?: boolean | null
          third_party_individual_occupation?: boolean | null
          third_party_relationship_documented?: boolean | null
          third_party_relationship_type?: string | null
          third_party_required?: boolean | null
          third_party_type?: string | null
          transaction_amount?: number | null
          transaction_currency?: string | null
          transaction_date?: string | null
          transaction_type?: string | null
          triggered_obligation?:
            | Database["public"]["Enums"]["kyc_triggered_obligation"]
            | null
          updated_at?: string
          vc_amount?: boolean | null
          vc_amount_confirmed?: boolean | null
          vc_client_address?: boolean | null
          vc_client_name?: boolean | null
          vc_exchange_rate?: boolean | null
          vc_exchange_rate_source?: boolean | null
          vc_fiat_equivalent?: boolean | null
          vc_receiving_wallet?: boolean | null
          vc_record_complete?: boolean | null
          vc_reference_number?: boolean | null
          vc_sending_wallet?: boolean | null
          vc_third_party_determination?: boolean | null
          vc_type_of_vc?: boolean | null
        }
        Update: {
          address_present?: boolean | null
          cf_consultation_date?: boolean | null
          cf_credit_bureau_name?: boolean | null
          cf_credit_file_number?: boolean | null
          cf_existence_3_years?: boolean | null
          cf_name_address_dob_match?: boolean | null
          cf_two_tradelines?: boolean | null
          cheque_account_holder_name?: boolean | null
          cheque_account_number?: boolean | null
          cheque_account_type?: boolean | null
          cheque_date_cashed?: boolean | null
          cheque_issuer_name?: boolean | null
          cheque_provider_address?: boolean | null
          cheque_provider_dob?: boolean | null
          cheque_provider_name?: boolean | null
          cheque_provider_occupation?: boolean | null
          cheque_reference_number?: boolean | null
          cheque_total_amount?: boolean | null
          cheque_vc_transaction_identifier?: boolean | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          deficiencies?: string | null
          dob_present?: boolean | null
          dp_date_verified?: boolean | null
          dp_document_number?: boolean | null
          dp_document_valid_current?: boolean | null
          dp_information_type?: boolean | null
          dp_person_name?: boolean | null
          dp_two_independent_sources?: boolean | null
          eft_account_details?: boolean | null
          eft_beneficiary_address?: boolean | null
          eft_beneficiary_name?: boolean | null
          eft_date_of_initiation?: boolean | null
          eft_exchange_rate?: boolean | null
          eft_exchange_rate_source?: boolean | null
          eft_fund_type_amount?: boolean | null
          eft_ordering_client_address?: boolean | null
          eft_ordering_client_name?: boolean | null
          eft_receiving_fi?: boolean | null
          eft_record_complete?: boolean | null
          eft_reference_number?: boolean | null
          eft_requesting_client_match_kyc?: boolean | null
          eft_sending_fi?: boolean | null
          enhanced_monitoring_evidenced?: boolean | null
          evidence_file_ids?: string[] | null
          evidence_type?: string | null
          finding_type?: string | null
          id?: string
          id_attr_document_type?: boolean | null
          id_attr_expiry_date?: boolean | null
          id_attr_expiry_na?: boolean | null
          id_attr_identifying_number?: boolean | null
          id_attr_jurisdiction?: boolean | null
          id_attr_person_name?: boolean | null
          id_contains_required_attributes?: boolean | null
          id_valid_at_verification?: boolean | null
          id_verified?: boolean | null
          identification_method?:
            | Database["public"]["Enums"]["kyc_identification_method"]
            | null
          is_transaction_related?: boolean | null
          lctr_24h_aggregation?: boolean | null
          lctr_amount_confirmed?: boolean | null
          lctr_client_address?: boolean | null
          lctr_client_dob?: boolean | null
          lctr_client_name?: boolean | null
          lctr_conductor_address?: boolean | null
          lctr_conductor_name?: boolean | null
          lctr_currency_conversion?: boolean | null
          lctr_occupation?: boolean | null
          lctr_purpose?: boolean | null
          lctr_record_complete?: boolean | null
          lctr_third_party_details?: boolean | null
          lctr_third_party_determination?: boolean | null
          lctr_transaction_time?: boolean | null
          mandatory_test_result?: string | null
          name_present?: boolean | null
          notes?: string | null
          occupation_description?: string | null
          occupation_present?: boolean | null
          occupation_required?: boolean | null
          onboarding_date?: string | null
          overall_result?: string | null
          override_rationale?: string | null
          pep_classified_high_risk?: boolean | null
          pep_determination_date_documented?: boolean | null
          pep_hio_determination_completed?: boolean | null
          pep_hio_identified?: boolean | null
          pep_office_position_documented?: boolean | null
          pep_senior_mgmt_approval?: boolean | null
          pep_senior_mgmt_review_30_days?: boolean | null
          pep_source_of_funds_measures?: boolean | null
          pep_source_of_wealth_measures?: boolean | null
          pep_status_recorded?: boolean | null
          reasonable_measures_result?: string | null
          record_retention_evidenced?: boolean | null
          review_id?: string
          risk_rating?: Database["public"]["Enums"]["risk_rating"]
          senior_management_review_completed?: boolean | null
          senior_management_review_within_30_days?: boolean | null
          sole_prop_nature_of_business?: string | null
          source_of_funds_documented?: boolean | null
          source_of_wealth_documented?: boolean | null
          system_finding_type?: string | null
          telephone_present?: boolean | null
          third_party_determination_made?: boolean | null
          third_party_documented?: boolean | null
          third_party_entity_address?: boolean | null
          third_party_entity_incorporation_number?: boolean | null
          third_party_entity_name?: boolean | null
          third_party_entity_nature_of_business?: boolean | null
          third_party_entity_place_of_incorporation?: boolean | null
          third_party_individual_address?: boolean | null
          third_party_individual_dob?: boolean | null
          third_party_individual_name?: boolean | null
          third_party_individual_occupation?: boolean | null
          third_party_relationship_documented?: boolean | null
          third_party_relationship_type?: string | null
          third_party_required?: boolean | null
          third_party_type?: string | null
          transaction_amount?: number | null
          transaction_currency?: string | null
          transaction_date?: string | null
          transaction_type?: string | null
          triggered_obligation?:
            | Database["public"]["Enums"]["kyc_triggered_obligation"]
            | null
          updated_at?: string
          vc_amount?: boolean | null
          vc_amount_confirmed?: boolean | null
          vc_client_address?: boolean | null
          vc_client_name?: boolean | null
          vc_exchange_rate?: boolean | null
          vc_exchange_rate_source?: boolean | null
          vc_fiat_equivalent?: boolean | null
          vc_receiving_wallet?: boolean | null
          vc_record_complete?: boolean | null
          vc_reference_number?: boolean | null
          vc_sending_wallet?: boolean | null
          vc_third_party_determination?: boolean | null
          vc_type_of_vc?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "kyc_individual_samples_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "kyc_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_issues: {
        Row: {
          auto_flag_reason: string | null
          business_sample_id: string | null
          created_at: string
          evidence_file_ids: string[] | null
          id: string
          individual_sample_id: string | null
          is_auto_generated: boolean | null
          issue_category: string
          issue_description: string | null
          issue_title: string
          management_response: string | null
          recommendation: string | null
          review_id: string
          severity: Database["public"]["Enums"]["kyc_issue_severity"]
          status: Database["public"]["Enums"]["kyc_issue_status"]
          target_completion_date: string | null
          transaction_sample_id: string | null
          updated_at: string
        }
        Insert: {
          auto_flag_reason?: string | null
          business_sample_id?: string | null
          created_at?: string
          evidence_file_ids?: string[] | null
          id?: string
          individual_sample_id?: string | null
          is_auto_generated?: boolean | null
          issue_category: string
          issue_description?: string | null
          issue_title: string
          management_response?: string | null
          recommendation?: string | null
          review_id: string
          severity?: Database["public"]["Enums"]["kyc_issue_severity"]
          status?: Database["public"]["Enums"]["kyc_issue_status"]
          target_completion_date?: string | null
          transaction_sample_id?: string | null
          updated_at?: string
        }
        Update: {
          auto_flag_reason?: string | null
          business_sample_id?: string | null
          created_at?: string
          evidence_file_ids?: string[] | null
          id?: string
          individual_sample_id?: string | null
          is_auto_generated?: boolean | null
          issue_category?: string
          issue_description?: string | null
          issue_title?: string
          management_response?: string | null
          recommendation?: string | null
          review_id?: string
          severity?: Database["public"]["Enums"]["kyc_issue_severity"]
          status?: Database["public"]["Enums"]["kyc_issue_status"]
          target_completion_date?: string | null
          transaction_sample_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kyc_issues_business_sample_id_fkey"
            columns: ["business_sample_id"]
            isOneToOne: false
            referencedRelation: "kyc_business_samples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kyc_issues_individual_sample_id_fkey"
            columns: ["individual_sample_id"]
            isOneToOne: false
            referencedRelation: "kyc_individual_samples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kyc_issues_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "kyc_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kyc_issues_transaction_sample_id_fkey"
            columns: ["transaction_sample_id"]
            isOneToOne: false
            referencedRelation: "kyc_transaction_samples"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_reviews: {
        Row: {
          business_population_size: number | null
          business_sample_size: number | null
          business_sample_source:
            | Database["public"]["Enums"]["kyc_sample_source"]
            | null
          business_sample_sources: string[] | null
          business_selection_rationale: string | null
          created_at: string
          engagement_id: string
          finalized_at: string | null
          finalized_by: string | null
          id: string
          individual_population_size: number | null
          individual_sample_size: number | null
          individual_sample_source:
            | Database["public"]["Enums"]["kyc_sample_source"]
            | null
          individual_sample_sources: string[] | null
          individual_selection_rationale: string | null
          last_unlocked_at: string | null
          last_unlocked_by: string | null
          lock_state: string
          notes: string | null
          review_period_end: string | null
          review_period_start: string | null
          reviewer_name: string | null
          status: string
          unlock_count: number
          updated_at: string
        }
        Insert: {
          business_population_size?: number | null
          business_sample_size?: number | null
          business_sample_source?:
            | Database["public"]["Enums"]["kyc_sample_source"]
            | null
          business_sample_sources?: string[] | null
          business_selection_rationale?: string | null
          created_at?: string
          engagement_id: string
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          individual_population_size?: number | null
          individual_sample_size?: number | null
          individual_sample_source?:
            | Database["public"]["Enums"]["kyc_sample_source"]
            | null
          individual_sample_sources?: string[] | null
          individual_selection_rationale?: string | null
          last_unlocked_at?: string | null
          last_unlocked_by?: string | null
          lock_state?: string
          notes?: string | null
          review_period_end?: string | null
          review_period_start?: string | null
          reviewer_name?: string | null
          status?: string
          unlock_count?: number
          updated_at?: string
        }
        Update: {
          business_population_size?: number | null
          business_sample_size?: number | null
          business_sample_source?:
            | Database["public"]["Enums"]["kyc_sample_source"]
            | null
          business_sample_sources?: string[] | null
          business_selection_rationale?: string | null
          created_at?: string
          engagement_id?: string
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          individual_population_size?: number | null
          individual_sample_size?: number | null
          individual_sample_source?:
            | Database["public"]["Enums"]["kyc_sample_source"]
            | null
          individual_sample_sources?: string[] | null
          individual_selection_rationale?: string | null
          last_unlocked_at?: string | null
          last_unlocked_by?: string | null
          lock_state?: string
          notes?: string | null
          review_period_end?: string | null
          review_period_start?: string | null
          reviewer_name?: string | null
          status?: string
          unlock_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kyc_reviews_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: true
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_sample_evidence: {
        Row: {
          business_sample_id: string | null
          content_type: string | null
          file_size: number | null
          filename: string
          id: string
          individual_sample_id: string | null
          notes: string | null
          page_label: string | null
          storage_path: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          business_sample_id?: string | null
          content_type?: string | null
          file_size?: number | null
          filename: string
          id?: string
          individual_sample_id?: string | null
          notes?: string | null
          page_label?: string | null
          storage_path: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          business_sample_id?: string | null
          content_type?: string | null
          file_size?: number | null
          filename?: string
          id?: string
          individual_sample_id?: string | null
          notes?: string | null
          page_label?: string | null
          storage_path?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kyc_sample_evidence_business_sample_id_fkey"
            columns: ["business_sample_id"]
            isOneToOne: false
            referencedRelation: "kyc_business_samples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kyc_sample_evidence_individual_sample_id_fkey"
            columns: ["individual_sample_id"]
            isOneToOne: false
            referencedRelation: "kyc_individual_samples"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_samples: {
        Row: {
          created_at: string
          customer_id: string | null
          customer_name: string | null
          deficiencies: string | null
          engagement_id: string
          evidence_ids: string[] | null
          id: string
          notes: string | null
          onboarding_date: string | null
          risk_rating: string | null
          sample_type: string
          test_result: string | null
          updated_at: string
          verification_method: string | null
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          deficiencies?: string | null
          engagement_id: string
          evidence_ids?: string[] | null
          id?: string
          notes?: string | null
          onboarding_date?: string | null
          risk_rating?: string | null
          sample_type: string
          test_result?: string | null
          updated_at?: string
          verification_method?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          deficiencies?: string | null
          engagement_id?: string
          evidence_ids?: string[] | null
          id?: string
          notes?: string | null
          onboarding_date?: string | null
          risk_rating?: string | null
          sample_type?: string
          test_result?: string | null
          updated_at?: string
          verification_method?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kyc_samples_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_transaction_samples: {
        Row: {
          created_at: string
          currency: string | null
          customer_risk_rating:
            | Database["public"]["Enums"]["risk_rating"]
            | null
          deficiencies: string | null
          eft_record_complete: boolean | null
          evidence_file_ids: string[] | null
          id: string
          kyc_file_current: boolean | null
          kyc_file_linked: boolean | null
          lctr_record_complete: boolean | null
          linked_customer_id: string | null
          linked_customer_name: string | null
          notes: string | null
          occupation_obtained: boolean | null
          occupation_required: boolean | null
          review_id: string
          test_result: string | null
          third_party_documented: boolean | null
          third_party_required: boolean | null
          transaction_amount: number | null
          transaction_date: string | null
          transaction_id: string | null
          transaction_type: string | null
          updated_at: string
          vc_record_complete: boolean | null
        }
        Insert: {
          created_at?: string
          currency?: string | null
          customer_risk_rating?:
            | Database["public"]["Enums"]["risk_rating"]
            | null
          deficiencies?: string | null
          eft_record_complete?: boolean | null
          evidence_file_ids?: string[] | null
          id?: string
          kyc_file_current?: boolean | null
          kyc_file_linked?: boolean | null
          lctr_record_complete?: boolean | null
          linked_customer_id?: string | null
          linked_customer_name?: string | null
          notes?: string | null
          occupation_obtained?: boolean | null
          occupation_required?: boolean | null
          review_id: string
          test_result?: string | null
          third_party_documented?: boolean | null
          third_party_required?: boolean | null
          transaction_amount?: number | null
          transaction_date?: string | null
          transaction_id?: string | null
          transaction_type?: string | null
          updated_at?: string
          vc_record_complete?: boolean | null
        }
        Update: {
          created_at?: string
          currency?: string | null
          customer_risk_rating?:
            | Database["public"]["Enums"]["risk_rating"]
            | null
          deficiencies?: string | null
          eft_record_complete?: boolean | null
          evidence_file_ids?: string[] | null
          id?: string
          kyc_file_current?: boolean | null
          kyc_file_linked?: boolean | null
          lctr_record_complete?: boolean | null
          linked_customer_id?: string | null
          linked_customer_name?: string | null
          notes?: string | null
          occupation_obtained?: boolean | null
          occupation_required?: boolean | null
          review_id?: string
          test_result?: string | null
          third_party_documented?: boolean | null
          third_party_required?: boolean | null
          transaction_amount?: number | null
          transaction_date?: string | null
          transaction_id?: string | null
          transaction_type?: string | null
          updated_at?: string
          vc_record_complete?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "kyc_transaction_samples_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "kyc_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      module_status: {
        Row: {
          engagement_id: string
          id: string
          locked_at: string | null
          locked_by: string | null
          module_name: string
          percent_complete: number | null
          status: string
          submodule_name: string | null
          updated_at: string
        }
        Insert: {
          engagement_id: string
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          module_name: string
          percent_complete?: number | null
          status?: string
          submodule_name?: string | null
          updated_at?: string
        }
        Update: {
          engagement_id?: string
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          module_name?: string
          percent_complete?: number | null
          status?: string
          submodule_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_status_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      msb_change_detection: {
        Row: {
          activities_30day_result: string | null
          activities_notes: string | null
          address_30day_result: string | null
          address_notes: string | null
          agents_30day_result: string | null
          agents_branches_changed: boolean | null
          agents_notes: string | null
          authorized_persons_30day_result: string | null
          authorized_persons_changed: boolean | null
          authorized_persons_notes: string | null
          banking_30day_result: string | null
          banking_notes: string | null
          banking_relationships_changed: boolean | null
          board_30day_result: string | null
          board_notes: string | null
          board_of_directors_changed: boolean | null
          business_activities_changed: boolean | null
          category_sources: Json
          compliance_officer_30day_result: string | null
          compliance_officer_changed: boolean | null
          compliance_officer_notes: string | null
          created_at: string
          evidence_ids: string[] | null
          head_office_address_changed: boolean | null
          id: string
          management_30day_result: string | null
          management_notes: string | null
          notification_30_day_notes: string | null
          notification_30_day_result: string | null
          registration_id: string
          senior_management_changed: boolean | null
          shareholders_30day_result: string | null
          shareholders_changed: boolean | null
          shareholders_notes: string | null
          updated_at: string
        }
        Insert: {
          activities_30day_result?: string | null
          activities_notes?: string | null
          address_30day_result?: string | null
          address_notes?: string | null
          agents_30day_result?: string | null
          agents_branches_changed?: boolean | null
          agents_notes?: string | null
          authorized_persons_30day_result?: string | null
          authorized_persons_changed?: boolean | null
          authorized_persons_notes?: string | null
          banking_30day_result?: string | null
          banking_notes?: string | null
          banking_relationships_changed?: boolean | null
          board_30day_result?: string | null
          board_notes?: string | null
          board_of_directors_changed?: boolean | null
          business_activities_changed?: boolean | null
          category_sources?: Json
          compliance_officer_30day_result?: string | null
          compliance_officer_changed?: boolean | null
          compliance_officer_notes?: string | null
          created_at?: string
          evidence_ids?: string[] | null
          head_office_address_changed?: boolean | null
          id?: string
          management_30day_result?: string | null
          management_notes?: string | null
          notification_30_day_notes?: string | null
          notification_30_day_result?: string | null
          registration_id: string
          senior_management_changed?: boolean | null
          shareholders_30day_result?: string | null
          shareholders_changed?: boolean | null
          shareholders_notes?: string | null
          updated_at?: string
        }
        Update: {
          activities_30day_result?: string | null
          activities_notes?: string | null
          address_30day_result?: string | null
          address_notes?: string | null
          agents_30day_result?: string | null
          agents_branches_changed?: boolean | null
          agents_notes?: string | null
          authorized_persons_30day_result?: string | null
          authorized_persons_changed?: boolean | null
          authorized_persons_notes?: string | null
          banking_30day_result?: string | null
          banking_notes?: string | null
          banking_relationships_changed?: boolean | null
          board_30day_result?: string | null
          board_notes?: string | null
          board_of_directors_changed?: boolean | null
          business_activities_changed?: boolean | null
          category_sources?: Json
          compliance_officer_30day_result?: string | null
          compliance_officer_changed?: boolean | null
          compliance_officer_notes?: string | null
          created_at?: string
          evidence_ids?: string[] | null
          head_office_address_changed?: boolean | null
          id?: string
          management_30day_result?: string | null
          management_notes?: string | null
          notification_30_day_notes?: string | null
          notification_30_day_result?: string | null
          registration_id?: string
          senior_management_changed?: boolean | null
          shareholders_30day_result?: string | null
          shareholders_changed?: boolean | null
          shareholders_notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "msb_change_detection_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: true
            referencedRelation: "msb_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      msb_notification_assessment: {
        Row: {
          change_category: string
          change_date: string | null
          created_at: string
          days_to_notify: number | null
          evidence_ids: string[] | null
          evidence_type: string | null
          id: string
          is_timely: boolean | null
          judgment_explanation: string | null
          notes: string | null
          notification_date: string | null
          notification_method: string | null
          registration_id: string
          requires_notification: string | null
          updated_at: string
        }
        Insert: {
          change_category: string
          change_date?: string | null
          created_at?: string
          days_to_notify?: number | null
          evidence_ids?: string[] | null
          evidence_type?: string | null
          id?: string
          is_timely?: boolean | null
          judgment_explanation?: string | null
          notes?: string | null
          notification_date?: string | null
          notification_method?: string | null
          registration_id: string
          requires_notification?: string | null
          updated_at?: string
        }
        Update: {
          change_category?: string
          change_date?: string | null
          created_at?: string
          days_to_notify?: number | null
          evidence_ids?: string[] | null
          evidence_type?: string | null
          id?: string
          is_timely?: boolean | null
          judgment_explanation?: string | null
          notes?: string | null
          notification_date?: string | null
          notification_method?: string | null
          registration_id?: string
          requires_notification?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "msb_notification_assessment_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "msb_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      msb_quebec_nexus_triage: {
        Row: {
          created_at: string
          engagement_id: string
          has_physical_presence_qc: string | null
          id: string
          is_registered_with_rq: boolean | null
          registration_id: string
          serves_quebec_id_clients: string | null
          targets_quebec_residents: string | null
          triage_completed: boolean | null
          triage_notes: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          engagement_id: string
          has_physical_presence_qc?: string | null
          id?: string
          is_registered_with_rq?: boolean | null
          registration_id: string
          serves_quebec_id_clients?: string | null
          targets_quebec_residents?: string | null
          triage_completed?: boolean | null
          triage_notes?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          engagement_id?: string
          has_physical_presence_qc?: string | null
          id?: string
          is_registered_with_rq?: boolean | null
          registration_id?: string
          serves_quebec_id_clients?: string | null
          targets_quebec_residents?: string | null
          triage_completed?: boolean | null
          triage_notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "msb_quebec_nexus_triage_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: true
            referencedRelation: "msb_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      msb_registrations: {
        Row: {
          agency_locations: string | null
          business_address: string | null
          channel_of_delivery: string | null
          compliance_officer_name: string | null
          created_at: string
          date_of_incorporation: string | null
          engagement_id: string
          expiry_date: string | null
          id: string
          incorporation_number: string | null
          initial_registration_date: string | null
          internal_notes: string | null
          jurisdiction_of_incorporation: string | null
          last_verified_date: string | null
          msb_activities: string[] | null
          msb_name: string | null
          msb_status: string | null
          qc_atms: string | null
          qc_authorized_services: string[] | null
          qc_branches: string | null
          qc_crypto_atms: string | null
          qc_licence_number: string | null
          qc_mandataries: string | null
          qc_other_names: string[] | null
          registration_number: string | null
          registration_type: string
          trade_name: string | null
          updated_at: string
          verified_by: string | null
          website_address: string | null
        }
        Insert: {
          agency_locations?: string | null
          business_address?: string | null
          channel_of_delivery?: string | null
          compliance_officer_name?: string | null
          created_at?: string
          date_of_incorporation?: string | null
          engagement_id: string
          expiry_date?: string | null
          id?: string
          incorporation_number?: string | null
          initial_registration_date?: string | null
          internal_notes?: string | null
          jurisdiction_of_incorporation?: string | null
          last_verified_date?: string | null
          msb_activities?: string[] | null
          msb_name?: string | null
          msb_status?: string | null
          qc_atms?: string | null
          qc_authorized_services?: string[] | null
          qc_branches?: string | null
          qc_crypto_atms?: string | null
          qc_licence_number?: string | null
          qc_mandataries?: string | null
          qc_other_names?: string[] | null
          registration_number?: string | null
          registration_type: string
          trade_name?: string | null
          updated_at?: string
          verified_by?: string | null
          website_address?: string | null
        }
        Update: {
          agency_locations?: string | null
          business_address?: string | null
          channel_of_delivery?: string | null
          compliance_officer_name?: string | null
          created_at?: string
          date_of_incorporation?: string | null
          engagement_id?: string
          expiry_date?: string | null
          id?: string
          incorporation_number?: string | null
          initial_registration_date?: string | null
          internal_notes?: string | null
          jurisdiction_of_incorporation?: string | null
          last_verified_date?: string | null
          msb_activities?: string[] | null
          msb_name?: string | null
          msb_status?: string | null
          qc_atms?: string | null
          qc_authorized_services?: string[] | null
          qc_branches?: string | null
          qc_crypto_atms?: string | null
          qc_licence_number?: string | null
          qc_mandataries?: string | null
          qc_other_names?: string[] | null
          registration_number?: string | null
          registration_type?: string
          trade_name?: string | null
          updated_at?: string
          verified_by?: string | null
          website_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "msb_registrations_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      msb_registry_screenshots: {
        Row: {
          created_at: string
          engagement_id: string
          file_size: number | null
          file_type: string | null
          filename: string
          id: string
          registration_id: string
          reviewer_note: string | null
          search_date: string | null
          storage_path: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          engagement_id: string
          file_size?: number | null
          file_type?: string | null
          filename: string
          id?: string
          registration_id: string
          reviewer_note?: string | null
          search_date?: string | null
          storage_path: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          engagement_id?: string
          file_size?: number | null
          file_type?: string | null
          filename?: string
          id?: string
          registration_id?: string
          reviewer_note?: string | null
          search_date?: string | null
          storage_path?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "msb_registry_screenshots_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "msb_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      msb_review_checklist: {
        Row: {
          answer: string | null
          commentary: string | null
          created_at: string
          evidence_ids: string[] | null
          id: string
          question_text: string
          registration_id: string
          section: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          answer?: string | null
          commentary?: string | null
          created_at?: string
          evidence_ids?: string[] | null
          id?: string
          question_text: string
          registration_id: string
          section: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          answer?: string | null
          commentary?: string | null
          created_at?: string
          evidence_ids?: string[] | null
          id?: string
          question_text?: string
          registration_id?: string
          section?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "msb_review_checklist_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "msb_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      msb_status_validation: {
        Row: {
          cessation_notes: string | null
          cessation_reported: string | null
          changes_30day_notes: string | null
          changes_reported_within_30_days: string | null
          created_at: string
          fintrac_consistency_notes: string | null
          fintrac_consistency_result: string | null
          fintrac_forms_notes: string | null
          fintrac_forms_obtained: string | null
          fintrac_info_complete: string | null
          fintrac_info_notes: string | null
          fintrac_requests_notes: string | null
          fintrac_requests_responded: string | null
          id: string
          internal_docs_evidence_ids: string[] | null
          post_submission_changes_reported: string | null
          post_submission_notes: string | null
          registration_active_not_expired: string | null
          registration_confirmed_on_website: string | null
          registration_id: string
          registration_matches_internal_docs: string | null
          renewal_completed_on_time: string | null
          renewal_evidence_ids: string[] | null
          status_evidence_ids: string[] | null
          undisclosed_changes_identified: string | null
          undisclosed_changes_notes: string | null
          updated_at: string
          validation_notes: string | null
          website_evidence_ids: string[] | null
        }
        Insert: {
          cessation_notes?: string | null
          cessation_reported?: string | null
          changes_30day_notes?: string | null
          changes_reported_within_30_days?: string | null
          created_at?: string
          fintrac_consistency_notes?: string | null
          fintrac_consistency_result?: string | null
          fintrac_forms_notes?: string | null
          fintrac_forms_obtained?: string | null
          fintrac_info_complete?: string | null
          fintrac_info_notes?: string | null
          fintrac_requests_notes?: string | null
          fintrac_requests_responded?: string | null
          id?: string
          internal_docs_evidence_ids?: string[] | null
          post_submission_changes_reported?: string | null
          post_submission_notes?: string | null
          registration_active_not_expired?: string | null
          registration_confirmed_on_website?: string | null
          registration_id: string
          registration_matches_internal_docs?: string | null
          renewal_completed_on_time?: string | null
          renewal_evidence_ids?: string[] | null
          status_evidence_ids?: string[] | null
          undisclosed_changes_identified?: string | null
          undisclosed_changes_notes?: string | null
          updated_at?: string
          validation_notes?: string | null
          website_evidence_ids?: string[] | null
        }
        Update: {
          cessation_notes?: string | null
          cessation_reported?: string | null
          changes_30day_notes?: string | null
          changes_reported_within_30_days?: string | null
          created_at?: string
          fintrac_consistency_notes?: string | null
          fintrac_consistency_result?: string | null
          fintrac_forms_notes?: string | null
          fintrac_forms_obtained?: string | null
          fintrac_info_complete?: string | null
          fintrac_info_notes?: string | null
          fintrac_requests_notes?: string | null
          fintrac_requests_responded?: string | null
          id?: string
          internal_docs_evidence_ids?: string[] | null
          post_submission_changes_reported?: string | null
          post_submission_notes?: string | null
          registration_active_not_expired?: string | null
          registration_confirmed_on_website?: string | null
          registration_id?: string
          registration_matches_internal_docs?: string | null
          renewal_completed_on_time?: string | null
          renewal_evidence_ids?: string[] | null
          status_evidence_ids?: string[] | null
          undisclosed_changes_identified?: string | null
          undisclosed_changes_notes?: string | null
          updated_at?: string
          validation_notes?: string | null
          website_evidence_ids?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "msb_status_validation_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: true
            referencedRelation: "msb_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      msb_validation_evidence: {
        Row: {
          content_type: string | null
          file_size: number | null
          filename: string
          id: string
          item_key: string
          registration_id: string
          storage_path: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          content_type?: string | null
          file_size?: number | null
          filename: string
          id?: string
          item_key: string
          registration_id: string
          storage_path: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          content_type?: string | null
          file_size?: number | null
          filename?: string
          id?: string
          item_key?: string
          registration_id?: string
          storage_path?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "msb_validation_evidence_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "msb_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      rba_client_segments: {
        Row: {
          created_at: string
          enhanced_monitoring_frequency: string | null
          evidence_file_ids: string[] | null
          geography_exposure: string[] | null
          id: string
          inherent_risk_rating: Database["public"]["Enums"]["risk_rating"]
          key_risk_indicators: string[] | null
          prescribed_measures_applied: string | null
          products_used: string[] | null
          review_id: string
          segment_name: string
          segment_type: Database["public"]["Enums"]["rba_segment_type"]
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          enhanced_monitoring_frequency?: string | null
          evidence_file_ids?: string[] | null
          geography_exposure?: string[] | null
          id?: string
          inherent_risk_rating: Database["public"]["Enums"]["risk_rating"]
          key_risk_indicators?: string[] | null
          prescribed_measures_applied?: string | null
          products_used?: string[] | null
          review_id: string
          segment_name: string
          segment_type: Database["public"]["Enums"]["rba_segment_type"]
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          enhanced_monitoring_frequency?: string | null
          evidence_file_ids?: string[] | null
          geography_exposure?: string[] | null
          id?: string
          inherent_risk_rating?: Database["public"]["Enums"]["risk_rating"]
          key_risk_indicators?: string[] | null
          prescribed_measures_applied?: string | null
          products_used?: string[] | null
          review_id?: string
          segment_name?: string
          segment_type?: Database["public"]["Enums"]["rba_segment_type"]
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rba_client_segments_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "risk_assessment_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      rba_evidence: {
        Row: {
          created_at: string
          description: string | null
          evidence_type: string
          file_id: string | null
          file_name: string
          id: string
          is_provided: boolean | null
          is_required: boolean | null
          review_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          evidence_type: string
          file_id?: string | null
          file_name: string
          id?: string
          is_provided?: boolean | null
          is_required?: boolean | null
          review_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          evidence_type?: string
          file_id?: string | null
          file_name?: string
          id?: string
          is_provided?: boolean | null
          is_required?: boolean | null
          review_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rba_evidence_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "evidence_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rba_evidence_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "risk_assessment_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      rba_issues: {
        Row: {
          created_at: string
          engagement_id: string
          evidence_file_ids: string[] | null
          id: string
          is_auto_generated: boolean | null
          issue_category: string | null
          management_response: string | null
          observation: string | null
          recommendation: string | null
          review_id: string
          severity: Database["public"]["Enums"]["rba_issue_severity"]
          source_response_id: string | null
          source_risk_factor_id: string | null
          source_segment_id: string | null
          status: string
          target_completion_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          engagement_id: string
          evidence_file_ids?: string[] | null
          id?: string
          is_auto_generated?: boolean | null
          issue_category?: string | null
          management_response?: string | null
          observation?: string | null
          recommendation?: string | null
          review_id: string
          severity?: Database["public"]["Enums"]["rba_issue_severity"]
          source_response_id?: string | null
          source_risk_factor_id?: string | null
          source_segment_id?: string | null
          status?: string
          target_completion_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          engagement_id?: string
          evidence_file_ids?: string[] | null
          id?: string
          is_auto_generated?: boolean | null
          issue_category?: string | null
          management_response?: string | null
          observation?: string | null
          recommendation?: string | null
          review_id?: string
          severity?: Database["public"]["Enums"]["rba_issue_severity"]
          source_response_id?: string | null
          source_risk_factor_id?: string | null
          source_segment_id?: string | null
          status?: string
          target_completion_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rba_issues_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rba_issues_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "risk_assessment_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rba_issues_source_response_id_fkey"
            columns: ["source_response_id"]
            isOneToOne: false
            referencedRelation: "rba_responses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rba_issues_source_risk_factor_id_fkey"
            columns: ["source_risk_factor_id"]
            isOneToOne: false
            referencedRelation: "rba_risk_factors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rba_issues_source_segment_id_fkey"
            columns: ["source_segment_id"]
            isOneToOne: false
            referencedRelation: "rba_client_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      rba_question_templates: {
        Row: {
          applies_to_modes: string[] | null
          auto_flag_condition: Json | null
          auto_flag_description: string | null
          auto_flag_severity:
            | Database["public"]["Enums"]["rba_issue_severity"]
            | null
          auto_flag_title: string | null
          auto_recommendation: string | null
          created_at: string
          evidence_description: string | null
          evidence_required_condition: Json | null
          guidance: string | null
          id: string
          is_active: boolean | null
          question_number: number
          question_text: string
          regulatory_reference: string | null
          response_options: Json | null
          response_type: string
          section: number
          section_name: string
          sort_order: number | null
        }
        Insert: {
          applies_to_modes?: string[] | null
          auto_flag_condition?: Json | null
          auto_flag_description?: string | null
          auto_flag_severity?:
            | Database["public"]["Enums"]["rba_issue_severity"]
            | null
          auto_flag_title?: string | null
          auto_recommendation?: string | null
          created_at?: string
          evidence_description?: string | null
          evidence_required_condition?: Json | null
          guidance?: string | null
          id?: string
          is_active?: boolean | null
          question_number: number
          question_text: string
          regulatory_reference?: string | null
          response_options?: Json | null
          response_type?: string
          section: number
          section_name: string
          sort_order?: number | null
        }
        Update: {
          applies_to_modes?: string[] | null
          auto_flag_condition?: Json | null
          auto_flag_description?: string | null
          auto_flag_severity?:
            | Database["public"]["Enums"]["rba_issue_severity"]
            | null
          auto_flag_title?: string | null
          auto_recommendation?: string | null
          created_at?: string
          evidence_description?: string | null
          evidence_required_condition?: Json | null
          guidance?: string | null
          id?: string
          is_active?: boolean | null
          question_number?: number
          question_text?: string
          regulatory_reference?: string | null
          response_options?: Json | null
          response_type?: string
          section?: number
          section_name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      rba_responses: {
        Row: {
          auto_flag: boolean | null
          auto_flag_reason: string | null
          created_at: string
          doc_reference: string | null
          evidence_file_ids: string[] | null
          id: string
          question_id: string | null
          question_number: number
          question_text: string
          response: string | null
          response_details: string | null
          review_id: string
          section: number
          updated_at: string
        }
        Insert: {
          auto_flag?: boolean | null
          auto_flag_reason?: string | null
          created_at?: string
          doc_reference?: string | null
          evidence_file_ids?: string[] | null
          id?: string
          question_id?: string | null
          question_number: number
          question_text: string
          response?: string | null
          response_details?: string | null
          review_id: string
          section: number
          updated_at?: string
        }
        Update: {
          auto_flag?: boolean | null
          auto_flag_reason?: string | null
          created_at?: string
          doc_reference?: string | null
          evidence_file_ids?: string[] | null
          id?: string
          question_id?: string | null
          question_number?: number
          question_text?: string
          response?: string | null
          response_details?: string | null
          review_id?: string
          section?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rba_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "rba_question_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rba_responses_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "risk_assessment_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      rba_risk_factors: {
        Row: {
          category: Database["public"]["Enums"]["rba_risk_factor_category"]
          created_at: string
          evidence_file_ids: string[] | null
          evidence_url: string | null
          existing_controls: string | null
          id: string
          inherent_risk_rating: Database["public"]["Enums"]["risk_rating"]
          is_high_risk: boolean | null
          rationale: string | null
          residual_risk_rating:
            | Database["public"]["Enums"]["risk_rating"]
            | null
          review_id: string
          risk_factor_name: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["rba_risk_factor_category"]
          created_at?: string
          evidence_file_ids?: string[] | null
          evidence_url?: string | null
          existing_controls?: string | null
          id?: string
          inherent_risk_rating: Database["public"]["Enums"]["risk_rating"]
          is_high_risk?: boolean | null
          rationale?: string | null
          residual_risk_rating?:
            | Database["public"]["Enums"]["risk_rating"]
            | null
          review_id: string
          risk_factor_name: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["rba_risk_factor_category"]
          created_at?: string
          evidence_file_ids?: string[] | null
          evidence_url?: string | null
          existing_controls?: string | null
          id?: string
          inherent_risk_rating?: Database["public"]["Enums"]["risk_rating"]
          is_high_risk?: boolean | null
          rationale?: string | null
          residual_risk_rating?:
            | Database["public"]["Enums"]["risk_rating"]
            | null
          review_id?: string
          risk_factor_name?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rba_risk_factors_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "risk_assessment_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendations: {
        Row: {
          created_at: string
          finding_id: string
          id: string
          management_response: string | null
          owner: string | null
          recommendation_text: string
          status: string
          target_date: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          finding_id: string
          id?: string
          management_response?: string | null
          owner?: string | null
          recommendation_text: string
          status?: string
          target_date?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          finding_id?: string
          id?: string
          management_response?: string | null
          owner?: string | null
          recommendation_text?: string
          status?: string
          target_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_finding_id_fkey"
            columns: ["finding_id"]
            isOneToOne: false
            referencedRelation: "findings"
            referencedColumns: ["id"]
          },
        ]
      }
      reporting_findings: {
        Row: {
          auto_flag_reason: string | null
          created_at: string
          engagement_id: string
          evidence_file_ids: string[] | null
          finding_description: string | null
          finding_title: string
          id: string
          is_auto_generated: boolean | null
          issue_category: string
          management_response: string | null
          recommendation: string | null
          report_type: string
          review_id: string | null
          root_cause: string | null
          sample_id: string | null
          severity: string
          status: string
          target_completion_date: string | null
          updated_at: string
        }
        Insert: {
          auto_flag_reason?: string | null
          created_at?: string
          engagement_id: string
          evidence_file_ids?: string[] | null
          finding_description?: string | null
          finding_title: string
          id?: string
          is_auto_generated?: boolean | null
          issue_category: string
          management_response?: string | null
          recommendation?: string | null
          report_type: string
          review_id?: string | null
          root_cause?: string | null
          sample_id?: string | null
          severity?: string
          status?: string
          target_completion_date?: string | null
          updated_at?: string
        }
        Update: {
          auto_flag_reason?: string | null
          created_at?: string
          engagement_id?: string
          evidence_file_ids?: string[] | null
          finding_description?: string | null
          finding_title?: string
          id?: string
          is_auto_generated?: boolean | null
          issue_category?: string
          management_response?: string | null
          recommendation?: string | null
          report_type?: string
          review_id?: string | null
          root_cause?: string | null
          sample_id?: string | null
          severity?: string
          status?: string
          target_completion_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reporting_findings_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reporting_findings_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reporting_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reporting_findings_sample_id_fkey"
            columns: ["sample_id"]
            isOneToOne: false
            referencedRelation: "reporting_samples"
            referencedColumns: ["id"]
          },
        ]
      }
      reporting_governance: {
        Row: {
          created_at: string
          escalation_evidence_ids: string[] | null
          escalation_notes: string | null
          escalation_process_documented: boolean | null
          escalation_roles_defined: boolean | null
          escalation_timelines_defined: boolean | null
          id: string
          overall_assessment: string | null
          procedures_cover_escalation: boolean | null
          procedures_cover_filing: boolean | null
          procedures_cover_identification: boolean | null
          procedures_documented: boolean | null
          procedures_evidence_ids: string[] | null
          procedures_notes: string | null
          qa_covers_accuracy: boolean | null
          qa_covers_completeness: boolean | null
          qa_covers_timeliness: boolean | null
          qa_evidence_ids: string[] | null
          qa_frequency: string | null
          qa_notes: string | null
          qa_process_exists: boolean | null
          review_id: string
          summary_narrative: string | null
          training_covers_reporting_types: boolean | null
          training_evidence_ids: string[] | null
          training_notes: string | null
          training_program_exists: boolean | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          escalation_evidence_ids?: string[] | null
          escalation_notes?: string | null
          escalation_process_documented?: boolean | null
          escalation_roles_defined?: boolean | null
          escalation_timelines_defined?: boolean | null
          id?: string
          overall_assessment?: string | null
          procedures_cover_escalation?: boolean | null
          procedures_cover_filing?: boolean | null
          procedures_cover_identification?: boolean | null
          procedures_documented?: boolean | null
          procedures_evidence_ids?: string[] | null
          procedures_notes?: string | null
          qa_covers_accuracy?: boolean | null
          qa_covers_completeness?: boolean | null
          qa_covers_timeliness?: boolean | null
          qa_evidence_ids?: string[] | null
          qa_frequency?: string | null
          qa_notes?: string | null
          qa_process_exists?: boolean | null
          review_id: string
          summary_narrative?: string | null
          training_covers_reporting_types?: boolean | null
          training_evidence_ids?: string[] | null
          training_notes?: string | null
          training_program_exists?: boolean | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          escalation_evidence_ids?: string[] | null
          escalation_notes?: string | null
          escalation_process_documented?: boolean | null
          escalation_roles_defined?: boolean | null
          escalation_timelines_defined?: boolean | null
          id?: string
          overall_assessment?: string | null
          procedures_cover_escalation?: boolean | null
          procedures_cover_filing?: boolean | null
          procedures_cover_identification?: boolean | null
          procedures_documented?: boolean | null
          procedures_evidence_ids?: string[] | null
          procedures_notes?: string | null
          qa_covers_accuracy?: boolean | null
          qa_covers_completeness?: boolean | null
          qa_covers_timeliness?: boolean | null
          qa_evidence_ids?: string[] | null
          qa_frequency?: string | null
          qa_notes?: string | null
          qa_process_exists?: boolean | null
          review_id?: string
          summary_narrative?: string | null
          training_covers_reporting_types?: boolean | null
          training_evidence_ids?: string[] | null
          training_notes?: string | null
          training_program_exists?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reporting_governance_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: true
            referencedRelation: "reporting_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      reporting_reviews: {
        Row: {
          created_at: string
          engagement_id: string
          finalized_at: string | null
          finalized_by: string | null
          id: string
          last_unlocked_at: string | null
          last_unlocked_by: string | null
          lock_state: string
          notes: string | null
          review_period_end: string | null
          review_period_start: string | null
          reviewer_name: string | null
          status: string
          unlock_count: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          engagement_id: string
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          last_unlocked_at?: string | null
          last_unlocked_by?: string | null
          lock_state?: string
          notes?: string | null
          review_period_end?: string | null
          review_period_start?: string | null
          reviewer_name?: string | null
          status?: string
          unlock_count?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          engagement_id?: string
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          last_unlocked_at?: string | null
          last_unlocked_by?: string | null
          lock_state?: string
          notes?: string | null
          review_period_end?: string | null
          review_period_start?: string | null
          reviewer_name?: string | null
          status?: string
          unlock_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reporting_reviews_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: true
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      reporting_samples: {
        Row: {
          accuracy_matches_kyc: string | null
          accuracy_matches_ledger: string | null
          accuracy_matches_system: string | null
          accuracy_notes: string | null
          accuracy_overall: string | null
          activity_sector_code: boolean | null
          aggregation_period_end: string | null
          aggregation_period_start: string | null
          aggregation_type: string | null
          authorized_persons: boolean | null
          beneficiary_account_wallet: boolean | null
          beneficiary_address: boolean | null
          beneficiary_complete: string | null
          beneficiary_identification: boolean | null
          beneficiary_name: boolean | null
          client_address: boolean | null
          client_complete: string | null
          client_dob: boolean | null
          client_incorporation_info: boolean | null
          client_name: boolean | null
          client_occupation: boolean | null
          completeness_result: string | null
          created_at: string
          deficiencies: string | null
          eft_direction: boolean | null
          engagement_id: string
          evidence_file_ids: string[] | null
          evidence_ids: string[] | null
          exchange_rate: boolean | null
          exchange_rate_source: boolean | null
          filing_method: string | null
          fintrac_submission_date: string | null
          header_complete: string | null
          header_report_reference: boolean | null
          header_reporting_entity: boolean | null
          header_submission_timestamp: boolean | null
          id: string
          is_aggregated: boolean | null
          manual_notes: string | null
          ministerial_directive: boolean | null
          notes: string | null
          on_behalf_of_beneficiary: boolean | null
          on_behalf_of_requester: boolean | null
          overall_result: string | null
          parsed_data: Json | null
          parsed_json: Json | null
          report_reference: string | null
          report_reference_id: string | null
          report_type: string
          reporting_period_end: string | null
          reporting_period_start: string | null
          requester_account: boolean | null
          requester_identification: boolean | null
          review_id: string | null
          source_file_name: string | null
          source_file_path: string | null
          source_file_type: string | null
          special_fields_complete: string | null
          str_decision_notes: string | null
          str_escalation_performed: boolean | null
          str_filed_promptly: boolean | null
          str_investigation_conducted: boolean | null
          str_narrative: boolean | null
          str_rationale_documented: boolean | null
          str_suspicion_documented: boolean | null
          submitting_re_number: boolean | null
          test_result: string | null
          third_party_complete: string | null
          third_party_details: boolean | null
          third_party_indicator: boolean | null
          timeliness_days_to_file: number | null
          timeliness_filing_date: string | null
          timeliness_notes: string | null
          timeliness_result: string | null
          timeliness_suspicion_date: string | null
          timeliness_transaction_date: string | null
          transaction_amount: number | null
          transaction_currency: string | null
          transaction_date: string | null
          txn_aggregation_indicator: boolean | null
          txn_aggregation_period_end: boolean | null
          txn_aggregation_period_start: boolean | null
          txn_aggregation_type: boolean | null
          txn_amount: boolean | null
          txn_complete: string | null
          txn_currency: boolean | null
          txn_date_time: boolean | null
          updated_at: string
          vc_identifiers: boolean | null
        }
        Insert: {
          accuracy_matches_kyc?: string | null
          accuracy_matches_ledger?: string | null
          accuracy_matches_system?: string | null
          accuracy_notes?: string | null
          accuracy_overall?: string | null
          activity_sector_code?: boolean | null
          aggregation_period_end?: string | null
          aggregation_period_start?: string | null
          aggregation_type?: string | null
          authorized_persons?: boolean | null
          beneficiary_account_wallet?: boolean | null
          beneficiary_address?: boolean | null
          beneficiary_complete?: string | null
          beneficiary_identification?: boolean | null
          beneficiary_name?: boolean | null
          client_address?: boolean | null
          client_complete?: string | null
          client_dob?: boolean | null
          client_incorporation_info?: boolean | null
          client_name?: boolean | null
          client_occupation?: boolean | null
          completeness_result?: string | null
          created_at?: string
          deficiencies?: string | null
          eft_direction?: boolean | null
          engagement_id: string
          evidence_file_ids?: string[] | null
          evidence_ids?: string[] | null
          exchange_rate?: boolean | null
          exchange_rate_source?: boolean | null
          filing_method?: string | null
          fintrac_submission_date?: string | null
          header_complete?: string | null
          header_report_reference?: boolean | null
          header_reporting_entity?: boolean | null
          header_submission_timestamp?: boolean | null
          id?: string
          is_aggregated?: boolean | null
          manual_notes?: string | null
          ministerial_directive?: boolean | null
          notes?: string | null
          on_behalf_of_beneficiary?: boolean | null
          on_behalf_of_requester?: boolean | null
          overall_result?: string | null
          parsed_data?: Json | null
          parsed_json?: Json | null
          report_reference?: string | null
          report_reference_id?: string | null
          report_type: string
          reporting_period_end?: string | null
          reporting_period_start?: string | null
          requester_account?: boolean | null
          requester_identification?: boolean | null
          review_id?: string | null
          source_file_name?: string | null
          source_file_path?: string | null
          source_file_type?: string | null
          special_fields_complete?: string | null
          str_decision_notes?: string | null
          str_escalation_performed?: boolean | null
          str_filed_promptly?: boolean | null
          str_investigation_conducted?: boolean | null
          str_narrative?: boolean | null
          str_rationale_documented?: boolean | null
          str_suspicion_documented?: boolean | null
          submitting_re_number?: boolean | null
          test_result?: string | null
          third_party_complete?: string | null
          third_party_details?: boolean | null
          third_party_indicator?: boolean | null
          timeliness_days_to_file?: number | null
          timeliness_filing_date?: string | null
          timeliness_notes?: string | null
          timeliness_result?: string | null
          timeliness_suspicion_date?: string | null
          timeliness_transaction_date?: string | null
          transaction_amount?: number | null
          transaction_currency?: string | null
          transaction_date?: string | null
          txn_aggregation_indicator?: boolean | null
          txn_aggregation_period_end?: boolean | null
          txn_aggregation_period_start?: boolean | null
          txn_aggregation_type?: boolean | null
          txn_amount?: boolean | null
          txn_complete?: string | null
          txn_currency?: boolean | null
          txn_date_time?: boolean | null
          updated_at?: string
          vc_identifiers?: boolean | null
        }
        Update: {
          accuracy_matches_kyc?: string | null
          accuracy_matches_ledger?: string | null
          accuracy_matches_system?: string | null
          accuracy_notes?: string | null
          accuracy_overall?: string | null
          activity_sector_code?: boolean | null
          aggregation_period_end?: string | null
          aggregation_period_start?: string | null
          aggregation_type?: string | null
          authorized_persons?: boolean | null
          beneficiary_account_wallet?: boolean | null
          beneficiary_address?: boolean | null
          beneficiary_complete?: string | null
          beneficiary_identification?: boolean | null
          beneficiary_name?: boolean | null
          client_address?: boolean | null
          client_complete?: string | null
          client_dob?: boolean | null
          client_incorporation_info?: boolean | null
          client_name?: boolean | null
          client_occupation?: boolean | null
          completeness_result?: string | null
          created_at?: string
          deficiencies?: string | null
          eft_direction?: boolean | null
          engagement_id?: string
          evidence_file_ids?: string[] | null
          evidence_ids?: string[] | null
          exchange_rate?: boolean | null
          exchange_rate_source?: boolean | null
          filing_method?: string | null
          fintrac_submission_date?: string | null
          header_complete?: string | null
          header_report_reference?: boolean | null
          header_reporting_entity?: boolean | null
          header_submission_timestamp?: boolean | null
          id?: string
          is_aggregated?: boolean | null
          manual_notes?: string | null
          ministerial_directive?: boolean | null
          notes?: string | null
          on_behalf_of_beneficiary?: boolean | null
          on_behalf_of_requester?: boolean | null
          overall_result?: string | null
          parsed_data?: Json | null
          parsed_json?: Json | null
          report_reference?: string | null
          report_reference_id?: string | null
          report_type?: string
          reporting_period_end?: string | null
          reporting_period_start?: string | null
          requester_account?: boolean | null
          requester_identification?: boolean | null
          review_id?: string | null
          source_file_name?: string | null
          source_file_path?: string | null
          source_file_type?: string | null
          special_fields_complete?: string | null
          str_decision_notes?: string | null
          str_escalation_performed?: boolean | null
          str_filed_promptly?: boolean | null
          str_investigation_conducted?: boolean | null
          str_narrative?: boolean | null
          str_rationale_documented?: boolean | null
          str_suspicion_documented?: boolean | null
          submitting_re_number?: boolean | null
          test_result?: string | null
          third_party_complete?: string | null
          third_party_details?: boolean | null
          third_party_indicator?: boolean | null
          timeliness_days_to_file?: number | null
          timeliness_filing_date?: string | null
          timeliness_notes?: string | null
          timeliness_result?: string | null
          timeliness_suspicion_date?: string | null
          timeliness_transaction_date?: string | null
          transaction_amount?: number | null
          transaction_currency?: string | null
          transaction_date?: string | null
          txn_aggregation_indicator?: boolean | null
          txn_aggregation_period_end?: boolean | null
          txn_aggregation_period_start?: boolean | null
          txn_aggregation_type?: boolean | null
          txn_amount?: boolean | null
          txn_complete?: string | null
          txn_currency?: boolean | null
          txn_date_time?: boolean | null
          updated_at?: string
          vc_identifiers?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "reporting_samples_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reporting_samples_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reporting_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      reporting_source_population: {
        Row: {
          created_at: string
          engagement_id: string
          excluded_rows: number
          id: string
          matched_rows: number
          notes: string | null
          period_end: string | null
          period_start: string | null
          report_type: string
          review_id: string
          source_file_name: string | null
          source_file_path: string | null
          source_file_type: string | null
          total_rows: number
          unmatched_rows: number
          updated_at: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          engagement_id: string
          excluded_rows?: number
          id?: string
          matched_rows?: number
          notes?: string | null
          period_end?: string | null
          period_start?: string | null
          report_type: string
          review_id: string
          source_file_name?: string | null
          source_file_path?: string | null
          source_file_type?: string | null
          total_rows?: number
          unmatched_rows?: number
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          engagement_id?: string
          excluded_rows?: number
          id?: string
          matched_rows?: number
          notes?: string | null
          period_end?: string | null
          period_start?: string | null
          report_type?: string
          review_id?: string
          source_file_name?: string | null
          source_file_path?: string | null
          source_file_type?: string | null
          total_rows?: number
          unmatched_rows?: number
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reporting_source_population_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reporting_source_population_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reporting_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      reporting_source_population_rows: {
        Row: {
          client_identifier: string | null
          client_name: string | null
          created_at: string
          exclusion_reason: string | null
          id: string
          match_method: string | null
          match_score: number | null
          match_status: string
          matched_sample_id: string | null
          population_id: string
          raw_row: Json | null
          reviewer_notes: string | null
          source_reference: string | null
          transaction_amount: number | null
          transaction_currency: string | null
          transaction_date: string | null
          updated_at: string
        }
        Insert: {
          client_identifier?: string | null
          client_name?: string | null
          created_at?: string
          exclusion_reason?: string | null
          id?: string
          match_method?: string | null
          match_score?: number | null
          match_status?: string
          matched_sample_id?: string | null
          population_id: string
          raw_row?: Json | null
          reviewer_notes?: string | null
          source_reference?: string | null
          transaction_amount?: number | null
          transaction_currency?: string | null
          transaction_date?: string | null
          updated_at?: string
        }
        Update: {
          client_identifier?: string | null
          client_name?: string | null
          created_at?: string
          exclusion_reason?: string | null
          id?: string
          match_method?: string | null
          match_score?: number | null
          match_status?: string
          matched_sample_id?: string | null
          population_id?: string
          raw_row?: Json | null
          reviewer_notes?: string | null
          source_reference?: string | null
          transaction_amount?: number | null
          transaction_currency?: string | null
          transaction_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reporting_source_population_rows_matched_sample_id_fkey"
            columns: ["matched_sample_id"]
            isOneToOne: false
            referencedRelation: "reporting_samples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reporting_source_population_rows_population_id_fkey"
            columns: ["population_id"]
            isOneToOne: false
            referencedRelation: "reporting_source_population"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_assessment_control_results: {
        Row: {
          comments: string | null
          control_area: string
          control_objective: string
          created_at: string
          deficiency_flag: boolean | null
          evidence_file_ids: string[] | null
          evidence_reviewed: string | null
          expected_outcome: string | null
          finding_type: string | null
          id: string
          max_points: number
          observation_best_practice: string | null
          points_achieved: number | null
          response: string | null
          review_id: string
          reviewer_recommendation: string | null
          risk_rating: string | null
          section_code: string
          section_name: string
          sort_order: number
          template_id: string | null
          test_procedure: string | null
          updated_at: string
        }
        Insert: {
          comments?: string | null
          control_area: string
          control_objective: string
          created_at?: string
          deficiency_flag?: boolean | null
          evidence_file_ids?: string[] | null
          evidence_reviewed?: string | null
          expected_outcome?: string | null
          finding_type?: string | null
          id?: string
          max_points?: number
          observation_best_practice?: string | null
          points_achieved?: number | null
          response?: string | null
          review_id: string
          reviewer_recommendation?: string | null
          risk_rating?: string | null
          section_code: string
          section_name: string
          sort_order?: number
          template_id?: string | null
          test_procedure?: string | null
          updated_at?: string
        }
        Update: {
          comments?: string | null
          control_area?: string
          control_objective?: string
          created_at?: string
          deficiency_flag?: boolean | null
          evidence_file_ids?: string[] | null
          evidence_reviewed?: string | null
          expected_outcome?: string | null
          finding_type?: string | null
          id?: string
          max_points?: number
          observation_best_practice?: string | null
          points_achieved?: number | null
          response?: string | null
          review_id?: string
          reviewer_recommendation?: string | null
          risk_rating?: string | null
          section_code?: string
          section_name?: string
          sort_order?: number
          template_id?: string | null
          test_procedure?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_assessment_control_results_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "risk_assessment_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_assessment_control_results_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "risk_assessment_question_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_assessment_documents: {
        Row: {
          approval_authority: string | null
          created_at: string
          date_approved: string | null
          date_prepared: string | null
          document_type: string | null
          id: string
          name: string
          review_id: string
          scope: string | null
          sort_order: number
          updated_at: string
          version_number: string | null
        }
        Insert: {
          approval_authority?: string | null
          created_at?: string
          date_approved?: string | null
          date_prepared?: string | null
          document_type?: string | null
          id?: string
          name: string
          review_id: string
          scope?: string | null
          sort_order?: number
          updated_at?: string
          version_number?: string | null
        }
        Update: {
          approval_authority?: string | null
          created_at?: string
          date_approved?: string | null
          date_prepared?: string | null
          document_type?: string | null
          id?: string
          name?: string
          review_id?: string
          scope?: string | null
          sort_order?: number
          updated_at?: string
          version_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "risk_assessment_documents_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "risk_assessment_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_assessment_question_templates: {
        Row: {
          applicability: string | null
          control_area: string
          control_objective: string
          created_at: string
          expected_outcome: string | null
          id: string
          is_active: boolean
          max_points: number
          section_code: string
          section_name: string
          sort_order: number
          suggested_finding_type: string | null
          test_procedure: string | null
        }
        Insert: {
          applicability?: string | null
          control_area: string
          control_objective: string
          created_at?: string
          expected_outcome?: string | null
          id?: string
          is_active?: boolean
          max_points?: number
          section_code: string
          section_name: string
          sort_order?: number
          suggested_finding_type?: string | null
          test_procedure?: string | null
        }
        Update: {
          applicability?: string | null
          control_area?: string
          control_objective?: string
          created_at?: string
          expected_outcome?: string | null
          id?: string
          is_active?: boolean
          max_points?: number
          section_code?: string
          section_name?: string
          sort_order?: number
          suggested_finding_type?: string | null
          test_procedure?: string | null
        }
        Relationships: []
      }
      risk_assessment_reviews: {
        Row: {
          approval_evidence_available: string | null
          approved_by_senior_mgmt: string | null
          created_at: string
          current_section: number | null
          current_step: number | null
          date_last_updated: string | null
          date_prepared: string | null
          defines_impact_assessment: string | null
          defines_likelihood_assessment: string | null
          defines_ml_tf_risk: string | null
          distinguishes_inherent_residual: string | null
          document_titles: string | null
          engagement_id: string
          finalized_at: string | null
          finalized_by: string | null
          id: string
          last_unlocked_at: string | null
          last_unlocked_by: string | null
          likelihood_impact_matrix: string | null
          lock_state: string
          notes: string | null
          overall_assessment: string | null
          overall_finding_type: string | null
          overall_finding_type_overridden: boolean
          ratings_documented_rationale: string | null
          rba_approved_by: string | null
          rba_date_approved: string | null
          rba_document_file_ids: string[] | null
          rba_document_name: string | null
          rba_exists: boolean | null
          rba_retrievable: string | null
          rba_version: string | null
          review_period_end: string | null
          review_period_start: string | null
          review_type: Database["public"]["Enums"]["rba_review_type"]
          reviewer_name: string | null
          risk_acceptance_process: string | null
          risk_tolerance_approved: string | null
          risk_tolerance_statement: string | null
          scoring_reproducible: string | null
          status: string
          summary_for_report: string | null
          unlock_count: number
          updated_at: string
          updated_within_12_months: string | null
          uses_scoring_model: string | null
          version_control_maintained: string | null
          version_number: string | null
          weights_explained: string | null
        }
        Insert: {
          approval_evidence_available?: string | null
          approved_by_senior_mgmt?: string | null
          created_at?: string
          current_section?: number | null
          current_step?: number | null
          date_last_updated?: string | null
          date_prepared?: string | null
          defines_impact_assessment?: string | null
          defines_likelihood_assessment?: string | null
          defines_ml_tf_risk?: string | null
          distinguishes_inherent_residual?: string | null
          document_titles?: string | null
          engagement_id: string
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          last_unlocked_at?: string | null
          last_unlocked_by?: string | null
          likelihood_impact_matrix?: string | null
          lock_state?: string
          notes?: string | null
          overall_assessment?: string | null
          overall_finding_type?: string | null
          overall_finding_type_overridden?: boolean
          ratings_documented_rationale?: string | null
          rba_approved_by?: string | null
          rba_date_approved?: string | null
          rba_document_file_ids?: string[] | null
          rba_document_name?: string | null
          rba_exists?: boolean | null
          rba_retrievable?: string | null
          rba_version?: string | null
          review_period_end?: string | null
          review_period_start?: string | null
          review_type?: Database["public"]["Enums"]["rba_review_type"]
          reviewer_name?: string | null
          risk_acceptance_process?: string | null
          risk_tolerance_approved?: string | null
          risk_tolerance_statement?: string | null
          scoring_reproducible?: string | null
          status?: string
          summary_for_report?: string | null
          unlock_count?: number
          updated_at?: string
          updated_within_12_months?: string | null
          uses_scoring_model?: string | null
          version_control_maintained?: string | null
          version_number?: string | null
          weights_explained?: string | null
        }
        Update: {
          approval_evidence_available?: string | null
          approved_by_senior_mgmt?: string | null
          created_at?: string
          current_section?: number | null
          current_step?: number | null
          date_last_updated?: string | null
          date_prepared?: string | null
          defines_impact_assessment?: string | null
          defines_likelihood_assessment?: string | null
          defines_ml_tf_risk?: string | null
          distinguishes_inherent_residual?: string | null
          document_titles?: string | null
          engagement_id?: string
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          last_unlocked_at?: string | null
          last_unlocked_by?: string | null
          likelihood_impact_matrix?: string | null
          lock_state?: string
          notes?: string | null
          overall_assessment?: string | null
          overall_finding_type?: string | null
          overall_finding_type_overridden?: boolean
          ratings_documented_rationale?: string | null
          rba_approved_by?: string | null
          rba_date_approved?: string | null
          rba_document_file_ids?: string[] | null
          rba_document_name?: string | null
          rba_exists?: boolean | null
          rba_retrievable?: string | null
          rba_version?: string | null
          review_period_end?: string | null
          review_period_start?: string | null
          review_type?: Database["public"]["Enums"]["rba_review_type"]
          reviewer_name?: string | null
          risk_acceptance_process?: string | null
          risk_tolerance_approved?: string | null
          risk_tolerance_statement?: string | null
          scoring_reproducible?: string | null
          status?: string
          summary_for_report?: string | null
          unlock_count?: number
          updated_at?: string
          updated_within_12_months?: string | null
          uses_scoring_model?: string | null
          version_control_maintained?: string | null
          version_number?: string | null
          weights_explained?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "risk_assessment_reviews_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: true
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      tm_alert_samples: {
        Row: {
          alert_date: string | null
          alert_id: string | null
          alert_type: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          customer_profile_reviewed: boolean | null
          decision_documented: boolean | null
          disposition: string | null
          escalated_to: string | null
          escalation_date: string | null
          evidence_file_ids: string[] | null
          finding_type: string | null
          id: string
          no_backlog: boolean | null
          notes: string | null
          override_rationale: string | null
          pep_senior_mgmt_approval: boolean | null
          pep_sm_approval_within_30_days: boolean | null
          pep_source_of_funds_documented: boolean | null
          pep_source_of_wealth_documented: boolean | null
          rationale: string | null
          rationale_aligns: boolean | null
          rationale_quality: string | null
          review_id: string
          reviewed_by: string | null
          reviewed_date: string | null
          reviewed_per_process: boolean | null
          sla_days: number | null
          supporting_docs_considered: boolean | null
          system_finding_type: string | null
          test_result: string | null
          transaction_history_reviewed: boolean | null
          updated_at: string
          within_sla: boolean | null
        }
        Insert: {
          alert_date?: string | null
          alert_id?: string | null
          alert_type?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          customer_profile_reviewed?: boolean | null
          decision_documented?: boolean | null
          disposition?: string | null
          escalated_to?: string | null
          escalation_date?: string | null
          evidence_file_ids?: string[] | null
          finding_type?: string | null
          id?: string
          no_backlog?: boolean | null
          notes?: string | null
          override_rationale?: string | null
          pep_senior_mgmt_approval?: boolean | null
          pep_sm_approval_within_30_days?: boolean | null
          pep_source_of_funds_documented?: boolean | null
          pep_source_of_wealth_documented?: boolean | null
          rationale?: string | null
          rationale_aligns?: boolean | null
          rationale_quality?: string | null
          review_id: string
          reviewed_by?: string | null
          reviewed_date?: string | null
          reviewed_per_process?: boolean | null
          sla_days?: number | null
          supporting_docs_considered?: boolean | null
          system_finding_type?: string | null
          test_result?: string | null
          transaction_history_reviewed?: boolean | null
          updated_at?: string
          within_sla?: boolean | null
        }
        Update: {
          alert_date?: string | null
          alert_id?: string | null
          alert_type?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          customer_profile_reviewed?: boolean | null
          decision_documented?: boolean | null
          disposition?: string | null
          escalated_to?: string | null
          escalation_date?: string | null
          evidence_file_ids?: string[] | null
          finding_type?: string | null
          id?: string
          no_backlog?: boolean | null
          notes?: string | null
          override_rationale?: string | null
          pep_senior_mgmt_approval?: boolean | null
          pep_sm_approval_within_30_days?: boolean | null
          pep_source_of_funds_documented?: boolean | null
          pep_source_of_wealth_documented?: boolean | null
          rationale?: string | null
          rationale_aligns?: boolean | null
          rationale_quality?: string | null
          review_id?: string
          reviewed_by?: string | null
          reviewed_date?: string | null
          reviewed_per_process?: boolean | null
          sla_days?: number | null
          supporting_docs_considered?: boolean | null
          system_finding_type?: string | null
          test_result?: string | null
          transaction_history_reviewed?: boolean | null
          updated_at?: string
          within_sla?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "tm_alert_samples_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "tm_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      tm_checklist_responses: {
        Row: {
          created_at: string
          evidence_file_ids: string[] | null
          id: string
          is_checked: boolean | null
          is_watch_out: boolean | null
          item_code: string
          item_text: string
          notes: string | null
          review_id: string
          section_code: string
          section_name: string
          submodule: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          evidence_file_ids?: string[] | null
          id?: string
          is_checked?: boolean | null
          is_watch_out?: boolean | null
          item_code: string
          item_text: string
          notes?: string | null
          review_id: string
          section_code: string
          section_name: string
          submodule: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          evidence_file_ids?: string[] | null
          id?: string
          is_checked?: boolean | null
          is_watch_out?: boolean | null
          item_code?: string
          item_text?: string
          notes?: string | null
          review_id?: string
          section_code?: string
          section_name?: string
          submodule?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tm_checklist_responses_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "tm_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      tm_edd_samples: {
        Row: {
          adverse_media_conducted: boolean | null
          best_practice_result: string | null
          created_at: string
          customer_id: string | null
          customer_name: string | null
          enhanced_monitoring: boolean | null
          evidence_aligns_policy: boolean | null
          evidence_file_ids: string[] | null
          finding_type: string | null
          high_risk_identified: boolean | null
          high_risk_reason: string | null
          id: string
          notes: string | null
          override_rationale: string | null
          policy_compliance_result: string | null
          review_id: string
          senior_mgmt_approval: boolean | null
          source_of_funds_obtained: boolean | null
          source_of_wealth_obtained: boolean | null
          source_of_wealth_required: boolean | null
          supporting_docs_retained: boolean | null
          system_finding_type: string | null
          transaction_review_conducted: boolean | null
          updated_at: string
        }
        Insert: {
          adverse_media_conducted?: boolean | null
          best_practice_result?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          enhanced_monitoring?: boolean | null
          evidence_aligns_policy?: boolean | null
          evidence_file_ids?: string[] | null
          finding_type?: string | null
          high_risk_identified?: boolean | null
          high_risk_reason?: string | null
          id?: string
          notes?: string | null
          override_rationale?: string | null
          policy_compliance_result?: string | null
          review_id: string
          senior_mgmt_approval?: boolean | null
          source_of_funds_obtained?: boolean | null
          source_of_wealth_obtained?: boolean | null
          source_of_wealth_required?: boolean | null
          supporting_docs_retained?: boolean | null
          system_finding_type?: string | null
          transaction_review_conducted?: boolean | null
          updated_at?: string
        }
        Update: {
          adverse_media_conducted?: boolean | null
          best_practice_result?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          enhanced_monitoring?: boolean | null
          evidence_aligns_policy?: boolean | null
          evidence_file_ids?: string[] | null
          finding_type?: string | null
          high_risk_identified?: boolean | null
          high_risk_reason?: string | null
          id?: string
          notes?: string | null
          override_rationale?: string | null
          policy_compliance_result?: string | null
          review_id?: string
          senior_mgmt_approval?: boolean | null
          source_of_funds_obtained?: boolean | null
          source_of_wealth_obtained?: boolean | null
          source_of_wealth_required?: boolean | null
          supporting_docs_retained?: boolean | null
          system_finding_type?: string | null
          transaction_review_conducted?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tm_edd_samples_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "tm_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      tm_findings: {
        Row: {
          created_at: string
          engagement_id: string
          finding_description: string | null
          finding_title: string
          finding_type: string | null
          id: string
          is_auto_generated: boolean | null
          management_response: string | null
          recommendation: string | null
          review_id: string
          severity: string
          source_id: string | null
          source_table: string | null
          status: string
          submodule: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          engagement_id: string
          finding_description?: string | null
          finding_title: string
          finding_type?: string | null
          id?: string
          is_auto_generated?: boolean | null
          management_response?: string | null
          recommendation?: string | null
          review_id: string
          severity?: string
          source_id?: string | null
          source_table?: string | null
          status?: string
          submodule: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          engagement_id?: string
          finding_description?: string | null
          finding_title?: string
          finding_type?: string | null
          id?: string
          is_auto_generated?: boolean | null
          management_response?: string | null
          recommendation?: string | null
          review_id?: string
          severity?: string
          source_id?: string | null
          source_table?: string | null
          status?: string
          submodule?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tm_findings_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tm_findings_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "tm_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      tm_remediation_items: {
        Row: {
          actual_completion_date: string | null
          created_at: string
          effectiveness_status: string | null
          evidence_available: boolean | null
          evidence_file_ids: string[] | null
          finding_description: string
          finding_type: string | null
          id: string
          implementation_status: string | null
          notes: string | null
          override_rationale: string | null
          recommendation: string | null
          remediation_plan: string | null
          residual_risk_notes: string | null
          review_id: string
          source: string
          source_reference: string | null
          system_finding_type: string | null
          target_date: string | null
          test_result: string | null
          timeline_met: boolean | null
          updated_at: string
        }
        Insert: {
          actual_completion_date?: string | null
          created_at?: string
          effectiveness_status?: string | null
          evidence_available?: boolean | null
          evidence_file_ids?: string[] | null
          finding_description: string
          finding_type?: string | null
          id?: string
          implementation_status?: string | null
          notes?: string | null
          override_rationale?: string | null
          recommendation?: string | null
          remediation_plan?: string | null
          residual_risk_notes?: string | null
          review_id: string
          source: string
          source_reference?: string | null
          system_finding_type?: string | null
          target_date?: string | null
          test_result?: string | null
          timeline_met?: boolean | null
          updated_at?: string
        }
        Update: {
          actual_completion_date?: string | null
          created_at?: string
          effectiveness_status?: string | null
          evidence_available?: boolean | null
          evidence_file_ids?: string[] | null
          finding_description?: string
          finding_type?: string | null
          id?: string
          implementation_status?: string | null
          notes?: string | null
          override_rationale?: string | null
          recommendation?: string | null
          remediation_plan?: string | null
          residual_risk_notes?: string | null
          review_id?: string
          source?: string
          source_reference?: string | null
          system_finding_type?: string | null
          target_date?: string | null
          test_result?: string | null
          timeline_met?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tm_remediation_items_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "tm_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      tm_reviews: {
        Row: {
          alert_review_procedure_text: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          current_submodule: string | null
          edd_procedure_text: string | null
          engagement_id: string
          finalized_at: string | null
          finalized_by: string | null
          fintrac_remediation_procedure_text: string | null
          id: string
          last_unlocked_at: string | null
          last_unlocked_by: string | null
          lock_state: string
          overall_assessment: string | null
          prior_review_remediation_procedure_text: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          risk_recalc_procedure_text: string | null
          screening_procedure_text: string | null
          status: string
          summary_for_report: string | null
          unlock_count: number
          updated_at: string
        }
        Insert: {
          alert_review_procedure_text?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          current_submodule?: string | null
          edd_procedure_text?: string | null
          engagement_id: string
          finalized_at?: string | null
          finalized_by?: string | null
          fintrac_remediation_procedure_text?: string | null
          id?: string
          last_unlocked_at?: string | null
          last_unlocked_by?: string | null
          lock_state?: string
          overall_assessment?: string | null
          prior_review_remediation_procedure_text?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_recalc_procedure_text?: string | null
          screening_procedure_text?: string | null
          status?: string
          summary_for_report?: string | null
          unlock_count?: number
          updated_at?: string
        }
        Update: {
          alert_review_procedure_text?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          current_submodule?: string | null
          edd_procedure_text?: string | null
          engagement_id?: string
          finalized_at?: string | null
          finalized_by?: string | null
          fintrac_remediation_procedure_text?: string | null
          id?: string
          last_unlocked_at?: string | null
          last_unlocked_by?: string | null
          lock_state?: string
          overall_assessment?: string | null
          prior_review_remediation_procedure_text?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_recalc_procedure_text?: string | null
          screening_procedure_text?: string | null
          status?: string
          summary_for_report?: string | null
          unlock_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tm_reviews_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: true
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      tm_risk_recalc_samples: {
        Row: {
          created_at: string
          customer_id: string | null
          customer_name: string | null
          evidence_file_ids: string[] | null
          finding_type: string | null
          id: string
          manual_risk_rating: string | null
          notes: string | null
          other_triggers_consistent: boolean | null
          override_rationale: string | null
          ratings_match: boolean | null
          review_id: string
          risk_factors_defined: boolean | null
          scoring_logic_documented: boolean | null
          str_upgrade_applied: boolean | null
          system_finding_type: string | null
          system_risk_rating: string | null
          test_result: string | null
          trigger_description: string | null
          trigger_type: string | null
          triggers_defined: boolean | null
          updated_at: string
          volume_trigger_applied: boolean | null
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          evidence_file_ids?: string[] | null
          finding_type?: string | null
          id?: string
          manual_risk_rating?: string | null
          notes?: string | null
          other_triggers_consistent?: boolean | null
          override_rationale?: string | null
          ratings_match?: boolean | null
          review_id: string
          risk_factors_defined?: boolean | null
          scoring_logic_documented?: boolean | null
          str_upgrade_applied?: boolean | null
          system_finding_type?: string | null
          system_risk_rating?: string | null
          test_result?: string | null
          trigger_description?: string | null
          trigger_type?: string | null
          triggers_defined?: boolean | null
          updated_at?: string
          volume_trigger_applied?: boolean | null
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          evidence_file_ids?: string[] | null
          finding_type?: string | null
          id?: string
          manual_risk_rating?: string | null
          notes?: string | null
          other_triggers_consistent?: boolean | null
          override_rationale?: string | null
          ratings_match?: boolean | null
          review_id?: string
          risk_factors_defined?: boolean | null
          scoring_logic_documented?: boolean | null
          str_upgrade_applied?: boolean | null
          system_finding_type?: string | null
          system_risk_rating?: string | null
          test_result?: string | null
          trigger_description?: string | null
          trigger_type?: string | null
          triggers_defined?: boolean | null
          updated_at?: string
          volume_trigger_applied?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "tm_risk_recalc_samples_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "tm_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      tm_rules: {
        Row: {
          created_at: string
          engagement_id: string
          evidence_ids: string[] | null
          expected_behavior: string | null
          id: string
          notes: string | null
          rationale: string | null
          rule_category: string | null
          rule_name: string
          test_cases: string | null
          test_outcome: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          engagement_id: string
          evidence_ids?: string[] | null
          expected_behavior?: string | null
          id?: string
          notes?: string | null
          rationale?: string | null
          rule_category?: string | null
          rule_name: string
          test_cases?: string | null
          test_outcome?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          engagement_id?: string
          evidence_ids?: string[] | null
          expected_behavior?: string | null
          id?: string
          notes?: string | null
          rationale?: string | null
          rule_category?: string | null
          rule_name?: string
          test_cases?: string | null
          test_outcome?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tm_rules_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      tm_screening_samples: {
        Row: {
          created_at: string
          date_added_to_list: string | null
          date_removed_from_list: string | null
          evidence_file_ids: string[] | null
          expected_result: string | null
          finding_type: string | null
          fuzzy_threshold_used: string | null
          id: string
          list_source: string | null
          list_status: string | null
          match_type: string | null
          notes: string | null
          override_rationale: string | null
          review_id: string
          sample_number: number
          system_finding_type: string | null
          system_flagged: boolean | null
          test_date: string | null
          test_name: string
          test_result: string | null
          tested_by: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_added_to_list?: string | null
          date_removed_from_list?: string | null
          evidence_file_ids?: string[] | null
          expected_result?: string | null
          finding_type?: string | null
          fuzzy_threshold_used?: string | null
          id?: string
          list_source?: string | null
          list_status?: string | null
          match_type?: string | null
          notes?: string | null
          override_rationale?: string | null
          review_id: string
          sample_number: number
          system_finding_type?: string | null
          system_flagged?: boolean | null
          test_date?: string | null
          test_name: string
          test_result?: string | null
          tested_by?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_added_to_list?: string | null
          date_removed_from_list?: string | null
          evidence_file_ids?: string[] | null
          expected_result?: string | null
          finding_type?: string | null
          fuzzy_threshold_used?: string | null
          id?: string
          list_source?: string | null
          list_status?: string | null
          match_type?: string | null
          notes?: string | null
          override_rationale?: string | null
          review_id?: string
          sample_number?: number
          system_finding_type?: string | null
          system_flagged?: boolean | null
          test_date?: string | null
          test_name?: string
          test_result?: string | null
          tested_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tm_screening_samples_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "tm_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      tm_submodule_status: {
        Row: {
          comments: string | null
          created_at: string
          deficiency_flag: boolean | null
          document_reference: string | null
          evidence_reviewed: string | null
          finding_type: string | null
          id: string
          max_points: number | null
          observation_best_practice: string | null
          override_rationale: string | null
          points_achieved: number | null
          policy_sla_days: number | null
          review_id: string
          status: string
          submodule: string
          summary_narrative: string | null
          system_finding_type: string | null
          test_result: string | null
          updated_at: string
        }
        Insert: {
          comments?: string | null
          created_at?: string
          deficiency_flag?: boolean | null
          document_reference?: string | null
          evidence_reviewed?: string | null
          finding_type?: string | null
          id?: string
          max_points?: number | null
          observation_best_practice?: string | null
          override_rationale?: string | null
          points_achieved?: number | null
          policy_sla_days?: number | null
          review_id: string
          status?: string
          submodule: string
          summary_narrative?: string | null
          system_finding_type?: string | null
          test_result?: string | null
          updated_at?: string
        }
        Update: {
          comments?: string | null
          created_at?: string
          deficiency_flag?: boolean | null
          document_reference?: string | null
          evidence_reviewed?: string | null
          finding_type?: string | null
          id?: string
          max_points?: number | null
          observation_best_practice?: string | null
          override_rationale?: string | null
          points_achieved?: number | null
          policy_sla_days?: number | null
          review_id?: string
          status?: string
          submodule?: string
          summary_narrative?: string | null
          system_finding_type?: string | null
          test_result?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tm_submodule_status_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "tm_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      training_audiences: {
        Row: {
          audience_name: string
          audience_type: string | null
          created_at: string
          enhanced_training_required: boolean | null
          evidence_file_ids: string[] | null
          id: string
          last_training_date: string | null
          notes: string | null
          required_frequency: string | null
          review_id: string
          training_completed: boolean | null
          updated_at: string
        }
        Insert: {
          audience_name: string
          audience_type?: string | null
          created_at?: string
          enhanced_training_required?: boolean | null
          evidence_file_ids?: string[] | null
          id?: string
          last_training_date?: string | null
          notes?: string | null
          required_frequency?: string | null
          review_id: string
          training_completed?: boolean | null
          updated_at?: string
        }
        Update: {
          audience_name?: string
          audience_type?: string | null
          created_at?: string
          enhanced_training_required?: boolean | null
          evidence_file_ids?: string[] | null
          id?: string
          last_training_date?: string | null
          notes?: string | null
          required_frequency?: string | null
          review_id?: string
          training_completed?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_audiences_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "training_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      training_control_results: {
        Row: {
          comments: string | null
          control_area: string
          control_objective: string
          created_at: string
          deficiency_flag: boolean | null
          evidence_reviewed: string | null
          expected_outcome: string | null
          id: string
          max_points: number
          observation_best_practice: string | null
          points_achieved: number | null
          response: string | null
          review_id: string
          section_code: string
          section_name: string
          sort_order: number
          template_id: string | null
          test_procedure: string | null
          updated_at: string
        }
        Insert: {
          comments?: string | null
          control_area: string
          control_objective: string
          created_at?: string
          deficiency_flag?: boolean | null
          evidence_reviewed?: string | null
          expected_outcome?: string | null
          id?: string
          max_points?: number
          observation_best_practice?: string | null
          points_achieved?: number | null
          response?: string | null
          review_id: string
          section_code: string
          section_name: string
          sort_order?: number
          template_id?: string | null
          test_procedure?: string | null
          updated_at?: string
        }
        Update: {
          comments?: string | null
          control_area?: string
          control_objective?: string
          created_at?: string
          deficiency_flag?: boolean | null
          evidence_reviewed?: string | null
          expected_outcome?: string | null
          id?: string
          max_points?: number
          observation_best_practice?: string | null
          points_achieved?: number | null
          response?: string | null
          review_id?: string
          section_code?: string
          section_name?: string
          sort_order?: number
          template_id?: string | null
          test_procedure?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_control_results_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "training_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_control_results_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "training_question_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      training_evidence: {
        Row: {
          created_at: string
          description: string | null
          evidence_type: string
          file_id: string | null
          id: string
          notes: string | null
          review_id: string
          uploaded_at: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          evidence_type: string
          file_id?: string | null
          id?: string
          notes?: string | null
          review_id: string
          uploaded_at?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          evidence_type?: string
          file_id?: string | null
          id?: string
          notes?: string | null
          review_id?: string
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_evidence_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "evidence_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_evidence_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "training_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      training_issues: {
        Row: {
          category: string | null
          created_at: string
          engagement_id: string
          evidence_file_ids: string[] | null
          id: string
          is_auto_generated: boolean | null
          issue_description: string | null
          issue_title: string
          management_response: string | null
          recommendation: string | null
          review_id: string
          severity: Database["public"]["Enums"]["training_issue_severity"]
          source_question: string | null
          source_section: number | null
          status: Database["public"]["Enums"]["training_issue_status"]
          target_completion_date: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          engagement_id: string
          evidence_file_ids?: string[] | null
          id?: string
          is_auto_generated?: boolean | null
          issue_description?: string | null
          issue_title: string
          management_response?: string | null
          recommendation?: string | null
          review_id: string
          severity?: Database["public"]["Enums"]["training_issue_severity"]
          source_question?: string | null
          source_section?: number | null
          status?: Database["public"]["Enums"]["training_issue_status"]
          target_completion_date?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          engagement_id?: string
          evidence_file_ids?: string[] | null
          id?: string
          is_auto_generated?: boolean | null
          issue_description?: string | null
          issue_title?: string
          management_response?: string | null
          recommendation?: string | null
          review_id?: string
          severity?: Database["public"]["Enums"]["training_issue_severity"]
          source_question?: string | null
          source_section?: number | null
          status?: Database["public"]["Enums"]["training_issue_status"]
          target_completion_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_issues_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_issues_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "training_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      training_programs: {
        Row: {
          created_at: string
          evidence_file_ids: string[] | null
          id: string
          last_updated: string | null
          owner: string | null
          program_description: string | null
          program_name: string
          review_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          evidence_file_ids?: string[] | null
          id?: string
          last_updated?: string | null
          owner?: string | null
          program_description?: string | null
          program_name: string
          review_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          evidence_file_ids?: string[] | null
          id?: string
          last_updated?: string | null
          owner?: string | null
          program_description?: string | null
          program_name?: string
          review_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_programs_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "training_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      training_question_templates: {
        Row: {
          control_area: string
          control_objective: string
          created_at: string
          expected_outcome: string | null
          id: string
          is_active: boolean
          max_points: number
          section_code: string
          section_name: string
          sort_order: number
          test_procedure: string | null
        }
        Insert: {
          control_area: string
          control_objective: string
          created_at?: string
          expected_outcome?: string | null
          id?: string
          is_active?: boolean
          max_points?: number
          section_code: string
          section_name: string
          sort_order?: number
          test_procedure?: string | null
        }
        Update: {
          control_area?: string
          control_objective?: string
          created_at?: string
          expected_outcome?: string | null
          id?: string
          is_active?: boolean
          max_points?: number
          section_code?: string
          section_name?: string
          sort_order?: number
          test_procedure?: string | null
        }
        Relationships: []
      }
      training_reviews: {
        Row: {
          addresses_onboarding_vs_refresher: boolean | null
          addresses_sanctions_peps: boolean | null
          agents_trained: boolean | null
          aligned_with_risk_assessment: boolean | null
          assessment_results_retained: boolean | null
          assigns_ownership: boolean | null
          attendance_records_maintained: boolean | null
          completed_within_timelines: boolean | null
          content_reviewed_periodically: boolean | null
          covers_client_identification: boolean | null
          covers_reporting_obligations: boolean | null
          created_at: string
          current_step: number | null
          defines_mandatory_requirements: boolean | null
          defines_training_frequency: boolean | null
          defines_who_must_be_trained: boolean | null
          delivered_before_duties: boolean | null
          delivered_in_understood_language: boolean | null
          delivered_to_all_required_staff: boolean | null
          delivery_format:
            | Database["public"]["Enums"]["training_delivery_format"]
            | null
          delivery_tracked: boolean | null
          engagement_id: string
          enhanced_training_for_high_risk: boolean | null
          errors_linked_to_training_gaps: boolean | null
          evidence_linked_to_program_review: boolean | null
          exceptions_documented: boolean | null
          feedback_collected: boolean | null
          finalized_at: string | null
          finalized_by: string | null
          has_documented_policy: boolean | null
          id: string
          includes_escalation_procedures: boolean | null
          includes_sector_specific_risks: boolean | null
          incorporates_fintrac_guidance: boolean | null
          knowledge_assessments_used: boolean | null
          last_unlocked_at: string | null
          last_unlocked_by: string | null
          lock_state: string
          management_reviews_effectiveness: boolean | null
          materials_refreshed_on_incidents: boolean | null
          missed_trainings_remediated: boolean | null
          notes: string | null
          onboarding_training_delivered: boolean | null
          overall_assessment: string | null
          policy_accessible: boolean | null
          policy_aligned_with_pcmltfa: boolean | null
          policy_approved: boolean | null
          program_review_id: string | null
          records_available_for_fintrac: boolean | null
          records_centralized: boolean | null
          records_protected: boolean | null
          records_retained_per_requirements: boolean | null
          records_retained_required_periods: boolean | null
          records_show_who_when_what: boolean | null
          reflects_products_offered: boolean | null
          refresher_trainings_delivered: boolean | null
          required_to_pass: boolean | null
          requires_updates_on_change: boolean | null
          retraining_applied: boolean | null
          review_period_end: string | null
          review_period_start: string | null
          reviewer_name: string | null
          status: string
          str_quality_informs_updates: boolean | null
          suitable_format: boolean | null
          summary_for_report: string | null
          summary_narrative: string | null
          third_party_trainers_qualified: boolean | null
          training_approved_by: string | null
          training_date_approved: string | null
          training_delivered_in_period: boolean | null
          training_document_name: string | null
          training_improved_awareness: boolean | null
          training_mandatory: boolean | null
          training_tailored_by_role: boolean | null
          training_version: string | null
          unlock_count: number
          updated_at: string
          updated_for_new_products: boolean | null
        }
        Insert: {
          addresses_onboarding_vs_refresher?: boolean | null
          addresses_sanctions_peps?: boolean | null
          agents_trained?: boolean | null
          aligned_with_risk_assessment?: boolean | null
          assessment_results_retained?: boolean | null
          assigns_ownership?: boolean | null
          attendance_records_maintained?: boolean | null
          completed_within_timelines?: boolean | null
          content_reviewed_periodically?: boolean | null
          covers_client_identification?: boolean | null
          covers_reporting_obligations?: boolean | null
          created_at?: string
          current_step?: number | null
          defines_mandatory_requirements?: boolean | null
          defines_training_frequency?: boolean | null
          defines_who_must_be_trained?: boolean | null
          delivered_before_duties?: boolean | null
          delivered_in_understood_language?: boolean | null
          delivered_to_all_required_staff?: boolean | null
          delivery_format?:
            | Database["public"]["Enums"]["training_delivery_format"]
            | null
          delivery_tracked?: boolean | null
          engagement_id: string
          enhanced_training_for_high_risk?: boolean | null
          errors_linked_to_training_gaps?: boolean | null
          evidence_linked_to_program_review?: boolean | null
          exceptions_documented?: boolean | null
          feedback_collected?: boolean | null
          finalized_at?: string | null
          finalized_by?: string | null
          has_documented_policy?: boolean | null
          id?: string
          includes_escalation_procedures?: boolean | null
          includes_sector_specific_risks?: boolean | null
          incorporates_fintrac_guidance?: boolean | null
          knowledge_assessments_used?: boolean | null
          last_unlocked_at?: string | null
          last_unlocked_by?: string | null
          lock_state?: string
          management_reviews_effectiveness?: boolean | null
          materials_refreshed_on_incidents?: boolean | null
          missed_trainings_remediated?: boolean | null
          notes?: string | null
          onboarding_training_delivered?: boolean | null
          overall_assessment?: string | null
          policy_accessible?: boolean | null
          policy_aligned_with_pcmltfa?: boolean | null
          policy_approved?: boolean | null
          program_review_id?: string | null
          records_available_for_fintrac?: boolean | null
          records_centralized?: boolean | null
          records_protected?: boolean | null
          records_retained_per_requirements?: boolean | null
          records_retained_required_periods?: boolean | null
          records_show_who_when_what?: boolean | null
          reflects_products_offered?: boolean | null
          refresher_trainings_delivered?: boolean | null
          required_to_pass?: boolean | null
          requires_updates_on_change?: boolean | null
          retraining_applied?: boolean | null
          review_period_end?: string | null
          review_period_start?: string | null
          reviewer_name?: string | null
          status?: string
          str_quality_informs_updates?: boolean | null
          suitable_format?: boolean | null
          summary_for_report?: string | null
          summary_narrative?: string | null
          third_party_trainers_qualified?: boolean | null
          training_approved_by?: string | null
          training_date_approved?: string | null
          training_delivered_in_period?: boolean | null
          training_document_name?: string | null
          training_improved_awareness?: boolean | null
          training_mandatory?: boolean | null
          training_tailored_by_role?: boolean | null
          training_version?: string | null
          unlock_count?: number
          updated_at?: string
          updated_for_new_products?: boolean | null
        }
        Update: {
          addresses_onboarding_vs_refresher?: boolean | null
          addresses_sanctions_peps?: boolean | null
          agents_trained?: boolean | null
          aligned_with_risk_assessment?: boolean | null
          assessment_results_retained?: boolean | null
          assigns_ownership?: boolean | null
          attendance_records_maintained?: boolean | null
          completed_within_timelines?: boolean | null
          content_reviewed_periodically?: boolean | null
          covers_client_identification?: boolean | null
          covers_reporting_obligations?: boolean | null
          created_at?: string
          current_step?: number | null
          defines_mandatory_requirements?: boolean | null
          defines_training_frequency?: boolean | null
          defines_who_must_be_trained?: boolean | null
          delivered_before_duties?: boolean | null
          delivered_in_understood_language?: boolean | null
          delivered_to_all_required_staff?: boolean | null
          delivery_format?:
            | Database["public"]["Enums"]["training_delivery_format"]
            | null
          delivery_tracked?: boolean | null
          engagement_id?: string
          enhanced_training_for_high_risk?: boolean | null
          errors_linked_to_training_gaps?: boolean | null
          evidence_linked_to_program_review?: boolean | null
          exceptions_documented?: boolean | null
          feedback_collected?: boolean | null
          finalized_at?: string | null
          finalized_by?: string | null
          has_documented_policy?: boolean | null
          id?: string
          includes_escalation_procedures?: boolean | null
          includes_sector_specific_risks?: boolean | null
          incorporates_fintrac_guidance?: boolean | null
          knowledge_assessments_used?: boolean | null
          last_unlocked_at?: string | null
          last_unlocked_by?: string | null
          lock_state?: string
          management_reviews_effectiveness?: boolean | null
          materials_refreshed_on_incidents?: boolean | null
          missed_trainings_remediated?: boolean | null
          notes?: string | null
          onboarding_training_delivered?: boolean | null
          overall_assessment?: string | null
          policy_accessible?: boolean | null
          policy_aligned_with_pcmltfa?: boolean | null
          policy_approved?: boolean | null
          program_review_id?: string | null
          records_available_for_fintrac?: boolean | null
          records_centralized?: boolean | null
          records_protected?: boolean | null
          records_retained_per_requirements?: boolean | null
          records_retained_required_periods?: boolean | null
          records_show_who_when_what?: boolean | null
          reflects_products_offered?: boolean | null
          refresher_trainings_delivered?: boolean | null
          required_to_pass?: boolean | null
          requires_updates_on_change?: boolean | null
          retraining_applied?: boolean | null
          review_period_end?: string | null
          review_period_start?: string | null
          reviewer_name?: string | null
          status?: string
          str_quality_informs_updates?: boolean | null
          suitable_format?: boolean | null
          summary_for_report?: string | null
          summary_narrative?: string | null
          third_party_trainers_qualified?: boolean | null
          training_approved_by?: string | null
          training_date_approved?: string | null
          training_delivered_in_period?: boolean | null
          training_document_name?: string | null
          training_improved_awareness?: boolean | null
          training_mandatory?: boolean | null
          training_tailored_by_role?: boolean | null
          training_version?: string | null
          unlock_count?: number
          updated_at?: string
          updated_for_new_products?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "training_reviews_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: true
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_reviews_program_review_id_fkey"
            columns: ["program_review_id"]
            isOneToOne: false
            referencedRelation: "aml_program_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      training_sessions: {
        Row: {
          assessment_conducted: boolean | null
          attendee_count: number | null
          created_at: string
          delivery_format:
            | Database["public"]["Enums"]["training_delivery_format"]
            | null
          evidence_file_ids: string[] | null
          id: string
          notes: string | null
          pass_rate: number | null
          review_id: string
          session_date: string | null
          session_name: string
          topics_covered: string[] | null
          trainer_name: string | null
          trainer_type: string | null
          updated_at: string
        }
        Insert: {
          assessment_conducted?: boolean | null
          attendee_count?: number | null
          created_at?: string
          delivery_format?:
            | Database["public"]["Enums"]["training_delivery_format"]
            | null
          evidence_file_ids?: string[] | null
          id?: string
          notes?: string | null
          pass_rate?: number | null
          review_id: string
          session_date?: string | null
          session_name: string
          topics_covered?: string[] | null
          trainer_name?: string | null
          trainer_type?: string | null
          updated_at?: string
        }
        Update: {
          assessment_conducted?: boolean | null
          attendee_count?: number | null
          created_at?: string
          delivery_format?:
            | Database["public"]["Enums"]["training_delivery_format"]
            | null
          evidence_file_ids?: string[] | null
          id?: string
          notes?: string | null
          pass_rate?: number | null
          review_id?: string
          session_date?: string | null
          session_name?: string
          topics_covered?: string[] | null
          trainer_name?: string | null
          trainer_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_sessions_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "training_reviews"
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
      workpapers: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          conclusion: string | null
          created_at: string
          engagement_id: string
          id: string
          module: string
          objective: string | null
          owner_id: string | null
          results: string | null
          reviewer_id: string | null
          status: string
          submodule: string | null
          testing_steps: string | null
          title: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          conclusion?: string | null
          created_at?: string
          engagement_id: string
          id?: string
          module: string
          objective?: string | null
          owner_id?: string | null
          results?: string | null
          reviewer_id?: string | null
          status?: string
          submodule?: string | null
          testing_steps?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          conclusion?: string | null
          created_at?: string
          engagement_id?: string
          id?: string
          module?: string
          objective?: string | null
          owner_id?: string | null
          results?: string | null
          reviewer_id?: string | null
          status?: string
          submodule?: string | null
          testing_steps?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workpapers_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_create_clients: { Args: { _user_id: string }; Returns: boolean }
      can_edit_audit_report: { Args: { _user_id: string }; Returns: boolean }
      can_edit_findings: { Args: { _user_id: string }; Returns: boolean }
      can_finalize_audit_report: {
        Args: { _user_id: string }
        Returns: boolean
      }
      can_read_aml_program_review: {
        Args: { _program_review_id: string; _user_id: string }
        Returns: boolean
      }
      can_read_effectiveness_review: {
        Args: { _review_id: string; _user_id: string }
        Returns: boolean
      }
      can_read_kyc_review: {
        Args: { _review_id: string; _user_id: string }
        Returns: boolean
      }
      can_read_reporting_review: {
        Args: { _review_id: string; _user_id: string }
        Returns: boolean
      }
      can_read_risk_assessment_review: {
        Args: { _review_id: string; _user_id: string }
        Returns: boolean
      }
      can_read_tm_review: {
        Args: { _review_id: string; _user_id: string }
        Returns: boolean
      }
      can_read_training_review: {
        Args: { _review_id: string; _user_id: string }
        Returns: boolean
      }
      can_unlock_audit_report: { Args: { _user_id: string }; Returns: boolean }
      can_write_aml_program_review: {
        Args: { _program_review_id: string; _user_id: string }
        Returns: boolean
      }
      can_write_audit_report: {
        Args: { _report_id: string; _user_id: string }
        Returns: boolean
      }
      can_write_effectiveness_review: {
        Args: { _review_id: string; _user_id: string }
        Returns: boolean
      }
      can_write_kyc_review: {
        Args: { _review_id: string; _user_id: string }
        Returns: boolean
      }
      can_write_reporting_review: {
        Args: { _review_id: string; _user_id: string }
        Returns: boolean
      }
      can_write_risk_assessment_review: {
        Args: { _review_id: string; _user_id: string }
        Returns: boolean
      }
      can_write_tm_review: {
        Args: { _review_id: string; _user_id: string }
        Returns: boolean
      }
      can_write_training_review: {
        Args: { _review_id: string; _user_id: string }
        Returns: boolean
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_client_access: {
        Args: { _client_id: string; _user_id: string }
        Returns: boolean
      }
      has_client_portal_access: {
        Args: { _engagement_id: string; _user_id: string }
        Returns: boolean
      }
      has_engagement_access: {
        Args: { _engagement_id: string; _user_id: string }
        Returns: boolean
      }
      has_module_access: {
        Args: { _engagement_id: string; _module: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      initialize_audit_report_sections: {
        Args: { p_report_id: string }
        Returns: undefined
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_client_user: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "analyst"
        | "manager"
        | "lead_consultant"
        | "partner"
        | "admin"
        | "client_user"
      filing_method: "manual" | "batch"
      kyc_identification_method:
        | "government_id"
        | "credit_file"
        | "dual_process"
        | "affiliate"
        | "other"
      kyc_issue_severity: "high" | "medium" | "low"
      kyc_issue_status: "open" | "in_progress" | "closed"
      kyc_sample_source: "transaction" | "customer" | "mixed"
      kyc_triggered_obligation:
        | "onboarding"
        | "transaction"
        | "lctr"
        | "eft"
        | "vc_transaction"
        | "remittance"
      obligation_nature: "mandatory" | "reasonable_measures" | "best_practice"
      rba_issue_severity: "low" | "medium" | "high"
      rba_review_type: "baseline" | "intermediate" | "advanced"
      rba_risk_factor_category:
        | "products_services"
        | "delivery_channels"
        | "geography"
        | "technology"
        | "third_parties"
        | "other"
      rba_segment_type:
        | "individual_clients"
        | "business_clients"
        | "agents"
        | "high_risk_exceptions"
      remediation_status:
        | "open"
        | "in_progress"
        | "remediated"
        | "accepted_risk"
        | "closed"
      reporting_finding_severity: "low" | "medium" | "high" | "critical"
      reporting_finding_status: "open" | "in_progress" | "resolved" | "closed"
      reporting_type: "lctr" | "eftr" | "str" | "lvctr" | "lpepr"
      risk_rating: "low" | "medium" | "high"
      test_result_enum: "pass" | "fail" | "na" | "pending"
      training_delivery_format: "internal" | "external" | "both"
      training_issue_severity: "high" | "medium" | "low"
      training_issue_status: "open" | "in_progress" | "closed"
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
      app_role: [
        "analyst",
        "manager",
        "lead_consultant",
        "partner",
        "admin",
        "client_user",
      ],
      filing_method: ["manual", "batch"],
      kyc_identification_method: [
        "government_id",
        "credit_file",
        "dual_process",
        "affiliate",
        "other",
      ],
      kyc_issue_severity: ["high", "medium", "low"],
      kyc_issue_status: ["open", "in_progress", "closed"],
      kyc_sample_source: ["transaction", "customer", "mixed"],
      kyc_triggered_obligation: [
        "onboarding",
        "transaction",
        "lctr",
        "eft",
        "vc_transaction",
        "remittance",
      ],
      obligation_nature: ["mandatory", "reasonable_measures", "best_practice"],
      rba_issue_severity: ["low", "medium", "high"],
      rba_review_type: ["baseline", "intermediate", "advanced"],
      rba_risk_factor_category: [
        "products_services",
        "delivery_channels",
        "geography",
        "technology",
        "third_parties",
        "other",
      ],
      rba_segment_type: [
        "individual_clients",
        "business_clients",
        "agents",
        "high_risk_exceptions",
      ],
      remediation_status: [
        "open",
        "in_progress",
        "remediated",
        "accepted_risk",
        "closed",
      ],
      reporting_finding_severity: ["low", "medium", "high", "critical"],
      reporting_finding_status: ["open", "in_progress", "resolved", "closed"],
      reporting_type: ["lctr", "eftr", "str", "lvctr", "lpepr"],
      risk_rating: ["low", "medium", "high"],
      test_result_enum: ["pass", "fail", "na", "pending"],
      training_delivery_format: ["internal", "external", "both"],
      training_issue_severity: ["high", "medium", "low"],
      training_issue_status: ["open", "in_progress", "closed"],
    },
  },
} as const
