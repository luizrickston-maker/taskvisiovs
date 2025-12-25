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
      api_keys: {
        Row: {
          api_key: string
          created_at: string
          id: string
          is_active: boolean
          last_used_at: string | null
          name: string
          user_id: string
        }
        Insert: {
          api_key: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          name: string
          user_id: string
        }
        Update: {
          api_key?: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          color: string
          created_at: string
          icon: string | null
          id: string
          is_default: boolean
          name: string
          type: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string | null
          id?: string
          is_default?: boolean
          name: string
          type: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string | null
          id?: string
          is_default?: boolean
          name?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      debts: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          due_date: string
          id: string
          installment_current: number | null
          installment_total: number | null
          name: string
          notes: string | null
          paid: boolean
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          due_date: string
          id?: string
          installment_current?: number | null
          installment_total?: number | null
          name: string
          notes?: string | null
          paid?: boolean
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          due_date?: string
          id?: string
          installment_current?: number | null
          installment_total?: number | null
          name?: string
          notes?: string | null
          paid?: boolean
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "debts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          date: string
          description: string
          id: string
          user_id: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          date?: string
          description: string
          id?: string
          user_id: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          date?: string
          description?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          amount: number
          created_at: string
          deadline: string
          id: string
          name: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          deadline: string
          id?: string
          name: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          deadline?: string
          id?: string
          name?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      incomes: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          date: string
          id: string
          source: string
          user_id: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          date?: string
          id?: string
          source: string
          user_id: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          date?: string
          id?: string
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "incomes_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      project_categories: {
        Row: {
          color: string
          created_at: string
          description: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      project_tasks: {
        Row: {
          created_at: string
          description: string | null
          id: string
          priority: number
          project_id: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          priority?: number
          project_id?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          priority?: number
          project_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          estimated_time: string | null
          id: string
          priority: number
          project: string
          project_category_id: string | null
          status: string
          task: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          estimated_time?: string | null
          id?: string
          priority?: number
          project: string
          project_category_id?: string | null
          status?: string
          task: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          estimated_time?: string | null
          id?: string
          priority?: number
          project?: string
          project_category_id?: string | null
          status?: string
          task?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_project_category_id_fkey"
            columns: ["project_category_id"]
            isOneToOne: false
            referencedRelation: "project_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      prospects: {
        Row: {
          client_name: string
          company_name: string | null
          created_at: string
          estimated_value: number
          id: string
          notes: string | null
          project_id: string | null
          project_type: string | null
          prospection_date: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_name: string
          company_name?: string | null
          created_at?: string
          estimated_value?: number
          id?: string
          notes?: string | null
          project_id?: string | null
          project_type?: string | null
          prospection_date?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_name?: string
          company_name?: string | null
          created_at?: string
          estimated_value?: number
          id?: string
          notes?: string | null
          project_id?: string | null
          project_type?: string | null
          prospection_date?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_goals: {
        Row: {
          created_at: string
          current_amount: number
          end_date: string
          goal_type: string
          id: string
          start_date: string
          target_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_amount?: number
          end_date: string
          goal_type: string
          id?: string
          start_date: string
          target_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_amount?: number
          end_date?: string
          goal_type?: string
          id?: string
          start_date?: string
          target_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      savings: {
        Row: {
          amount: number
          created_at: string
          date: string
          description: string
          id: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          date?: string
          description: string
          id?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          description?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      scripts: {
        Row: {
          content: string
          created_at: string
          id: string
          platform: string
          project_id: string | null
          scheduled_date: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          platform: string
          project_id?: string | null
          scheduled_date: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          platform?: string
          project_id?: string | null
          scheduled_date?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scripts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          scheduled_date: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          scheduled_date?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          scheduled_date?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      time_block_types: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      time_blocks: {
        Row: {
          color: string | null
          completed: boolean
          created_at: string
          date: string
          end_time: string
          id: string
          start_time: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          color?: string | null
          completed?: boolean
          created_at?: string
          date: string
          end_time: string
          id?: string
          start_time: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          color?: string | null
          completed?: boolean
          created_at?: string
          date?: string
          end_time?: string
          id?: string
          start_time?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          app_name: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          app_name?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          app_name?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
