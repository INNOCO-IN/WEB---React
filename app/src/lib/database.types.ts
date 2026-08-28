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
      collectives: {
        Row: {
          created_at: string
          full_bio: string | null
          name: string
          num: string
          one_liner: string | null
          photo: string | null
          role: string | null
          status: string
        }
        Insert: {
          created_at?: string
          full_bio?: string | null
          name: string
          num: string
          one_liner?: string | null
          photo?: string | null
          role?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          full_bio?: string | null
          name?: string
          num?: string
          one_liner?: string | null
          photo?: string | null
          role?: string | null
          status?: string
        }
        Relationships: []
      }
      communities: {
        Row: {
          accent: string | null
          body: string | null
          body_ko: string | null
          created_at: string
          eyebrow: string | null
          eyebrow_ko: string | null
          image: string | null
          meta: string | null
          meta_ko: string | null
          route: string | null
          slug: string
          sort_order: number
          status: string
          title: string
          title_ko: string | null
        }
        Insert: {
          accent?: string | null
          body?: string | null
          body_ko?: string | null
          created_at?: string
          eyebrow?: string | null
          eyebrow_ko?: string | null
          image?: string | null
          meta?: string | null
          meta_ko?: string | null
          route?: string | null
          slug: string
          sort_order?: number
          status?: string
          title: string
          title_ko?: string | null
        }
        Update: {
          accent?: string | null
          body?: string | null
          body_ko?: string | null
          created_at?: string
          eyebrow?: string | null
          eyebrow_ko?: string | null
          image?: string | null
          meta?: string | null
          meta_ko?: string | null
          route?: string | null
          slug?: string
          sort_order?: number
          status?: string
          title?: string
          title_ko?: string | null
        }
        Relationships: []
      }
      constellation_points: {
        Row: {
          arc: string | null
          by_line: string | null
          caption: string | null
          created_at: string
          format: string
          id: string
          media_href: string | null
          month: string
          read_href: string | null
          title: string
          topic: string
          view_href: string | null
        }
        Insert: {
          arc?: string | null
          by_line?: string | null
          caption?: string | null
          created_at?: string
          format: string
          id: string
          media_href?: string | null
          month: string
          read_href?: string | null
          title: string
          topic: string
          view_href?: string | null
        }
        Update: {
          arc?: string | null
          by_line?: string | null
          caption?: string | null
          created_at?: string
          format?: string
          id?: string
          media_href?: string | null
          month?: string
          read_href?: string | null
          title?: string
          topic?: string
          view_href?: string | null
        }
        Relationships: []
      }
      news: {
        Row: {
          accent: string | null
          body: string | null
          created_at: string
          credit: string | null
          credit_href: string | null
          eyebrow: string | null
          feeds: string[]
          id: string
          image: string | null
          kind: string | null
          link: string | null
          published_at: string | null
          sort_order: number
          status: string
          title: string
        }
        Insert: {
          accent?: string | null
          body?: string | null
          created_at?: string
          credit?: string | null
          credit_href?: string | null
          eyebrow?: string | null
          feeds?: string[]
          id: string
          image?: string | null
          kind?: string | null
          link?: string | null
          published_at?: string | null
          sort_order?: number
          status?: string
          title: string
        }
        Update: {
          accent?: string | null
          body?: string | null
          created_at?: string
          credit?: string | null
          credit_href?: string | null
          eyebrow?: string | null
          feeds?: string[]
          id?: string
          image?: string | null
          kind?: string | null
          link?: string | null
          published_at?: string | null
          sort_order?: number
          status?: string
          title?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          accent: string | null
          body: string | null
          body_ko: string | null
          created_at: string
          eyebrow: string | null
          eyebrow_ko: string | null
          featured: boolean
          image: string | null
          meta: string | null
          route: string | null
          slug: string
          sort_order: number
          started_on: string | null
          status: string
          title: string
          title_ko: string | null
        }
        Insert: {
          accent?: string | null
          body?: string | null
          body_ko?: string | null
          created_at?: string
          eyebrow?: string | null
          eyebrow_ko?: string | null
          featured?: boolean
          image?: string | null
          meta?: string | null
          route?: string | null
          slug: string
          sort_order?: number
          started_on?: string | null
          status?: string
          title: string
          title_ko?: string | null
        }
        Update: {
          accent?: string | null
          body?: string | null
          body_ko?: string | null
          created_at?: string
          eyebrow?: string | null
          eyebrow_ko?: string | null
          featured?: boolean
          image?: string | null
          meta?: string | null
          route?: string | null
          slug?: string
          sort_order?: number
          started_on?: string | null
          status?: string
          title?: string
          title_ko?: string | null
        }
        Relationships: []
      }
      staff_emails: {
        Row: {
          email: string
        }
        Insert: {
          email: string
        }
        Update: {
          email?: string
        }
        Relationships: []
      }
      stories: {
        Row: {
          arc_stage: string | null
          attachment_url: string | null
          body: string
          consent: boolean
          created_at: string
          credit_name: string | null
          door: string | null
          email: string | null
          format: string[] | null
          id: string
          media: Json | null
          source_page: string | null
          status: string
        }
        Insert: {
          arc_stage?: string | null
          attachment_url?: string | null
          body: string
          consent?: boolean
          created_at?: string
          credit_name?: string | null
          door?: string | null
          email?: string | null
          format?: string[] | null
          id?: string
          media?: Json | null
          source_page?: string | null
          status?: string
        }
        Update: {
          arc_stage?: string | null
          attachment_url?: string | null
          body?: string
          consent?: boolean
          created_at?: string
          credit_name?: string | null
          door?: string | null
          email?: string | null
          format?: string[] | null
          id?: string
          media?: Json | null
          source_page?: string | null
          status?: string
        }
        Relationships: []
      }
      story_entries: {
        Row: {
          color: string | null
          created_at: string
          draft: boolean
          en: Json
          format: string
          href: string | null
          id: string
          image: string | null
          image_fit: string | null
          image_position: string | null
          image_ratio: string | null
          ko: Json
          published_on: string
          topic: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          draft?: boolean
          en: Json
          format: string
          href?: string | null
          id: string
          image?: string | null
          image_fit?: string | null
          image_position?: string | null
          image_ratio?: string | null
          ko: Json
          published_on: string
          topic: string
        }
        Update: {
          color?: string | null
          created_at?: string
          draft?: boolean
          en?: Json
          format?: string
          href?: string | null
          id?: string
          image?: string | null
          image_fit?: string | null
          image_position?: string | null
          image_ratio?: string | null
          ko?: Json
          published_on?: string
          topic?: string
        }
        Relationships: []
      }
      submissions: {
        Row: {
          brings: string | null
          created_at: string
          email: string
          id: string
          message: string | null
          name: string
          source_page: string | null
          status: string
        }
        Insert: {
          brings?: string | null
          created_at?: string
          email: string
          id?: string
          message?: string | null
          name: string
          source_page?: string | null
          status?: string
        }
        Update: {
          brings?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          name?: string
          source_page?: string | null
          status?: string
        }
        Relationships: []
      }
      workshop_registrations: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string | null
          name: string
          org: string | null
          source_page: string | null
          status: string
          workshop_id: string | null
          workshop_slug: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message?: string | null
          name: string
          org?: string | null
          source_page?: string | null
          status?: string
          workshop_id?: string | null
          workshop_slug?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          name?: string
          org?: string | null
          source_page?: string | null
          status?: string
          workshop_id?: string | null
          workshop_slug?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workshop_registrations_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      workshops: {
        Row: {
          accent: string | null
          active: boolean
          audience: string | null
          blurb: string | null
          created_at: string
          cta: string | null
          duration: string | null
          eyebrow: string | null
          featured: boolean
          id: string
          ink: string
          route: string | null
          slug: string
          sort_order: number
          title: string
        }
        Insert: {
          accent?: string | null
          active?: boolean
          audience?: string | null
          blurb?: string | null
          created_at?: string
          cta?: string | null
          duration?: string | null
          eyebrow?: string | null
          featured?: boolean
          id?: string
          ink?: string
          route?: string | null
          slug: string
          sort_order?: number
          title: string
        }
        Update: {
          accent?: string | null
          active?: boolean
          audience?: string | null
          blurb?: string | null
          created_at?: string
          cta?: string | null
          duration?: string | null
          eyebrow?: string | null
          featured?: boolean
          id?: string
          ink?: string
          route?: string | null
          slug?: string
          sort_order?: number
          title?: string
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
  public: {
    Enums: {},
  },
} as const
