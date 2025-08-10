export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      account_lockouts: {
        Row: {
          created_at: string
          email: string
          failed_attempts: number
          id: string
          last_attempt: string
          locked_until: string | null
        }
        Insert: {
          created_at?: string
          email: string
          failed_attempts?: number
          id?: string
          last_attempt?: string
          locked_until?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          failed_attempts?: number
          id?: string
          last_attempt?: string
          locked_until?: string | null
        }
        Relationships: []
      }
      achievements: {
        Row: {
          badge_image_url: string | null
          category: string | null
          created_at: string
          description: string
          difficulty_level: number | null
          icon: string
          id: string
          is_active: boolean | null
          is_secret: boolean | null
          name: string
          requirements: Json
          reward_points: number | null
          type: string
        }
        Insert: {
          badge_image_url?: string | null
          category?: string | null
          created_at?: string
          description: string
          difficulty_level?: number | null
          icon: string
          id?: string
          is_active?: boolean | null
          is_secret?: boolean | null
          name: string
          requirements: Json
          reward_points?: number | null
          type: string
        }
        Update: {
          badge_image_url?: string | null
          category?: string | null
          created_at?: string
          description?: string
          difficulty_level?: number | null
          icon?: string
          id?: string
          is_active?: boolean | null
          is_secret?: boolean | null
          name?: string
          requirements?: Json
          reward_points?: number | null
          type?: string
        }
        Relationships: []
      }
      admin_audit_log: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string
          id: string
          new_values: Json | null
          old_values: Json | null
          target_record_id: string | null
          target_table: string | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          target_record_id?: string | null
          target_table?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          target_record_id?: string | null
          target_table?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      ai_helpers: {
        Row: {
          avatar_url: string | null
          created_at: string
          description: string
          expertise_areas: string[] | null
          id: string
          interaction_style: Json | null
          is_active: boolean | null
          name: string
          personality: Json
          personality_type:
            | Database["public"]["Enums"]["ai_helper_personality"]
            | null
          specialties: string[] | null
          system_prompt: string
          usage_count: number | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          description: string
          expertise_areas?: string[] | null
          id?: string
          interaction_style?: Json | null
          is_active?: boolean | null
          name: string
          personality?: Json
          personality_type?:
            | Database["public"]["Enums"]["ai_helper_personality"]
            | null
          specialties?: string[] | null
          system_prompt: string
          usage_count?: number | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          description?: string
          expertise_areas?: string[] | null
          id?: string
          interaction_style?: Json | null
          is_active?: boolean | null
          name?: string
          personality?: Json
          personality_type?:
            | Database["public"]["Enums"]["ai_helper_personality"]
            | null
          specialties?: string[] | null
          system_prompt?: string
          usage_count?: number | null
        }
        Relationships: []
      }
      challenge_participants: {
        Row: {
          challenge_id: string
          completed: boolean | null
          completed_at: string | null
          id: string
          joined_at: string
          progress: Json | null
          user_id: string
        }
        Insert: {
          challenge_id: string
          completed?: boolean | null
          completed_at?: string | null
          id?: string
          joined_at?: string
          progress?: Json | null
          user_id: string
        }
        Update: {
          challenge_id?: string
          completed?: boolean | null
          completed_at?: string | null
          id?: string
          joined_at?: string
          progress?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_participants_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "community_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          task_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          task_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          task_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_comments_author_id"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      community_challenges: {
        Row: {
          badge_reward: string | null
          challenge_type: string
          created_at: string
          created_by: string
          current_participants: number | null
          description: string
          difficulty_level: number | null
          end_date: string
          experience_reward: number | null
          id: string
          is_active: boolean | null
          max_participants: number | null
          requirements: Json
          rewards: Json | null
          start_date: string
          title: string
        }
        Insert: {
          badge_reward?: string | null
          challenge_type: string
          created_at?: string
          created_by: string
          current_participants?: number | null
          description: string
          difficulty_level?: number | null
          end_date: string
          experience_reward?: number | null
          id?: string
          is_active?: boolean | null
          max_participants?: number | null
          requirements: Json
          rewards?: Json | null
          start_date: string
          title: string
        }
        Update: {
          badge_reward?: string | null
          challenge_type?: string
          created_at?: string
          created_by?: string
          current_participants?: number | null
          description?: string
          difficulty_level?: number | null
          end_date?: string
          experience_reward?: number | null
          id?: string
          is_active?: boolean | null
          max_participants?: number | null
          requirements?: Json
          rewards?: Json | null
          start_date?: string
          title?: string
        }
        Relationships: []
      }
      custom_story_views: {
        Row: {
          configuration: Json
          created_at: string
          id: string
          is_default: boolean | null
          layout_data: Json | null
          project_id: string
          updated_at: string
          user_id: string
          view_name: string
          view_type: string
        }
        Insert: {
          configuration?: Json
          created_at?: string
          id?: string
          is_default?: boolean | null
          layout_data?: Json | null
          project_id: string
          updated_at?: string
          user_id: string
          view_name: string
          view_type: string
        }
        Update: {
          configuration?: Json
          created_at?: string
          id?: string
          is_default?: boolean | null
          layout_data?: Json | null
          project_id?: string
          updated_at?: string
          user_id?: string
          view_name?: string
          view_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_story_views_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_challenges: {
        Row: {
          active_date: string
          challenge_type: Database["public"]["Enums"]["challenge_type"]
          created_at: string
          created_by: string
          description: string
          difficulty_level: number | null
          expires_at: string
          id: string
          is_active: boolean | null
          requirements: Json
          rewards: Json | null
          title: string
        }
        Insert: {
          active_date?: string
          challenge_type: Database["public"]["Enums"]["challenge_type"]
          created_at?: string
          created_by: string
          description: string
          difficulty_level?: number | null
          expires_at?: string
          id?: string
          is_active?: boolean | null
          requirements: Json
          rewards?: Json | null
          title: string
        }
        Update: {
          active_date?: string
          challenge_type?: Database["public"]["Enums"]["challenge_type"]
          created_at?: string
          created_by?: string
          description?: string
          difficulty_level?: number | null
          expires_at?: string
          id?: string
          is_active?: boolean | null
          requirements?: Json
          rewards?: Json | null
          title?: string
        }
        Relationships: []
      }
      kanban_columns: {
        Row: {
          color: string | null
          created_at: string
          id: string
          is_default: boolean | null
          name: string
          position: number
          project_id: string
          updated_at: string
          wip_limit: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          name: string
          position: number
          project_id: string
          updated_at?: string
          wip_limit?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          name?: string
          position?: number
          project_id?: string
          updated_at?: string
          wip_limit?: number | null
        }
        Relationships: []
      }
      leaderboard_entries: {
        Row: {
          id: string
          leaderboard_id: string
          period_end: string
          period_start: string
          rank: number | null
          score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          leaderboard_id: string
          period_end: string
          period_start: string
          rank?: number | null
          score?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          leaderboard_id?: string
          period_end?: string
          period_start?: string
          rank?: number | null
          score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leaderboard_entries_leaderboard_id_fkey"
            columns: ["leaderboard_id"]
            isOneToOne: false
            referencedRelation: "leaderboards"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboards: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          filters: Json | null
          id: string
          is_active: boolean | null
          metric: string
          name: string
          reference_id: string | null
          time_period: string
          type: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          filters?: Json | null
          id?: string
          is_active?: boolean | null
          metric: string
          name: string
          reference_id?: string | null
          time_period: string
          type: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          filters?: Json | null
          id?: string
          is_active?: boolean | null
          metric?: string
          name?: string
          reference_id?: string | null
          time_period?: string
          type?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          related_project_id: string | null
          related_task_id: string | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          related_project_id?: string | null
          related_task_id?: string | null
          title: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          related_project_id?: string | null
          related_task_id?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      password_history: {
        Row: {
          created_at: string
          id: string
          password_hash: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          password_hash: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          password_hash?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          is_admin: boolean | null
          role: Database["public"]["Enums"]["team_role"] | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_admin?: boolean | null
          role?: Database["public"]["Enums"]["team_role"] | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_admin?: boolean | null
          role?: Database["public"]["Enums"]["team_role"] | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      project_members: {
        Row: {
          id: string
          joined_at: string
          project_id: string
          role: Database["public"]["Enums"]["team_role"] | null
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          project_id: string
          role?: Database["public"]["Enums"]["team_role"] | null
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          project_id?: string
          role?: Database["public"]["Enums"]["team_role"] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          code: string | null
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          name: string
          owner_id: string
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"] | null
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          owner_id: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"] | null
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          owner_id?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"] | null
          updated_at?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          action_type: string
          attempts: number
          created_at: string
          id: string
          identifier: string
          window_start: string
        }
        Insert: {
          action_type: string
          attempts?: number
          created_at?: string
          id?: string
          identifier: string
          window_start?: string
        }
        Update: {
          action_type?: string
          attempts?: number
          created_at?: string
          id?: string
          identifier?: string
          window_start?: string
        }
        Relationships: []
      }
      roadmap_milestones: {
        Row: {
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          position_x: number | null
          position_y: number | null
          priority: string
          progress: number | null
          project_id: string
          start_date: string | null
          status: string
          team_assigned: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          position_x?: number | null
          position_y?: number | null
          priority?: string
          progress?: number | null
          project_id: string
          start_date?: string | null
          status?: string
          team_assigned?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          position_x?: number | null
          position_y?: number | null
          priority?: string
          progress?: number | null
          project_id?: string
          start_date?: string | null
          status?: string
          team_assigned?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "roadmap_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audit_log: {
        Row: {
          action: string
          created_at: string
          error_message: string | null
          id: string
          ip_address: unknown | null
          metadata: Json | null
          resource_id: string | null
          resource_type: string
          success: boolean
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          error_message?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type: string
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          error_message?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      skill_development: {
        Row: {
          created_at: string
          current_level: number | null
          experience_points: number | null
          id: string
          last_activity_at: string
          milestones_achieved: string[] | null
          skill_name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_level?: number | null
          experience_points?: number | null
          id?: string
          last_activity_at?: string
          milestones_achieved?: string[] | null
          skill_name: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_level?: number | null
          experience_points?: number | null
          id?: string
          last_activity_at?: string
          milestones_achieved?: string[] | null
          skill_name?: string
          user_id?: string
        }
        Relationships: []
      }
      sprints: {
        Row: {
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          name: string
          project_id: string
          start_date: string | null
          status: Database["public"]["Enums"]["sprint_status"] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          project_id: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["sprint_status"] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          project_id?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["sprint_status"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sprints_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      story_chapters: {
        Row: {
          chapter_number: number
          completion_percentage: number | null
          content: string
          created_at: string
          estimated_duration_minutes: number | null
          experience_reward: number | null
          id: string
          is_unlocked: boolean | null
          narrative_id: string
          prerequisite_chapters: string[] | null
          rewards: Json | null
          title: string
          unlock_requirements: Json | null
        }
        Insert: {
          chapter_number: number
          completion_percentage?: number | null
          content: string
          created_at?: string
          estimated_duration_minutes?: number | null
          experience_reward?: number | null
          id?: string
          is_unlocked?: boolean | null
          narrative_id: string
          prerequisite_chapters?: string[] | null
          rewards?: Json | null
          title: string
          unlock_requirements?: Json | null
        }
        Update: {
          chapter_number?: number
          completion_percentage?: number | null
          content?: string
          created_at?: string
          estimated_duration_minutes?: number | null
          experience_reward?: number | null
          id?: string
          is_unlocked?: boolean | null
          narrative_id?: string
          prerequisite_chapters?: string[] | null
          rewards?: Json | null
          title?: string
          unlock_requirements?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "story_chapters_narrative_id_fkey"
            columns: ["narrative_id"]
            isOneToOne: false
            referencedRelation: "story_narratives"
            referencedColumns: ["id"]
          },
        ]
      }
      story_narratives: {
        Row: {
          character_profiles: Json | null
          completion_percentage: number | null
          created_at: string
          current_chapter: number | null
          description: string | null
          difficulty_level: number | null
          estimated_completion_time: number | null
          id: string
          narrative_arc: Json
          project_id: string
          story_elements: Json | null
          theme_id: string | null
          title: string
          total_chapters: number | null
          updated_at: string
        }
        Insert: {
          character_profiles?: Json | null
          completion_percentage?: number | null
          created_at?: string
          current_chapter?: number | null
          description?: string | null
          difficulty_level?: number | null
          estimated_completion_time?: number | null
          id?: string
          narrative_arc?: Json
          project_id: string
          story_elements?: Json | null
          theme_id?: string | null
          title: string
          total_chapters?: number | null
          updated_at?: string
        }
        Update: {
          character_profiles?: Json | null
          completion_percentage?: number | null
          created_at?: string
          current_chapter?: number | null
          description?: string | null
          difficulty_level?: number | null
          estimated_completion_time?: number | null
          id?: string
          narrative_arc?: Json
          project_id?: string
          story_elements?: Json | null
          theme_id?: string | null
          title?: string
          total_chapters?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_narratives_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_narratives_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "story_themes"
            referencedColumns: ["id"]
          },
        ]
      }
      story_progression: {
        Row: {
          chapters_completed: string[] | null
          choices_made: Json | null
          completed_at: string | null
          completion_percentage: number | null
          current_chapter_id: string | null
          custom_variables: Json | null
          id: string
          is_completed: boolean | null
          last_activity_at: string
          narrative_id: string
          started_at: string
          user_id: string
        }
        Insert: {
          chapters_completed?: string[] | null
          choices_made?: Json | null
          completed_at?: string | null
          completion_percentage?: number | null
          current_chapter_id?: string | null
          custom_variables?: Json | null
          id?: string
          is_completed?: boolean | null
          last_activity_at?: string
          narrative_id: string
          started_at?: string
          user_id: string
        }
        Update: {
          chapters_completed?: string[] | null
          choices_made?: Json | null
          completed_at?: string | null
          completion_percentage?: number | null
          current_chapter_id?: string | null
          custom_variables?: Json | null
          id?: string
          is_completed?: boolean | null
          last_activity_at?: string
          narrative_id?: string
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_progression_current_chapter_id_fkey"
            columns: ["current_chapter_id"]
            isOneToOne: false
            referencedRelation: "story_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_progression_narrative_id_fkey"
            columns: ["narrative_id"]
            isOneToOne: false
            referencedRelation: "story_narratives"
            referencedColumns: ["id"]
          },
        ]
      }
      story_templates: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string
          id: string
          is_premium: boolean | null
          name: string
          preview_image_url: string | null
          template_data: Json
          usage_count: number | null
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          is_premium?: boolean | null
          name: string
          preview_image_url?: string | null
          template_data: Json
          usage_count?: number | null
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          is_premium?: boolean | null
          name?: string
          preview_image_url?: string | null
          template_data?: Json
          usage_count?: number | null
        }
        Relationships: []
      }
      story_themes: {
        Row: {
          background_image_url: string | null
          category: Database["public"]["Enums"]["story_theme_category"] | null
          color_scheme: Json | null
          created_at: string
          description: string | null
          difficulty_level: number | null
          estimated_duration_days: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          background_image_url?: string | null
          category?: Database["public"]["Enums"]["story_theme_category"] | null
          color_scheme?: Json | null
          created_at?: string
          description?: string | null
          difficulty_level?: number | null
          estimated_duration_days?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          background_image_url?: string | null
          category?: Database["public"]["Enums"]["story_theme_category"] | null
          color_scheme?: Json | null
          created_at?: string
          description?: string | null
          difficulty_level?: number | null
          estimated_duration_days?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      swimlanes: {
        Row: {
          color: string | null
          created_at: string
          id: string
          is_default: boolean | null
          name: string
          position: number
          project_id: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          name: string
          position: number
          project_id: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          name?: string
          position?: number
          project_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      task_assignees: {
        Row: {
          assigned_at: string
          assigned_by: string
          created_at: string
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          created_at?: string
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          created_at?: string
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: []
      }
      task_relationships: {
        Row: {
          created_at: string
          created_by: string
          id: string
          notes: string | null
          relationship_type: Database["public"]["Enums"]["task_relationship_type"]
          source_task_id: string
          target_task_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          notes?: string | null
          relationship_type: Database["public"]["Enums"]["task_relationship_type"]
          source_task_id: string
          target_task_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          relationship_type?: Database["public"]["Enums"]["task_relationship_type"]
          source_task_id?: string
          target_task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_source_task"
            columns: ["source_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_target_task"
            columns: ["target_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_status_mappings: {
        Row: {
          column_id: string
          created_at: string
          display_name: string
          id: string
          project_id: string
          status_value: string
        }
        Insert: {
          column_id: string
          created_at?: string
          display_name: string
          id?: string
          project_id: string
          status_value: string
        }
        Update: {
          column_id?: string
          created_at?: string
          display_name?: string
          id?: string
          project_id?: string
          status_value?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assignee_id: string | null
          blocked: boolean | null
          blocking_reason: string | null
          created_at: string
          description: string | null
          due_date: string | null
          hierarchy_level:
            | Database["public"]["Enums"]["task_hierarchy_level"]
            | null
          id: string
          parent_id: string | null
          priority: Database["public"]["Enums"]["task_priority"] | null
          project_id: string
          reporter_id: string
          sprint_id: string | null
          status: Database["public"]["Enums"]["task_status"] | null
          story_points: number | null
          swimlane_id: string | null
          task_type: Database["public"]["Enums"]["task_type"] | null
          ticket_number: number | null
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          blocked?: boolean | null
          blocking_reason?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          hierarchy_level?:
            | Database["public"]["Enums"]["task_hierarchy_level"]
            | null
          id?: string
          parent_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"] | null
          project_id: string
          reporter_id: string
          sprint_id?: string | null
          status?: Database["public"]["Enums"]["task_status"] | null
          story_points?: number | null
          swimlane_id?: string | null
          task_type?: Database["public"]["Enums"]["task_type"] | null
          ticket_number?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          blocked?: boolean | null
          blocking_reason?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          hierarchy_level?:
            | Database["public"]["Enums"]["task_hierarchy_level"]
            | null
          id?: string
          parent_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"] | null
          project_id?: string
          reporter_id?: string
          sprint_id?: string | null
          status?: Database["public"]["Enums"]["task_status"] | null
          story_points?: number | null
          swimlane_id?: string | null
          task_type?: Database["public"]["Enums"]["task_type"] | null
          ticket_number?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_tasks_assignee_id"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fk_tasks_reporter_id"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tasks_parent_id_fkey"
            columns: ["parent_id"]
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
          {
            foreignKeyName: "tasks_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tasks_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprints"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          project_id: string | null
          role: Database["public"]["Enums"]["team_role"]
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          project_id?: string | null
          role?: Database["public"]["Enums"]["team_role"]
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          project_id?: string | null
          role?: Database["public"]["Enums"]["team_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_categories: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          required_fields: Json | null
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          required_fields?: Json | null
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          required_fields?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      ticket_ratings: {
        Row: {
          created_at: string
          feedback: string | null
          id: string
          rating: number | null
          ticket_id: string
        }
        Insert: {
          created_at?: string
          feedback?: string | null
          id?: string
          rating?: number | null
          ticket_id: string
        }
        Update: {
          created_at?: string
          feedback?: string | null
          id?: string
          rating?: number | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_ratings_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_responses: {
        Row: {
          author_email: string | null
          author_id: string | null
          author_name: string | null
          content: string
          created_at: string
          id: string
          is_internal: boolean | null
          ticket_id: string
          updated_at: string
        }
        Insert: {
          author_email?: string | null
          author_id?: string | null
          author_name?: string | null
          content: string
          created_at?: string
          id?: string
          is_internal?: boolean | null
          ticket_id: string
          updated_at?: string
        }
        Update: {
          author_email?: string | null
          author_id?: string | null
          author_name?: string | null
          content?: string
          created_at?: string
          id?: string
          is_internal?: boolean | null
          ticket_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_responses_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          assigned_to: string | null
          category_id: string
          closed_at: string | null
          created_at: string
          created_by: string | null
          custom_fields: Json | null
          customer_company: string | null
          customer_email: string
          customer_name: string
          customer_phone: string | null
          description: string
          id: string
          priority: Database["public"]["Enums"]["ticket_priority"] | null
          resolved_at: string | null
          status: Database["public"]["Enums"]["ticket_status"] | null
          ticket_number: number
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category_id: string
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          custom_fields?: Json | null
          customer_company?: string | null
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          description: string
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"] | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"] | null
          ticket_number: number
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category_id?: string
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          custom_fields?: Json | null
          customer_company?: string | null
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          description?: string
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"] | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"] | null
          ticket_number?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "ticket_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          created_at: string
          description: string | null
          duration_minutes: number | null
          ended_at: string | null
          id: string
          is_running: boolean
          started_at: string
          task_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          is_running?: boolean
          started_at: string
          task_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          is_running?: boolean
          started_at?: string
          task_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          earned_at: string
          id: string
          progress_data: Json | null
          user_id: string
        }
        Insert: {
          achievement_id: string
          earned_at?: string
          id?: string
          progress_data?: Json | null
          user_id: string
        }
        Update: {
          achievement_id?: string
          earned_at?: string
          id?: string
          progress_data?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_ai_interactions: {
        Row: {
          ai_helper_id: string
          content: string
          context_data: Json | null
          created_at: string
          id: string
          message_type: string
          session_id: string
          user_id: string
        }
        Insert: {
          ai_helper_id: string
          content: string
          context_data?: Json | null
          created_at?: string
          id?: string
          message_type: string
          session_id: string
          user_id: string
        }
        Update: {
          ai_helper_id?: string
          content?: string
          context_data?: Json | null
          created_at?: string
          id?: string
          message_type?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_ai_interactions_ai_helper_id_fkey"
            columns: ["ai_helper_id"]
            isOneToOne: false
            referencedRelation: "ai_helpers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_daily_completions: {
        Row: {
          challenge_id: string
          completed_at: string
          completion_data: Json | null
          experience_earned: number | null
          id: string
          points_earned: number | null
          user_id: string
        }
        Insert: {
          challenge_id: string
          completed_at?: string
          completion_data?: Json | null
          experience_earned?: number | null
          id?: string
          points_earned?: number | null
          user_id: string
        }
        Update: {
          challenge_id?: string
          completed_at?: string
          completion_data?: Json | null
          experience_earned?: number | null
          id?: string
          points_earned?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_daily_completions_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "daily_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notification_preferences: {
        Row: {
          created_at: string
          email_mentions: boolean
          email_project_updates: boolean
          email_task_updates: boolean
          id: string
          in_app_mentions: boolean
          in_app_project_updates: boolean
          in_app_task_updates: boolean
          push_mentions: boolean
          push_project_updates: boolean
          push_task_updates: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_mentions?: boolean
          email_project_updates?: boolean
          email_task_updates?: boolean
          id?: string
          in_app_mentions?: boolean
          in_app_project_updates?: boolean
          in_app_task_updates?: boolean
          push_mentions?: boolean
          push_project_updates?: boolean
          push_task_updates?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_mentions?: boolean
          email_project_updates?: boolean
          email_task_updates?: boolean
          id?: string
          in_app_mentions?: boolean
          in_app_project_updates?: boolean
          in_app_task_updates?: boolean
          push_mentions?: boolean
          push_project_updates?: boolean
          push_task_updates?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_progression: {
        Row: {
          achievements: Json | null
          active_challenges: string[] | null
          created_at: string
          current_narrative_id: string | null
          experience_points: number | null
          id: string
          last_activity_date: string | null
          level: number | null
          preferred_themes: string[] | null
          skill_points: Json | null
          story_progress: Json | null
          streak_days: number | null
          total_tasks_completed: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          achievements?: Json | null
          active_challenges?: string[] | null
          created_at?: string
          current_narrative_id?: string | null
          experience_points?: number | null
          id?: string
          last_activity_date?: string | null
          level?: number | null
          preferred_themes?: string[] | null
          skill_points?: Json | null
          story_progress?: Json | null
          streak_days?: number | null
          total_tasks_completed?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          achievements?: Json | null
          active_challenges?: string[] | null
          created_at?: string
          current_narrative_id?: string | null
          experience_points?: number | null
          id?: string
          last_activity_date?: string | null
          level?: number | null
          preferred_themes?: string[] | null
          skill_points?: Json | null
          story_progress?: Json | null
          streak_days?: number | null
          total_tasks_completed?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_progression_current_narrative_id_fkey"
            columns: ["current_narrative_id"]
            isOneToOne: false
            referencedRelation: "story_narratives"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          ip_address: unknown | null
          is_active: boolean
          last_activity: string
          session_token: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          ip_address?: unknown | null
          is_active?: boolean
          last_activity?: string
          session_token: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: unknown | null
          is_active?: boolean
          last_activity?: string
          session_token?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      project_members_with_profiles: {
        Row: {
          avatar_url: string | null
          full_name: string | null
          project_id: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      task_assignees_with_profiles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          avatar_url: string | null
          full_name: string | null
          id: string | null
          task_id: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_story_points_rollup: {
        Args: { task_id_param: string }
        Returns: number
      }
      can_delete_default_project: {
        Args: { project_id: string }
        Returns: boolean
      }
      generate_username: {
        Args: { full_name_param: string }
        Returns: string
      }
      get_next_ticket_number: {
        Args: Record<PropertyKey, never> | { project_id_param: string }
        Returns: number
      }
      get_task_children: {
        Args: { task_id: string }
        Returns: {
          id: string
          title: string
          hierarchy_level: Database["public"]["Enums"]["task_hierarchy_level"]
          task_type: Database["public"]["Enums"]["task_type"]
          status: Database["public"]["Enums"]["task_status"]
          priority: Database["public"]["Enums"]["task_priority"]
        }[]
      }
      get_task_hierarchy_path: {
        Args: { task_id: string }
        Returns: {
          id: string
          title: string
          hierarchy_level: Database["public"]["Enums"]["task_hierarchy_level"]
          depth: number
        }[]
      }
      get_task_relationships: {
        Args: { task_id_param: string }
        Returns: {
          id: string
          source_task_id: string
          target_task_id: string
          relationship_type: Database["public"]["Enums"]["task_relationship_type"]
          created_at: string
          created_by: string
          notes: string
          source_task_title: string
          target_task_title: string
          source_task_status: Database["public"]["Enums"]["task_status"]
          target_task_status: Database["public"]["Enums"]["task_status"]
        }[]
      }
      get_team_member_stats: {
        Args: { member_user_id: string }
        Returns: {
          projects_count: number
          tasks_completed: number
          total_time_minutes: number
        }[]
      }
      is_admin: {
        Args: { user_id: string }
        Returns: boolean
      }
      is_project_member: {
        Args: { project_id: string; user_id: string }
        Returns: boolean
      }
      is_verified_admin_email: {
        Args: { email: string }
        Returns: boolean
      }
      migrate_existing_assignees: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      should_show_in_kanban: {
        Args: {
          task_hierarchy: Database["public"]["Enums"]["task_hierarchy_level"]
        }
        Returns: boolean
      }
      verify_admin_action: {
        Args: { action_type: string }
        Returns: boolean
      }
    }
    Enums: {
      achievement_type:
        | "milestone"
        | "streak"
        | "completion"
        | "collaboration"
        | "leadership"
        | "innovation"
      ai_helper_personality:
        | "mentor"
        | "cheerleader"
        | "analyst"
        | "creative"
        | "technical"
      challenge_type:
        | "sprint"
        | "milestone"
        | "collaboration"
        | "innovation"
        | "completion"
      leaderboard_type: "global" | "project" | "team" | "challenge"
      notification_type: "info" | "success" | "warning" | "error"
      project_status:
        | "planning"
        | "active"
        | "on_hold"
        | "completed"
        | "cancelled"
      sprint_status: "planning" | "active" | "completed"
      story_theme_category:
        | "fantasy"
        | "sci_fi"
        | "adventure"
        | "mystery"
        | "corporate"
        | "space"
        | "medieval"
      task_hierarchy_level: "initiative" | "epic" | "story" | "task" | "subtask"
      task_priority: "low" | "medium" | "high" | "urgent"
      task_relationship_type:
        | "blocks"
        | "depends_on"
        | "duplicates"
        | "relates_to"
      task_status: "todo" | "in_progress" | "in_review" | "done"
      task_type:
        | "bug"
        | "feature_request"
        | "design"
        | "story"
        | "epic"
        | "initiative"
        | "task"
        | "subtask"
      team_role:
        | "admin"
        | "project_manager"
        | "developer"
        | "designer"
        | "qa"
        | "viewer"
        | "super_admin"
      ticket_priority: "low" | "medium" | "high" | "urgent"
      ticket_status:
        | "open"
        | "in_progress"
        | "pending_customer"
        | "resolved"
        | "closed"
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
      achievement_type: [
        "milestone",
        "streak",
        "completion",
        "collaboration",
        "leadership",
        "innovation",
      ],
      ai_helper_personality: [
        "mentor",
        "cheerleader",
        "analyst",
        "creative",
        "technical",
      ],
      challenge_type: [
        "sprint",
        "milestone",
        "collaboration",
        "innovation",
        "completion",
      ],
      leaderboard_type: ["global", "project", "team", "challenge"],
      notification_type: ["info", "success", "warning", "error"],
      project_status: [
        "planning",
        "active",
        "on_hold",
        "completed",
        "cancelled",
      ],
      sprint_status: ["planning", "active", "completed"],
      story_theme_category: [
        "fantasy",
        "sci_fi",
        "adventure",
        "mystery",
        "corporate",
        "space",
        "medieval",
      ],
      task_hierarchy_level: ["initiative", "epic", "story", "task", "subtask"],
      task_priority: ["low", "medium", "high", "urgent"],
      task_relationship_type: [
        "blocks",
        "depends_on",
        "duplicates",
        "relates_to",
      ],
      task_status: ["todo", "in_progress", "in_review", "done"],
      task_type: [
        "bug",
        "feature_request",
        "design",
        "story",
        "epic",
        "initiative",
        "task",
        "subtask",
      ],
      team_role: [
        "admin",
        "project_manager",
        "developer",
        "designer",
        "qa",
        "viewer",
        "super_admin",
      ],
      ticket_priority: ["low", "medium", "high", "urgent"],
      ticket_status: [
        "open",
        "in_progress",
        "pending_customer",
        "resolved",
        "closed",
      ],
    },
  },
} as const
