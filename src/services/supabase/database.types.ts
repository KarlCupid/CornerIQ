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
      athlete_journey_events: {
        Row: {
          created_at: string
          event_payload: Json
          event_type: string
          id: string
          occurred_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_payload?: Json
          event_type: string
          id?: string
          occurred_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
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
          created_at: string
          id: string
          session_payload: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_date: string
          created_at?: string
          id?: string
          session_payload?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_date?: string
          created_at?: string
          id?: string
          session_payload?: Json
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
          completed_at: string | null
          completed_training_session_id: string | null
          created_at: string
          exercise_id: string | null
          exercise_key: string
          exercise_name: string | null
          generated_training_session_id: string | null
          id: string
          recorded_at: string
          result_payload: Json
          source: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          completed_training_session_id?: string | null
          created_at?: string
          exercise_id?: string | null
          exercise_key: string
          exercise_name?: string | null
          generated_training_session_id?: string | null
          id?: string
          recorded_at?: string
          result_payload?: Json
          source?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          completed_training_session_id?: string | null
          created_at?: string
          exercise_id?: string | null
          exercise_key?: string
          exercise_name?: string | null
          generated_training_session_id?: string | null
          id?: string
          recorded_at?: string
          result_payload?: Json
          source?: string | null
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
          engine_version: string
          generated_session_key: string | null
          id: string
          planned_date: string
          session_payload: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          block_id?: string | null
          created_at?: string
          engine_version: string
          generated_session_key?: string | null
          id?: string
          planned_date: string
          session_payload?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          block_id?: string | null
          created_at?: string
          engine_version?: string
          generated_session_key?: string | null
          id?: string
          planned_date?: string
          session_payload?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_training_sessions_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "generated_training_blocks"
            referencedColumns: ["id"]
          },
        ]
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
          updated_at: string
          user_id: string
        }
        Insert: {
          checkin_date: string
          checkin_payload?: Json
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          checkin_date?: string
          checkin_payload?: Json
          created_at?: string
          id?: string
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
