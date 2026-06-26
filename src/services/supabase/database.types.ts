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
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
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
      athlete_coach_relationships: {
        Row: {
          athlete_user_id: string
          coach_user_id: string
          created_at: string
          id: string
          permissions: Json
          status: string
          updated_at: string
        }
        Insert: {
          athlete_user_id: string
          coach_user_id: string
          created_at?: string
          id?: string
          permissions?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          athlete_user_id?: string
          coach_user_id?: string
          created_at?: string
          id?: string
          permissions?: Json
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      athlete_journey_events: {
        Row: {
          created_at: string
          event_key: string | null
          event_payload: Json
          event_type: string
          id: string
          occurred_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_key?: string | null
          event_payload?: Json
          event_type: string
          id?: string
          occurred_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_key?: string | null
          event_payload?: Json
          event_type?: string
          id?: string
          occurred_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      athlete_profiles: {
        Row: {
          created_at: string
          id: string
          profile: Json
          sensitive_cycle: Json
          sensitive_medical: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          profile?: Json
          sensitive_cycle?: Json
          sensitive_medical?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          profile?: Json
          sensitive_cycle?: Json
          sensitive_medical?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      body_mass_logs: {
        Row: {
          body_mass_kg: number
          created_at: string
          id: string
          log_date: string
          recorded_at: string | null
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body_mass_kg: number
          created_at?: string
          id?: string
          log_date: string
          recorded_at?: string | null
          source: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body_mass_kg?: number
          created_at?: string
          id?: string
          log_date?: string
          recorded_at?: string | null
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      completed_training_sessions: {
        Row: {
          completed_date: string
          completion_key: string | null
          created_at: string
          generated_session_id: string | null
          id: string
          performed_date: string | null
          planned_date: string | null
          recorded_at: string | null
          resolution_lifecycle: string
          session_payload: Json
          superseded_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_date: string
          completion_key?: string | null
          created_at?: string
          generated_session_id?: string | null
          id?: string
          performed_date?: string | null
          planned_date?: string | null
          recorded_at?: string | null
          resolution_lifecycle?: string
          session_payload?: Json
          superseded_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_date?: string
          completion_key?: string | null
          created_at?: string
          generated_session_id?: string | null
          id?: string
          performed_date?: string | null
          planned_date?: string | null
          recorded_at?: string | null
          resolution_lifecycle?: string
          session_payload?: Json
          superseded_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cycle_logs: {
        Row: {
          created_at: string
          cycle_payload: Json
          id: string
          log_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          cycle_payload?: Json
          id?: string
          log_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          cycle_payload?: Json
          id?: string
          log_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cycle_symptom_logs: {
        Row: {
          created_at: string
          id: string
          log_date: string
          symptom_payload: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          log_date: string
          symptom_payload?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          log_date?: string
          symptom_payload?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      decision_traces: {
        Row: {
          created_at: string
          engine: string
          engine_run_id: string | null
          id: string
          step: string
          trace_payload: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          engine: string
          engine_run_id?: string | null
          id?: string
          step: string
          trace_payload?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          engine?: string
          engine_run_id?: string | null
          id?: string
          step?: string
          trace_payload?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "decision_traces_engine_run_id_fkey"
            columns: ["engine_run_id"]
            isOneToOne: false
            referencedRelation: "engine_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      electrolyte_logs: {
        Row: {
          created_at: string
          electrolyte_payload: Json
          id: string
          log_date: string
          sodium_mg: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          electrolyte_payload?: Json
          id?: string
          log_date: string
          sodium_mg: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          electrolyte_payload?: Json
          id?: string
          log_date?: string
          sodium_mg?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      engine_runs: {
        Row: {
          as_of_date: string
          created_at: string
          engine_version: string
          id: string
          input_hash: string
          invalidated_at: string | null
          invalidation_reason: string | null
          output_hash: string
          run_payload: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          as_of_date: string
          created_at?: string
          engine_version: string
          id?: string
          input_hash: string
          invalidated_at?: string | null
          invalidation_reason?: string | null
          output_hash: string
          run_payload?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          as_of_date?: string
          created_at?: string
          engine_version?: string
          id?: string
          input_hash?: string
          invalidated_at?: string | null
          invalidation_reason?: string | null
          output_hash?: string
          run_payload?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      exercise_results: {
        Row: {
          adaptation: string | null
          completed_at: string | null
          completed_training_session_id: string | null
          created_at: string
          exercise_id: string | null
          exercise_key: string
          exercise_name: string | null
          generated_training_session_id: string | null
          id: string
          movement_pattern: string | null
          recorded_at: string
          result_key: string | null
          result_payload: Json
          source: string | null
          template_block_id: string | null
          template_id: string | null
          template_slot_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          adaptation?: string | null
          completed_at?: string | null
          completed_training_session_id?: string | null
          created_at?: string
          exercise_id?: string | null
          exercise_key: string
          exercise_name?: string | null
          generated_training_session_id?: string | null
          id?: string
          movement_pattern?: string | null
          recorded_at?: string
          result_key?: string | null
          result_payload?: Json
          source?: string | null
          template_block_id?: string | null
          template_id?: string | null
          template_slot_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          adaptation?: string | null
          completed_at?: string | null
          completed_training_session_id?: string | null
          created_at?: string
          exercise_id?: string | null
          exercise_key?: string
          exercise_name?: string | null
          generated_training_session_id?: string | null
          id?: string
          movement_pattern?: string | null
          recorded_at?: string
          result_key?: string | null
          result_payload?: Json
          source?: string | null
          template_block_id?: string | null
          template_id?: string | null
          template_slot_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_results_completed_training_session_id_fkey"
            columns: ["completed_training_session_id"]
            isOneToOne: false
            referencedRelation: "completed_training_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_results_generated_training_session_id_fkey"
            columns: ["generated_training_session_id"]
            isOneToOne: false
            referencedRelation: "generated_training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      fight_opportunities: {
        Row: {
          bout_date: string
          created_at: string
          fight_payload: Json
          id: string
          status: string
          updated_at: string
          user_id: string
          weigh_in_datetime: string | null
          weigh_in_type: string
        }
        Insert: {
          bout_date: string
          created_at?: string
          fight_payload?: Json
          id?: string
          status: string
          updated_at?: string
          user_id: string
          weigh_in_datetime?: string | null
          weigh_in_type: string
        }
        Update: {
          bout_date?: string
          created_at?: string
          fight_payload?: Json
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
          weigh_in_datetime?: string | null
          weigh_in_type?: string
        }
        Relationships: []
      }
      fight_week_protocols: {
        Row: {
          created_at: string
          engine_version: string
          id: string
          protocol_payload: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          engine_version: string
          id?: string
          protocol_payload?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          engine_version?: string
          id?: string
          protocol_payload?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      food_logs: {
        Row: {
          created_at: string
          id: string
          log_date: string
          meal_payload: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          log_date: string
          meal_payload?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          log_date?: string
          meal_payload?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      generated_training_blocks: {
        Row: {
          block_payload: Json
          created_at: string
          engine_version: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          block_payload?: Json
          created_at?: string
          engine_version: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          block_payload?: Json
          created_at?: string
          engine_version?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      generated_training_sessions: {
        Row: {
          block_id: string | null
          created_at: string
          current_scheduled_date: string | null
          engine_version: string
          generated_session_key: string | null
          generated_session_lifecycle: string
          id: string
          original_planned_date: string | null
          plan_revision_id: string | null
          planned_date: string
          prescription_slot_id: string | null
          session_payload: Json
          updated_at: string
          user_id: string
          week_id: string | null
          week_index: number | null
        }
        Insert: {
          block_id?: string | null
          created_at?: string
          current_scheduled_date?: string | null
          engine_version: string
          generated_session_key?: string | null
          generated_session_lifecycle?: string
          id?: string
          original_planned_date?: string | null
          plan_revision_id?: string | null
          planned_date: string
          prescription_slot_id?: string | null
          session_payload?: Json
          updated_at?: string
          user_id: string
          week_id?: string | null
          week_index?: number | null
        }
        Update: {
          block_id?: string | null
          created_at?: string
          current_scheduled_date?: string | null
          engine_version?: string
          generated_session_key?: string | null
          generated_session_lifecycle?: string
          id?: string
          original_planned_date?: string | null
          plan_revision_id?: string | null
          planned_date?: string
          prescription_slot_id?: string | null
          session_payload?: Json
          updated_at?: string
          user_id?: string
          week_id?: string | null
          week_index?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_training_sessions_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "training_blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      nutrition_safety_review_events: {
        Row: {
          actor_type: string
          actor_user_id: string | null
          created_at: string
          event_payload: Json
          event_type: string
          id: string
          nutrition_safety_review_id: string
          user_id: string
        }
        Insert: {
          actor_type?: string
          actor_user_id?: string | null
          created_at?: string
          event_payload?: Json
          event_type: string
          id?: string
          nutrition_safety_review_id: string
          user_id: string
        }
        Update: {
          actor_type?: string
          actor_user_id?: string | null
          created_at?: string
          event_payload?: Json
          event_type?: string
          id?: string
          nutrition_safety_review_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nutrition_safety_review_events_nutrition_safety_review_id_fkey"
            columns: ["nutrition_safety_review_id"]
            isOneToOne: false
            referencedRelation: "nutrition_safety_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      nutrition_safety_reviews: {
        Row: {
          as_of_date: string
          blocking_flags: Json
          created_at: string
          engine_version: string
          hard_stop: boolean
          id: string
          input_hash: string
          output_hash: string
          reasons: Json
          review_type: string
          reviewed_at: string | null
          reviewer_role: string | null
          reviewer_user_id: string | null
          severity: string
          source_payload: Json
          status: string
          suggested_next_steps: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          as_of_date: string
          blocking_flags?: Json
          created_at?: string
          engine_version: string
          hard_stop?: boolean
          id?: string
          input_hash: string
          output_hash: string
          reasons?: Json
          review_type: string
          reviewed_at?: string | null
          reviewer_role?: string | null
          reviewer_user_id?: string | null
          severity?: string
          source_payload?: Json
          status?: string
          suggested_next_steps?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          as_of_date?: string
          blocking_flags?: Json
          created_at?: string
          engine_version?: string
          hard_stop?: boolean
          id?: string
          input_hash?: string
          output_hash?: string
          reasons?: Json
          review_type?: string
          reviewed_at?: string | null
          reviewer_role?: string | null
          reviewer_user_id?: string | null
          severity?: string
          source_payload?: Json
          status?: string
          suggested_next_steps?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      nutrition_targets: {
        Row: {
          created_at: string
          engine_version: string
          id: string
          target_date: string
          target_payload: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          engine_version: string
          id?: string
          target_date: string
          target_payload?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          engine_version?: string
          id?: string
          target_date?: string
          target_payload?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      protected_workouts: {
        Row: {
          created_at: string
          id: string
          updated_at: string
          user_id: string
          workout_date: string
          workout_payload: Json
          workout_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          workout_date: string
          workout_payload?: Json
          workout_type: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          workout_date?: string
          workout_payload?: Json
          workout_type?: string
        }
        Relationships: []
      }
      readiness_checkins: {
        Row: {
          checkin_date: string
          checkin_payload: Json
          created_at: string
          id: string
          recorded_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          checkin_date: string
          checkin_payload?: Json
          created_at?: string
          id?: string
          recorded_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          checkin_date?: string
          checkin_payload?: Json
          created_at?: string
          id?: string
          recorded_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rehydration_plans: {
        Row: {
          created_at: string
          engine_version: string
          id: string
          plan_payload: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          engine_version: string
          id?: string
          plan_payload?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          engine_version?: string
          id?: string
          plan_payload?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      risk_flags: {
        Row: {
          code: string
          created_at: string
          domain: string
          flag_payload: Json
          id: string
          severity: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          domain: string
          flag_payload?: Json
          id?: string
          severity: string
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          domain?: string
          flag_payload?: Json
          id?: string
          severity?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tournament_plans: {
        Row: {
          created_at: string
          id: string
          plan_payload: Json
          tournament_end_date: string
          tournament_start_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          plan_payload?: Json
          tournament_end_date: string
          tournament_start_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          plan_payload?: Json
          tournament_end_date?: string
          tournament_start_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      training_block_timeline_events: {
        Row: {
          created_at: string
          event_date: string
          event_key: string
          event_payload: Json
          event_type: string
          id: string
          training_block_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_date: string
          event_key: string
          event_payload?: Json
          event_type: string
          id?: string
          training_block_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_date?: string
          event_key?: string
          event_payload?: Json
          event_type?: string
          id?: string
          training_block_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_block_timeline_events_training_block_id_fkey"
            columns: ["training_block_id"]
            isOneToOne: false
            referencedRelation: "training_blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      training_blocks: {
        Row: {
          athlete_id: string
          block_key: string
          block_payload: Json
          block_phase: string
          created_at: string
          created_by: string
          end_date: string
          engine_version: string
          id: string
          input_hash: string
          linked_fight_id: string | null
          linked_tournament_id: string | null
          output_hash: string
          plan_revision_id: string | null
          primary_goal: string
          start_date: string
          status: string
          superseded_at: string | null
          superseded_by: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          athlete_id: string
          block_key: string
          block_payload?: Json
          block_phase: string
          created_at?: string
          created_by?: string
          end_date: string
          engine_version: string
          id?: string
          input_hash: string
          linked_fight_id?: string | null
          linked_tournament_id?: string | null
          output_hash: string
          plan_revision_id?: string | null
          primary_goal: string
          start_date: string
          status?: string
          superseded_at?: string | null
          superseded_by?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          athlete_id?: string
          block_key?: string
          block_payload?: Json
          block_phase?: string
          created_at?: string
          created_by?: string
          end_date?: string
          engine_version?: string
          id?: string
          input_hash?: string
          linked_fight_id?: string | null
          linked_tournament_id?: string | null
          output_hash?: string
          plan_revision_id?: string | null
          primary_goal?: string
          start_date?: string
          status?: string
          superseded_at?: string | null
          superseded_by?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_blocks_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "training_blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      training_day_plans: {
        Row: {
          created_at: string
          day_payload: Json
          fuel_demand: string
          hard_day: boolean
          id: string
          plan_date: string
          recovery_priority: string
          role: string
          training_block_id: string
          training_microcycle_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_payload?: Json
          fuel_demand: string
          hard_day?: boolean
          id?: string
          plan_date: string
          recovery_priority: string
          role: string
          training_block_id: string
          training_microcycle_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_payload?: Json
          fuel_demand?: string
          hard_day?: boolean
          id?: string
          plan_date?: string
          recovery_priority?: string
          role?: string
          training_block_id?: string
          training_microcycle_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_day_plans_training_block_id_fkey"
            columns: ["training_block_id"]
            isOneToOne: false
            referencedRelation: "training_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_day_plans_training_microcycle_id_fkey"
            columns: ["training_microcycle_id"]
            isOneToOne: false
            referencedRelation: "training_microcycles"
            referencedColumns: ["id"]
          },
        ]
      }
      training_microcycles: {
        Row: {
          created_at: string
          hard_day_cap: number
          id: string
          microcycle_payload: Json
          planned_hard_days: number
          training_block_id: string
          updated_at: string
          user_id: string
          week_end_date: string
          week_index: number
          week_start_date: string
        }
        Insert: {
          created_at?: string
          hard_day_cap: number
          id?: string
          microcycle_payload?: Json
          planned_hard_days: number
          training_block_id: string
          updated_at?: string
          user_id: string
          week_end_date: string
          week_index?: number
          week_start_date: string
        }
        Update: {
          created_at?: string
          hard_day_cap?: number
          id?: string
          microcycle_payload?: Json
          planned_hard_days?: number
          training_block_id?: string
          updated_at?: string
          user_id?: string
          week_end_date?: string
          week_index?: number
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_microcycles_training_block_id_fkey"
            columns: ["training_block_id"]
            isOneToOne: false
            referencedRelation: "training_blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      training_next_week_previews: {
        Row: {
          accepted_at: string | null
          created_at: string
          engine_version: string
          generated_support_bias: string
          id: string
          input_hash: string
          materialized_at: string | null
          materialized_decision: string
          materialized_phase: string
          output_hash: string
          preview_payload: Json
          status: string
          superseded_at: string | null
          target_hard_day_cap: number
          training_block_id: string
          updated_at: string
          user_id: string
          volume_strategy: string
          week_end_date: string
          week_index: number
          week_start_date: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          engine_version: string
          generated_support_bias: string
          id?: string
          input_hash: string
          materialized_at?: string | null
          materialized_decision: string
          materialized_phase: string
          output_hash: string
          preview_payload?: Json
          status?: string
          superseded_at?: string | null
          target_hard_day_cap: number
          training_block_id: string
          updated_at?: string
          user_id: string
          volume_strategy: string
          week_end_date: string
          week_index: number
          week_start_date: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          engine_version?: string
          generated_support_bias?: string
          id?: string
          input_hash?: string
          materialized_at?: string | null
          materialized_decision?: string
          materialized_phase?: string
          output_hash?: string
          preview_payload?: Json
          status?: string
          superseded_at?: string | null
          target_hard_day_cap?: number
          training_block_id?: string
          updated_at?: string
          user_id?: string
          volume_strategy?: string
          week_end_date?: string
          week_index?: number
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_next_week_previews_training_block_id_fkey"
            columns: ["training_block_id"]
            isOneToOne: false
            referencedRelation: "training_blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      training_plan_adjustments: {
        Row: {
          adjustment_payload: Json
          adjustment_type: string
          created_at: string
          engine_response_payload: Json
          id: string
          plan_date: string | null
          status: string
          training_block_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          adjustment_payload?: Json
          adjustment_type: string
          created_at?: string
          engine_response_payload?: Json
          id?: string
          plan_date?: string | null
          status?: string
          training_block_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          adjustment_payload?: Json
          adjustment_type?: string
          created_at?: string
          engine_response_payload?: Json
          id?: string
          plan_date?: string | null
          status?: string
          training_block_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_plan_adjustments_training_block_id_fkey"
            columns: ["training_block_id"]
            isOneToOne: false
            referencedRelation: "training_blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      training_plan_intents: {
        Row: {
          action: string
          created_at: string
          current_limitations: Json
          equipment: Json
          goal_mode: string
          id: string
          intent_payload: Json
          max_session_duration_minutes: number | null
          modality_avoidances: Json
          modality_preferences: Json
          plan_revision_id: string
          plan_start_date: string
          preferred_session_duration_minutes: number | null
          primary_focus: string
          requested_at: string
          selected_support_days: Json
          source: string
          status: string
          sub_focus: string | null
          superseded_at: string | null
          superseded_reason: string | null
          target_block_length_weeks: number | null
          training_dose: string
          updated_at: string
          user_id: string
          user_preferences: Json
        }
        Insert: {
          action: string
          created_at?: string
          current_limitations?: Json
          equipment?: Json
          goal_mode: string
          id?: string
          intent_payload?: Json
          max_session_duration_minutes?: number | null
          modality_avoidances?: Json
          modality_preferences?: Json
          plan_revision_id: string
          plan_start_date: string
          preferred_session_duration_minutes?: number | null
          primary_focus: string
          requested_at: string
          selected_support_days?: Json
          source?: string
          status?: string
          sub_focus?: string | null
          superseded_at?: string | null
          superseded_reason?: string | null
          target_block_length_weeks?: number | null
          training_dose: string
          updated_at?: string
          user_id: string
          user_preferences?: Json
        }
        Update: {
          action?: string
          created_at?: string
          current_limitations?: Json
          equipment?: Json
          goal_mode?: string
          id?: string
          intent_payload?: Json
          max_session_duration_minutes?: number | null
          modality_avoidances?: Json
          modality_preferences?: Json
          plan_revision_id?: string
          plan_start_date?: string
          preferred_session_duration_minutes?: number | null
          primary_focus?: string
          requested_at?: string
          selected_support_days?: Json
          source?: string
          status?: string
          sub_focus?: string | null
          superseded_at?: string | null
          superseded_reason?: string | null
          target_block_length_weeks?: number | null
          training_dose?: string
          updated_at?: string
          user_id?: string
          user_preferences?: Json
        }
        Relationships: []
      }
      training_progression_decisions: {
        Row: {
          created_at: string
          decision: string
          decision_authority_key: string
          decision_lifecycle: string
          decision_payload: Json
          engine_version: string
          generated_at: string | null
          id: string
          input_hash: string
          next_week_phase: string | null
          output_hash: string
          plan_revision_id: string | null
          reason: string
          training_block_id: string
          updated_at: string
          user_id: string
          week_index: number
          week_summary_id: string | null
        }
        Insert: {
          created_at?: string
          decision: string
          decision_authority_key: string
          decision_lifecycle?: string
          decision_payload?: Json
          engine_version: string
          generated_at?: string | null
          id?: string
          input_hash: string
          next_week_phase?: string | null
          output_hash: string
          plan_revision_id?: string | null
          reason: string
          training_block_id: string
          updated_at?: string
          user_id: string
          week_index: number
          week_summary_id?: string | null
        }
        Update: {
          created_at?: string
          decision?: string
          decision_authority_key?: string
          decision_lifecycle?: string
          decision_payload?: Json
          engine_version?: string
          generated_at?: string | null
          id?: string
          input_hash?: string
          next_week_phase?: string | null
          output_hash?: string
          plan_revision_id?: string | null
          reason?: string
          training_block_id?: string
          updated_at?: string
          user_id?: string
          week_index?: number
          week_summary_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_progression_decisions_training_block_id_fkey"
            columns: ["training_block_id"]
            isOneToOne: false
            referencedRelation: "training_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_progression_decisions_week_summary_id_fkey"
            columns: ["week_summary_id"]
            isOneToOne: false
            referencedRelation: "training_week_summaries"
            referencedColumns: ["id"]
          },
        ]
      }
      training_week_summaries: {
        Row: {
          average_exercise_rpe: number | null
          average_session_rpe: number | null
          completed_result_count: number
          completion_count: number
          created_at: string
          finalized_at: string | null
          generated_support_count: number
          hard_days_completed: number
          high_cycle_symptom_flag: boolean
          id: string
          pain_flag_count: number
          partial_result_count: number
          plan_revision_id: string | null
          prescribed_only_count: number
          protected_anchor_count: number
          safety_flag_count: number
          skipped_count: number
          summary_authority_key: string
          summary_generated_at: string | null
          summary_lifecycle: string
          summary_payload: Json
          training_block_id: string
          training_microcycle_id: string | null
          underfueling_flag: boolean
          updated_at: string
          user_id: string
          week_end_date: string
          week_index: number
          week_start_date: string
        }
        Insert: {
          average_exercise_rpe?: number | null
          average_session_rpe?: number | null
          completed_result_count?: number
          completion_count?: number
          created_at?: string
          finalized_at?: string | null
          generated_support_count?: number
          hard_days_completed?: number
          high_cycle_symptom_flag?: boolean
          id?: string
          pain_flag_count?: number
          partial_result_count?: number
          plan_revision_id?: string | null
          prescribed_only_count?: number
          protected_anchor_count?: number
          safety_flag_count?: number
          skipped_count?: number
          summary_authority_key: string
          summary_generated_at?: string | null
          summary_lifecycle?: string
          summary_payload?: Json
          training_block_id: string
          training_microcycle_id?: string | null
          underfueling_flag?: boolean
          updated_at?: string
          user_id: string
          week_end_date: string
          week_index: number
          week_start_date: string
        }
        Update: {
          average_exercise_rpe?: number | null
          average_session_rpe?: number | null
          completed_result_count?: number
          completion_count?: number
          created_at?: string
          finalized_at?: string | null
          generated_support_count?: number
          hard_days_completed?: number
          high_cycle_symptom_flag?: boolean
          id?: string
          pain_flag_count?: number
          partial_result_count?: number
          plan_revision_id?: string | null
          prescribed_only_count?: number
          protected_anchor_count?: number
          safety_flag_count?: number
          skipped_count?: number
          summary_authority_key?: string
          summary_generated_at?: string | null
          summary_lifecycle?: string
          summary_payload?: Json
          training_block_id?: string
          training_microcycle_id?: string | null
          underfueling_flag?: boolean
          updated_at?: string
          user_id?: string
          week_end_date?: string
          week_index?: number
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_week_summaries_training_block_id_fkey"
            columns: ["training_block_id"]
            isOneToOne: false
            referencedRelation: "training_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_week_summaries_training_microcycle_id_fkey"
            columns: ["training_microcycle_id"]
            isOneToOne: false
            referencedRelation: "training_microcycles"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_completion_operations: {
        Row: {
          completed_training_session_id: string | null
          completion_key: string
          created_at: string
          event_key: string | null
          generated_session_id: string
          id: string
          operation_key: string
          operation_payload: Json
          operation_status: string
          recorded_at: string
          result_keys: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_training_session_id?: string | null
          completion_key: string
          created_at?: string
          event_key?: string | null
          generated_session_id: string
          id?: string
          operation_key: string
          operation_payload?: Json
          operation_status?: string
          recorded_at?: string
          result_keys?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_training_session_id?: string | null
          completion_key?: string
          created_at?: string
          event_key?: string | null
          generated_session_id?: string
          id?: string
          operation_key?: string
          operation_payload?: Json
          operation_status?: string
          recorded_at?: string
          result_keys?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_completion_operations_completed_training_session_id_fkey"
            columns: ["completed_training_session_id"]
            isOneToOne: false
            referencedRelation: "completed_training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      users_public: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      water_logs: {
        Row: {
          created_at: string
          id: string
          liters: number
          log_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          liters: number
          log_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          liters?: number
          log_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wearable_connections: {
        Row: {
          created_at: string
          id: string
          permission_payload: Json
          platform: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          permission_payload?: Json
          platform: string
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          permission_payload?: Json
          platform?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wearable_signal_logs: {
        Row: {
          created_at: string
          id: string
          recorded_at: string
          signal_payload: Json
          signal_type: string
          signal_unit: string
          signal_value: number
          source_platform: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          recorded_at: string
          signal_payload?: Json
          signal_type: string
          signal_unit: string
          signal_value: number
          source_platform: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          recorded_at?: string
          signal_payload?: Json
          signal_type?: string
          signal_unit?: string
          signal_value?: number
          source_platform?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      weigh_in_logs: {
        Row: {
          body_mass_kg: number
          created_at: string
          id: string
          official: boolean
          updated_at: string
          user_id: string
          weigh_in_at: string
          weigh_in_payload: Json
        }
        Insert: {
          body_mass_kg: number
          created_at?: string
          id?: string
          official?: boolean
          updated_at?: string
          user_id: string
          weigh_in_at: string
          weigh_in_payload?: Json
        }
        Update: {
          body_mass_kg?: number
          created_at?: string
          id?: string
          official?: boolean
          updated_at?: string
          user_id?: string
          weigh_in_at?: string
          weigh_in_payload?: Json
        }
        Relationships: []
      }
      weight_class_plans: {
        Row: {
          created_at: string
          engine_version: string
          id: string
          plan_payload: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          engine_version: string
          id?: string
          plan_payload?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          engine_version?: string
          id?: string
          plan_payload?: Json
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
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
