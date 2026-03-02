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
      ai_agents: {
        Row: {
          api_key_id: string | null
          context_priority: string[] | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_default: boolean
          max_tokens: number
          model_name: string
          name: string
          system_prompt: string
          temperature: number
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          api_key_id?: string | null
          context_priority?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          max_tokens?: number
          model_name?: string
          name: string
          system_prompt: string
          temperature?: number
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          api_key_id?: string | null
          context_priority?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          max_tokens?: number
          model_name?: string
          name?: string
          system_prompt?: string
          temperature?: number
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_agents_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "ai_api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agents_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_api_keys: {
        Row: {
          api_key: string
          created_at: string | null
          id: string
          is_active: boolean | null
          label: string | null
          provider: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          api_key: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label?: string | null
          provider: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          api_key?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label?: string | null
          provider?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      business_processes: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          related_product_id: string | null
          related_service_id: string | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          related_product_id?: string | null
          related_service_id?: string | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          related_product_id?: string | null
          related_service_id?: string | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_processes_related_product_id_fkey"
            columns: ["related_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_processes_related_service_id_fkey"
            columns: ["related_service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_processes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
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
      client_contents: {
        Row: {
          client_id: string
          created_at: string
          drive_link: string
          id: string
          notes: string | null
          title: string
          type: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          drive_link: string
          id?: string
          notes?: string | null
          title: string
          type: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          drive_link?: string
          id?: string
          notes?: string | null
          title?: string
          type?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_contents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_contents_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      client_users: {
        Row: {
          client_id: string
          created_at: string
          email: string
          id: string
          is_active: boolean
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_users_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_users_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          company_name: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      corporate_cost_categories: {
        Row: {
          color: string | null
          created_at: string | null
          icon: string | null
          id: string
          name: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          name: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          name?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "corporate_cost_categories_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      corporate_costs: {
        Row: {
          amount: number
          category_id: string | null
          cost_type: string
          created_at: string | null
          end_date: string | null
          frequency: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          start_date: string | null
          updated_at: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          amount?: number
          category_id?: string | null
          cost_type?: string
          created_at?: string | null
          end_date?: string | null
          frequency?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          start_date?: string | null
          updated_at?: string | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          amount?: number
          category_id?: string | null
          cost_type?: string
          created_at?: string | null
          end_date?: string | null
          frequency?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          start_date?: string | null
          updated_at?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "corporate_costs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "corporate_cost_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corporate_costs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      corporate_investments: {
        Row: {
          amount: number
          category: string
          created_at: string
          id: string
          item_name: string
          monthly_depreciation: number | null
          notes: string | null
          purchase_date: string
          updated_at: string
          useful_life_months: number | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          id?: string
          item_name: string
          monthly_depreciation?: number | null
          notes?: string | null
          purchase_date?: string
          updated_at?: string
          useful_life_months?: number | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          id?: string
          item_name?: string
          monthly_depreciation?: number | null
          notes?: string | null
          purchase_date?: string
          updated_at?: string
          useful_life_months?: number | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "corporate_investments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      corporate_pricing: {
        Row: {
          charged_price: number | null
          cost: number
          created_at: string
          final_price: number
          id: string
          item_name: string
          margin_percent: number
          notes: string | null
          profit: number
          real_margin: number
          tax_rate: number
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          charged_price?: number | null
          cost?: number
          created_at?: string
          final_price?: number
          id?: string
          item_name: string
          margin_percent?: number
          notes?: string | null
          profit?: number
          real_margin?: number
          tax_rate?: number
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          charged_price?: number | null
          cost?: number
          created_at?: string
          final_price?: number
          id?: string
          item_name?: string
          margin_percent?: number
          notes?: string | null
          profit?: number
          real_margin?: number
          tax_rate?: number
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "corporate_pricing_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      corporate_team: {
        Row: {
          clt_benefits: number | null
          contract_type: string
          cost: number
          created_at: string
          hours_available: number | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          payment_day: number
          role: string
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          clt_benefits?: number | null
          contract_type?: string
          cost?: number
          created_at?: string
          hours_available?: number | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          payment_day?: number
          role: string
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          clt_benefits?: number | null
          contract_type?: string
          cost?: number
          created_at?: string
          hours_available?: number | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          payment_day?: number
          role?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "corporate_team_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
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
          user_category_id: string | null
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
          user_category_id?: string | null
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
          user_category_id?: string | null
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
          {
            foreignKeyName: "debts_user_category_id_fkey"
            columns: ["user_category_id"]
            isOneToOne: false
            referencedRelation: "user_debt_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      discounts: {
        Row: {
          created_at: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          name: string
          start_date: string | null
          type: string
          updated_at: string | null
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          start_date?: string | null
          type: string
          updated_at?: string | null
          user_id: string
          value?: number
        }
        Update: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          start_date?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string
          value?: number
        }
        Relationships: []
      }
      document_types: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_types_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      editorial_calendar_items: {
        Row: {
          ai_suggestions: Json | null
          assigned_to: string | null
          client_adjustment_notes: string | null
          client_approval_status: string | null
          client_id: string | null
          client_reviewed_at: string | null
          content_link: string | null
          content_type: Database["public"]["Enums"]["content_type_enum"]
          created_at: string
          description: string | null
          due_date: string
          id: string
          moodboard_refs: Json | null
          platform: Database["public"]["Enums"]["content_platform"]
          project_id: string | null
          status: Database["public"]["Enums"]["content_status"] | null
          title: string
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          ai_suggestions?: Json | null
          assigned_to?: string | null
          client_adjustment_notes?: string | null
          client_approval_status?: string | null
          client_id?: string | null
          client_reviewed_at?: string | null
          content_link?: string | null
          content_type: Database["public"]["Enums"]["content_type_enum"]
          created_at?: string
          description?: string | null
          due_date: string
          id?: string
          moodboard_refs?: Json | null
          platform: Database["public"]["Enums"]["content_platform"]
          project_id?: string | null
          status?: Database["public"]["Enums"]["content_status"] | null
          title: string
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          ai_suggestions?: Json | null
          assigned_to?: string | null
          client_adjustment_notes?: string | null
          client_approval_status?: string | null
          client_id?: string | null
          client_reviewed_at?: string | null
          content_link?: string | null
          content_type?: Database["public"]["Enums"]["content_type_enum"]
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          moodboard_refs?: Json | null
          platform?: Database["public"]["Enums"]["content_platform"]
          project_id?: string | null
          status?: Database["public"]["Enums"]["content_status"] | null
          title?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "editorial_calendar_items_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "corporate_team"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "editorial_calendar_items_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "editorial_calendar_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "personal_projects_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "editorial_calendar_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "editorial_calendar_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "editorial_calendar_items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      editorial_comments: {
        Row: {
          comment_text: string
          created_at: string
          id: string
          item_id: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          comment_text: string
          created_at?: string
          id?: string
          item_id: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          comment_text?: string
          created_at?: string
          id?: string
          item_id?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "editorial_comments_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "editorial_calendar_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "editorial_comments_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "pending_editorial_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "editorial_comments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
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
          income_type: string
          source: string
          user_category_id: string | null
          user_id: string
          variable_max_amount: number | null
          variable_min_amount: number | null
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          date?: string
          id?: string
          income_type?: string
          source: string
          user_category_id?: string | null
          user_id: string
          variable_max_amount?: number | null
          variable_min_amount?: number | null
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          date?: string
          id?: string
          income_type?: string
          source?: string
          user_category_id?: string | null
          user_id?: string
          variable_max_amount?: number | null
          variable_min_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "incomes_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incomes_user_category_id_fkey"
            columns: ["user_category_id"]
            isOneToOne: false
            referencedRelation: "user_income_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_fee_settings: {
        Row: {
          created_at: string | null
          discount_percent: number | null
          fee_fixed: number | null
          fee_percent: number | null
          id: string
          installment_ranges: Json | null
          is_active: boolean | null
          method: string
          receiving_days: number | null
          updated_at: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          discount_percent?: number | null
          fee_fixed?: number | null
          fee_percent?: number | null
          id?: string
          installment_ranges?: Json | null
          is_active?: boolean | null
          method: string
          receiving_days?: number | null
          updated_at?: string | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          discount_percent?: number | null
          fee_fixed?: number | null
          fee_percent?: number | null
          id?: string
          installment_ranges?: Json | null
          is_active?: boolean | null
          method?: string
          receiving_days?: number | null
          updated_at?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_fee_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_short_links: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          target_url: string
        }
        Insert: {
          code: string
          created_at?: string
          expires_at?: string
          id?: string
          target_url: string
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          target_url?: string
        }
        Relationships: []
      }
      pricing_models: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      process_links: {
        Row: {
          created_at: string
          id: string
          link_id: string
          link_type: string
          process_id: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          link_id: string
          link_type: string
          process_id: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          link_id?: string
          link_type?: string
          process_id?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "process_links_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_links_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      process_step_connections: {
        Row: {
          condition: string | null
          created_at: string
          from_step_id: string
          id: string
          label: string | null
          process_id: string
          to_step_id: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          condition?: string | null
          created_at?: string
          from_step_id: string
          id?: string
          label?: string | null
          process_id: string
          to_step_id: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          condition?: string | null
          created_at?: string
          from_step_id?: string
          id?: string
          label?: string | null
          process_id?: string
          to_step_id?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "process_step_connections_from_step_id_fkey"
            columns: ["from_step_id"]
            isOneToOne: false
            referencedRelation: "process_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_step_connections_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_step_connections_to_step_id_fkey"
            columns: ["to_step_id"]
            isOneToOne: false
            referencedRelation: "process_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_step_connections_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      process_steps: {
        Row: {
          attachments: Json | null
          checklist: Json | null
          color: string | null
          created_at: string
          description: string | null
          estimated_duration_minutes: number | null
          id: string
          notes: string | null
          process_id: string
          responsible_team_member_id: string | null
          step_order: number
          step_type: string
          title: string
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          attachments?: Json | null
          checklist?: Json | null
          color?: string | null
          created_at?: string
          description?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          notes?: string | null
          process_id: string
          responsible_team_member_id?: string | null
          step_order?: number
          step_type?: string
          title: string
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          attachments?: Json | null
          checklist?: Json | null
          color?: string | null
          created_at?: string
          description?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          notes?: string | null
          process_id?: string
          responsible_team_member_id?: string | null
          step_order?: number
          step_type?: string
          title?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "process_steps_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_steps_responsible_team_member_id_fkey"
            columns: ["responsible_team_member_id"]
            isOneToOne: false
            referencedRelation: "corporate_team"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_steps_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      processes: {
        Row: {
          category: string | null
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          is_template: boolean
          title: string
          updated_at: string
          user_id: string
          version: number
          workspace_id: string | null
        }
        Insert: {
          category?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          is_template?: boolean
          title: string
          updated_at?: string
          user_id: string
          version?: number
          workspace_id?: string | null
        }
        Update: {
          category?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          is_template?: boolean
          title?: string
          updated_at?: string
          user_id?: string
          version?: number
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "processes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      product_pricing_details: {
        Row: {
          base_price: number | null
          created_at: string | null
          id: string
          max_units: number | null
          min_units: number | null
          pricing_model_id: string
          product_id: string
          unit_name: string | null
          updated_at: string | null
        }
        Insert: {
          base_price?: number | null
          created_at?: string | null
          id?: string
          max_units?: number | null
          min_units?: number | null
          pricing_model_id: string
          product_id: string
          unit_name?: string | null
          updated_at?: string | null
        }
        Update: {
          base_price?: number | null
          created_at?: string | null
          id?: string
          max_units?: number | null
          min_units?: number | null
          pricing_model_id?: string
          product_id?: string
          unit_name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_pricing_details_pricing_model_id_fkey"
            columns: ["pricing_model_id"]
            isOneToOne: false
            referencedRelation: "pricing_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_pricing_details_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          cost_price: number | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          sku: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          sku?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          sku?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      project_categories: {
        Row: {
          color: string
          created_at: string
          description: string | null
          id: string
          name: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_categories_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      project_tasks: {
        Row: {
          actual_hours: number | null
          completed_at: string | null
          created_at: string
          deadline: string | null
          deadline_days: number | null
          description: string | null
          estimated_hours: number | null
          id: string
          priority: number
          project_id: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          actual_hours?: number | null
          completed_at?: string | null
          created_at?: string
          deadline?: string | null
          deadline_days?: number | null
          description?: string | null
          estimated_hours?: number | null
          id?: string
          priority?: number
          project_id?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          actual_hours?: number | null
          completed_at?: string | null
          created_at?: string
          deadline?: string | null
          deadline_days?: number | null
          description?: string | null
          estimated_hours?: number | null
          id?: string
          priority?: number
          project_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "personal_projects_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          client_name: string | null
          company_name: string | null
          created_at: string
          deadline: string | null
          estimated_time: string | null
          id: string
          is_corporate: boolean | null
          priority: number
          project: string
          project_category_id: string | null
          prospect_id: string | null
          status: string
          task: string
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          client_name?: string | null
          company_name?: string | null
          created_at?: string
          deadline?: string | null
          estimated_time?: string | null
          id?: string
          is_corporate?: boolean | null
          priority?: number
          project: string
          project_category_id?: string | null
          prospect_id?: string | null
          status?: string
          task: string
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          client_name?: string | null
          company_name?: string | null
          created_at?: string
          deadline?: string | null
          estimated_time?: string | null
          id?: string
          is_corporate?: boolean | null
          priority?: number
          project?: string
          project_category_id?: string | null
          prospect_id?: string | null
          status?: string
          task?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_project_category_id_fkey"
            columns: ["project_category_id"]
            isOneToOne: false
            referencedRelation: "project_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "sales_pipeline_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_documents: {
        Row: {
          created_at: string
          document_type_id: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          notes: string | null
          prospect_id: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          document_type_id?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          notes?: string | null
          prospect_id: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          document_type_id?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          notes?: string | null
          prospect_id?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prospect_documents_document_type_id_fkey"
            columns: ["document_type_id"]
            isOneToOne: false
            referencedRelation: "document_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_documents_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_documents_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "sales_pipeline_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_documents_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      prospects: {
        Row: {
          client_name: string
          company_name: string | null
          contract_duration: number | null
          created_at: string
          estimated_value: number
          id: string
          notes: string | null
          payment_installments: number | null
          payment_methods: Json | null
          payment_type: string | null
          plan_id: string | null
          project_id: string | null
          project_type: string | null
          prospection_date: string
          status: string
          total_fees: number | null
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          client_name: string
          company_name?: string | null
          contract_duration?: number | null
          created_at?: string
          estimated_value?: number
          id?: string
          notes?: string | null
          payment_installments?: number | null
          payment_methods?: Json | null
          payment_type?: string | null
          plan_id?: string | null
          project_id?: string | null
          project_type?: string | null
          prospection_date?: string
          status?: string
          total_fees?: number | null
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          client_name?: string
          company_name?: string | null
          contract_duration?: number | null
          created_at?: string
          estimated_value?: number
          id?: string
          notes?: string | null
          payment_installments?: number | null
          payment_methods?: Json | null
          payment_type?: string | null
          plan_id?: string | null
          project_id?: string | null
          project_type?: string | null
          prospection_date?: string
          status?: string
          total_fees?: number | null
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prospects_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "service_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "personal_projects_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospects_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_plans: {
        Row: {
          category: string | null
          created_at: string | null
          deadline: string | null
          description: string | null
          id: string
          image_url: string | null
          name: string
          priority: string | null
          saved_amount: number | null
          status: string | null
          target_amount: number
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          priority?: string | null
          saved_amount?: number | null
          status?: string | null
          target_amount: number
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          priority?: string | null
          saved_amount?: number | null
          status?: string | null
          target_amount?: number
          user_id?: string
        }
        Relationships: []
      }
      sales_goals: {
        Row: {
          created_at: string
          current_amount: number
          end_date: string
          goal_type: string
          id: string
          project_id: string | null
          start_date: string
          target_amount: number
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          current_amount?: number
          end_date: string
          goal_type: string
          id?: string
          project_id?: string | null
          start_date: string
          target_amount: number
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          current_amount?: number
          end_date?: string
          goal_type?: string
          id?: string
          project_id?: string | null
          start_date?: string
          target_amount?: number
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_goals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "personal_projects_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_goals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_goals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_goals_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
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
          workspace_id: string | null
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
          workspace_id?: string | null
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
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scripts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scripts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      service_plan_items: {
        Row: {
          created_at: string
          custom_price: number | null
          id: string
          plan_id: string
          pricing_id: string
          quantity: number
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          custom_price?: number | null
          id?: string
          plan_id: string
          pricing_id: string
          quantity?: number
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          custom_price?: number | null
          id?: string
          plan_id?: string
          pricing_id?: string
          quantity?: number
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_plan_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "service_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_plan_items_pricing_id_fkey"
            columns: ["pricing_id"]
            isOneToOne: false
            referencedRelation: "corporate_pricing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_plan_items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      service_plans: {
        Row: {
          base_cost: number
          created_at: string
          description: string | null
          final_price: number
          id: string
          is_active: boolean
          monthly_limit: string | null
          name: string
          notes: string | null
          plan_type: string
          profit: number
          profit_margin: number
          tier: string
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          base_cost?: number
          created_at?: string
          description?: string | null
          final_price?: number
          id?: string
          is_active?: boolean
          monthly_limit?: string | null
          name: string
          notes?: string | null
          plan_type?: string
          profit?: number
          profit_margin?: number
          tier?: string
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          base_cost?: number
          created_at?: string
          description?: string | null
          final_price?: number
          id?: string
          is_active?: boolean
          monthly_limit?: string | null
          name?: string
          notes?: string | null
          plan_type?: string
          profit?: number
          profit_margin?: number
          tier?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_plans_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      service_pricing_details: {
        Row: {
          base_price: number | null
          created_at: string | null
          hourly_rate: number | null
          id: string
          max_hours: number | null
          min_hours: number | null
          pricing_model_id: string
          service_id: string
          updated_at: string | null
        }
        Insert: {
          base_price?: number | null
          created_at?: string | null
          hourly_rate?: number | null
          id?: string
          max_hours?: number | null
          min_hours?: number | null
          pricing_model_id: string
          service_id: string
          updated_at?: string | null
        }
        Update: {
          base_price?: number | null
          created_at?: string | null
          hourly_rate?: number | null
          id?: string
          max_hours?: number | null
          min_hours?: number | null
          pricing_model_id?: string
          service_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_pricing_details_pricing_model_id_fkey"
            columns: ["pricing_model_id"]
            isOneToOne: false
            referencedRelation: "pricing_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_pricing_details_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          base_cost: number | null
          created_at: string | null
          description: string | null
          expected_duration_hours: number | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          base_cost?: number | null
          created_at?: string | null
          description?: string | null
          expected_duration_hours?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          base_cost?: number | null
          created_at?: string | null
          description?: string | null
          expected_duration_hours?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
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
      taxes: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          rate: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          rate?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          rate?: number
          updated_at?: string | null
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
      tool_categories: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      user_debt_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_income_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          app_name: string
          business_app_name: string | null
          created_at: string
          default_available_hours: number
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          app_name?: string
          business_app_name?: string | null
          created_at?: string
          default_available_hours?: number
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          app_name?: string
          business_app_name?: string | null
          created_at?: string
          default_available_hours?: number
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
      user_tools: {
        Row: {
          category_id: string | null
          created_at: string
          id: string
          name: string
          url: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          id?: string
          name: string
          url: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string
          id?: string
          name?: string
          url?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_tools_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "tool_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_tools_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string
          id: string
          role: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_user_id: string
          plan: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_user_id: string
          plan?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_user_id?: string
          plan?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      active_purchase_plans: {
        Row: {
          category: string | null
          created_at: string | null
          days_to_deadline: number | null
          deadline: string | null
          deadline_status: string | null
          description: string | null
          id: string | null
          image_url: string | null
          name: string | null
          priority: string | null
          progress_percent: number | null
          remaining_amount: number | null
          saved_amount: number | null
          status: string | null
          target_amount: number | null
          user_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          days_to_deadline?: never
          deadline?: string | null
          deadline_status?: never
          description?: string | null
          id?: string | null
          image_url?: string | null
          name?: string | null
          priority?: string | null
          progress_percent?: never
          remaining_amount?: never
          saved_amount?: number | null
          status?: string | null
          target_amount?: number | null
          user_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          days_to_deadline?: never
          deadline?: string | null
          deadline_status?: never
          description?: string | null
          id?: string | null
          image_url?: string | null
          name?: string | null
          priority?: string | null
          progress_percent?: never
          remaining_amount?: never
          saved_amount?: number | null
          status?: string | null
          target_amount?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      corporate_pending_tasks: {
        Row: {
          actual_hours: number | null
          client_name: string | null
          company_name: string | null
          created_at: string | null
          deadline: string | null
          deadline_status: string | null
          description: string | null
          estimated_hours: number | null
          id: string | null
          is_overdue: boolean | null
          priority: number | null
          project_id: string | null
          project_name: string | null
          status: string | null
          title: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "personal_projects_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_editorial_content: {
        Row: {
          assigned_name: string | null
          assigned_to: string | null
          content_type: Database["public"]["Enums"]["content_type_enum"] | null
          created_at: string | null
          deadline_status: string | null
          description: string | null
          due_date: string | null
          id: string | null
          is_overdue: boolean | null
          platform: Database["public"]["Enums"]["content_platform"] | null
          project_id: string | null
          project_name: string | null
          status: Database["public"]["Enums"]["content_status"] | null
          title: string | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "editorial_calendar_items_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "corporate_team"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "editorial_calendar_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "personal_projects_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "editorial_calendar_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "editorial_calendar_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_scripts: {
        Row: {
          created_at: string | null
          deadline_status: string | null
          id: string | null
          is_overdue: boolean | null
          platform: string | null
          project_name: string | null
          scheduled_date: string | null
          status: string | null
          title: string | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: []
      }
      personal_active_goals: {
        Row: {
          current_amount: number | null
          days_remaining: number | null
          deadline: string | null
          id: string | null
          is_overdue: boolean | null
          name: string | null
          progress_percent: number | null
          status: string | null
          target_amount: number | null
          type: string | null
          user_id: string | null
        }
        Insert: {
          current_amount?: never
          days_remaining?: never
          deadline?: string | null
          id?: string | null
          is_overdue?: never
          name?: string | null
          progress_percent?: never
          status?: never
          target_amount?: number | null
          type?: string | null
          user_id?: string | null
        }
        Update: {
          current_amount?: never
          days_remaining?: never
          deadline?: string | null
          id?: string | null
          is_overdue?: never
          name?: string | null
          progress_percent?: never
          status?: never
          target_amount?: number | null
          type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      personal_financial_summary: {
        Row: {
          overdue_debts_count: number | null
          total_expenses_this_month: number | null
          total_income_this_month: number | null
          total_pending_debts: number | null
          total_savings: number | null
          user_id: string | null
        }
        Relationships: []
      }
      personal_pending_tasks: {
        Row: {
          created_at: string | null
          deadline_status: string | null
          id: string | null
          is_overdue: boolean | null
          scheduled_date: string | null
          title: string | null
          type: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          deadline_status?: never
          id?: string | null
          is_overdue?: never
          scheduled_date?: string | null
          title?: string | null
          type?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          deadline_status?: never
          id?: string | null
          is_overdue?: never
          scheduled_date?: string | null
          title?: string | null
          type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      personal_projects_overview: {
        Row: {
          category_color: string | null
          category_name: string | null
          completed_tasks: number | null
          created_at: string | null
          description: string | null
          estimated_time: string | null
          id: string | null
          name: string | null
          priority: number | null
          status: string | null
          total_actual_hours: number | null
          total_estimated_hours: number | null
          total_tasks: number | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: []
      }
      personal_upcoming_time_blocks: {
        Row: {
          color: string | null
          completed: boolean | null
          date: string | null
          day_status: string | null
          end_time: string | null
          id: string | null
          start_datetime: string | null
          start_time: string | null
          title: string | null
          type: string | null
          type_name: string | null
          user_id: string | null
        }
        Relationships: []
      }
      projects_overview: {
        Row: {
          category_color: string | null
          category_name: string | null
          client_name: string | null
          company_name: string | null
          completed_tasks: number | null
          created_at: string | null
          deadline: string | null
          description: string | null
          id: string | null
          is_corporate: boolean | null
          is_overdue: boolean | null
          name: string | null
          priority: number | null
          prospect_id: string | null
          status: string | null
          total_actual_hours: number | null
          total_estimated_hours: number | null
          total_tasks: number | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "sales_pipeline_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_goals_progress: {
        Row: {
          current_amount: number | null
          days_remaining: number | null
          end_date: string | null
          goal_type: string | null
          id: string | null
          progress_percent: number | null
          project_id: string | null
          project_name: string | null
          remaining_amount: number | null
          start_date: string | null
          status: string | null
          target_amount: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_goals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "personal_projects_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_goals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_goals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_pipeline_summary: {
        Row: {
          client_name: string | null
          company_name: string | null
          contract_duration: number | null
          conversion_probability: number | null
          created_at: string | null
          estimated_value: number | null
          id: string | null
          payment_type: string | null
          plan_id: string | null
          plan_name: string | null
          project_type: string | null
          prospection_date: string | null
          stage_order: number | null
          status: string | null
          updated_at: string | null
          user_id: string | null
          weighted_value: number | null
        }
        Relationships: [
          {
            foreignKeyName: "prospects_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "service_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      upcoming_appointments: {
        Row: {
          color: string | null
          completed: boolean | null
          date: string | null
          day_status: string | null
          end_time: string | null
          id: string | null
          start_datetime: string | null
          start_time: string | null
          title: string | null
          type: string | null
          type_name: string | null
          user_id: string | null
        }
        Relationships: []
      }
      upcoming_debts: {
        Row: {
          amount: number | null
          category_color: string | null
          category_name: string | null
          days_until_due: number | null
          due_date: string | null
          id: string | null
          installment_current: number | null
          installment_total: number | null
          name: string | null
          notes: string | null
          paid: boolean | null
          type: string | null
          urgency_status: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      create_workspace_for_user: {
        Args: { _email: string; _full_name?: string; _user_id: string }
        Returns: string
      }
      get_client_portal_info: { Args: never; Returns: Json }
      get_my_client_id: { Args: { _workspace_id: string }; Returns: string }
      get_my_workspace_id: { Args: never; Returns: string }
      get_personal_360_summary: { Args: { p_user_id: string }; Returns: Json }
      get_user_360_summary: { Args: { p_user_id: string }; Returns: Json }
      get_user_workspace_id: { Args: never; Returns: string }
      get_workspace_id_for_user: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_workspace_access: {
        Args: { _workspace_id: string }
        Returns: boolean
      }
      is_client_user: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      is_workspace_admin: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      is_workspace_member: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "super_admin"
      content_platform: "instagram" | "tiktok" | "linkedin" | "blog" | "youtube"
      content_status: "idea" | "draft" | "review" | "approved" | "published"
      content_type_enum: "post" | "reel" | "story" | "article" | "video"
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
      app_role: ["admin", "user", "super_admin"],
      content_platform: ["instagram", "tiktok", "linkedin", "blog", "youtube"],
      content_status: ["idea", "draft", "review", "approved", "published"],
      content_type_enum: ["post", "reel", "story", "article", "video"],
    },
  },
} as const
