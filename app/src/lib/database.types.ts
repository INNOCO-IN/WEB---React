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
          full_bio_ko: string | null
          full_bio_zh_tw: string | null
          name: string
          name_ko: string | null
          name_zh_tw: string | null
          num: string
          one_liner: string | null
          one_liner_ko: string | null
          one_liner_zh_tw: string | null
          photo: string | null
          role: string | null
          role_ko: string | null
          role_zh_tw: string | null
          status: string
        }
        Insert: {
          created_at?: string
          full_bio?: string | null
          full_bio_ko?: string | null
          full_bio_zh_tw?: string | null
          name: string
          name_ko?: string | null
          name_zh_tw?: string | null
          num: string
          one_liner?: string | null
          one_liner_ko?: string | null
          one_liner_zh_tw?: string | null
          photo?: string | null
          role?: string | null
          role_ko?: string | null
          role_zh_tw?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          full_bio?: string | null
          full_bio_ko?: string | null
          full_bio_zh_tw?: string | null
          name?: string
          name_ko?: string | null
          name_zh_tw?: string | null
          num?: string
          one_liner?: string | null
          one_liner_ko?: string | null
          one_liner_zh_tw?: string | null
          photo?: string | null
          role?: string | null
          role_ko?: string | null
          role_zh_tw?: string | null
          status?: string
        }
        Relationships: []
      }
      communities: {
        Row: {
          accent: string | null
          body: string | null
          body_ko: string | null
          body_zh_tw: string | null
          created_at: string
          eyebrow: string | null
          eyebrow_ko: string | null
          eyebrow_zh_tw: string | null
          image: string | null
          meta: string | null
          meta_ko: string | null
          meta_zh_tw: string | null
          route: string | null
          slug: string
          sort_order: number
          status: string
          title: string
          title_ko: string | null
          title_zh_tw: string | null
        }
        Insert: {
          accent?: string | null
          body?: string | null
          body_ko?: string | null
          body_zh_tw?: string | null
          created_at?: string
          eyebrow?: string | null
          eyebrow_ko?: string | null
          eyebrow_zh_tw?: string | null
          image?: string | null
          meta?: string | null
          meta_ko?: string | null
          meta_zh_tw?: string | null
          route?: string | null
          slug: string
          sort_order?: number
          status?: string
          title: string
          title_ko?: string | null
          title_zh_tw?: string | null
        }
        Update: {
          accent?: string | null
          body?: string | null
          body_ko?: string | null
          body_zh_tw?: string | null
          created_at?: string
          eyebrow?: string | null
          eyebrow_ko?: string | null
          eyebrow_zh_tw?: string | null
          image?: string | null
          meta?: string | null
          meta_ko?: string | null
          meta_zh_tw?: string | null
          route?: string | null
          slug?: string
          sort_order?: number
          status?: string
          title?: string
          title_ko?: string | null
          title_zh_tw?: string | null
        }
        Relationships: []
      }
      constellation_points: {
        Row: {
          arc: string | null
          by_line: string | null
          by_line_ko: string | null
          by_line_zh_tw: string | null
          caption: string | null
          caption_ko: string | null
          caption_zh_tw: string | null
          created_at: string
          format: string
          hidden: boolean
          id: string
          media_href: string | null
          month: string
          read_href: string | null
          title: string
          title_ko: string | null
          title_zh_tw: string | null
          topic: string
          topic_ko: string | null
          topic_zh_tw: string | null
          view_href: string | null
        }
        Insert: {
          arc?: string | null
          by_line?: string | null
          by_line_ko?: string | null
          by_line_zh_tw?: string | null
          caption?: string | null
          caption_ko?: string | null
          caption_zh_tw?: string | null
          created_at?: string
          format: string
          hidden?: boolean
          id: string
          media_href?: string | null
          month: string
          read_href?: string | null
          title: string
          title_ko?: string | null
          title_zh_tw?: string | null
          topic: string
          topic_ko?: string | null
          topic_zh_tw?: string | null
          view_href?: string | null
        }
        Update: {
          arc?: string | null
          by_line?: string | null
          by_line_ko?: string | null
          by_line_zh_tw?: string | null
          caption?: string | null
          caption_ko?: string | null
          caption_zh_tw?: string | null
          created_at?: string
          format?: string
          hidden?: boolean
          id?: string
          media_href?: string | null
          month?: string
          read_href?: string | null
          title?: string
          title_ko?: string | null
          title_zh_tw?: string | null
          topic?: string
          topic_ko?: string | null
          topic_zh_tw?: string | null
          view_href?: string | null
        }
        Relationships: []
      }
      news: {
        Row: {
          accent: string | null
          body: string | null
          body_ko: string | null
          body_zh_tw: string | null
          created_at: string
          credit: string | null
          credit_href: string | null
          edited_at: string | null
          edited_by: string | null
          eyebrow: string | null
          eyebrow_ko: string | null
          eyebrow_zh_tw: string | null
          feeds: string[]
          id: string
          image: string | null
          kind: string | null
          kind_ko: string | null
          kind_zh_tw: string | null
          link: string | null
          published_at: string | null
          sort_order: number
          status: string
          title: string
          title_ko: string | null
          title_zh_tw: string | null
        }
        Insert: {
          accent?: string | null
          body?: string | null
          body_ko?: string | null
          body_zh_tw?: string | null
          created_at?: string
          credit?: string | null
          credit_href?: string | null
          edited_at?: string | null
          edited_by?: string | null
          eyebrow?: string | null
          eyebrow_ko?: string | null
          eyebrow_zh_tw?: string | null
          feeds?: string[]
          id: string
          image?: string | null
          kind?: string | null
          kind_ko?: string | null
          kind_zh_tw?: string | null
          link?: string | null
          published_at?: string | null
          sort_order?: number
          status?: string
          title: string
          title_ko?: string | null
          title_zh_tw?: string | null
        }
        Update: {
          accent?: string | null
          body?: string | null
          body_ko?: string | null
          body_zh_tw?: string | null
          created_at?: string
          credit?: string | null
          credit_href?: string | null
          edited_at?: string | null
          edited_by?: string | null
          eyebrow?: string | null
          eyebrow_ko?: string | null
          eyebrow_zh_tw?: string | null
          feeds?: string[]
          id?: string
          image?: string | null
          kind?: string | null
          kind_ko?: string | null
          kind_zh_tw?: string | null
          link?: string | null
          published_at?: string | null
          sort_order?: number
          status?: string
          title?: string
          title_ko?: string | null
          title_zh_tw?: string | null
        }
        Relationships: []
      }
      page_localizations: {
        Row: {
          content: Json
          created_at: string
          document_override: Json | null
          id: string
          locale: string
          page_id: string
          seo: Json
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          document_override?: Json | null
          id?: string
          locale: string
          page_id: string
          seo?: Json
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          document_override?: Json | null
          id?: string
          locale?: string
          page_id?: string
          seo?: Json
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_localizations_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      pages: {
        Row: {
          created_at: string
          default_locale: string
          id: string
          route_key: string
          shared_document: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_locale?: string
          id: string
          route_key: string
          shared_document?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_locale?: string
          id?: string
          route_key?: string
          shared_document?: Json
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          accent: string | null
          body: string | null
          body_ko: string | null
          body_zh_tw: string | null
          created_at: string
          eyebrow: string | null
          eyebrow_ko: string | null
          eyebrow_zh_tw: string | null
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
          title_zh_tw: string | null
        }
        Insert: {
          accent?: string | null
          body?: string | null
          body_ko?: string | null
          body_zh_tw?: string | null
          created_at?: string
          eyebrow?: string | null
          eyebrow_ko?: string | null
          eyebrow_zh_tw?: string | null
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
          title_zh_tw?: string | null
        }
        Update: {
          accent?: string | null
          body?: string | null
          body_ko?: string | null
          body_zh_tw?: string | null
          created_at?: string
          eyebrow?: string | null
          eyebrow_ko?: string | null
          eyebrow_zh_tw?: string | null
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
          title_zh_tw?: string | null
        }
        Relationships: []
      }
      review_policy: {
        Row: {
          changed_at: string
          only_row: boolean
          second_factor: string
        }
        Insert: {
          changed_at?: string
          only_row?: boolean
          second_factor?: string
        }
        Update: {
          changed_at?: string
          only_row?: boolean
          second_factor?: string
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
          published_as: string | null
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
          published_as?: string | null
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
          published_as?: string | null
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
          edited_at: string | null
          edited_by: string | null
          en: Json
          format: string
          hidden: boolean
          href: string | null
          id: string
          image: string | null
          image_fit: string | null
          image_position: string | null
          image_ratio: string | null
          ko: Json
          published_on: string
          topic: string
          wall_order: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          draft?: boolean
          edited_at?: string | null
          edited_by?: string | null
          en: Json
          format: string
          hidden?: boolean
          href?: string | null
          id: string
          image?: string | null
          image_fit?: string | null
          image_position?: string | null
          image_ratio?: string | null
          ko: Json
          published_on: string
          topic: string
          wall_order?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string
          draft?: boolean
          edited_at?: string | null
          edited_by?: string | null
          en?: Json
          format?: string
          hidden?: boolean
          href?: string | null
          id?: string
          image?: string | null
          image_fit?: string | null
          image_position?: string | null
          image_ratio?: string | null
          ko?: Json
          published_on?: string
          topic?: string
          wall_order?: number | null
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
          audience_ko: string | null
          audience_zh_tw: string | null
          blurb: string | null
          blurb_ko: string | null
          blurb_zh_tw: string | null
          created_at: string
          cta: string | null
          cta_ko: string | null
          cta_zh_tw: string | null
          duration: string | null
          duration_ko: string | null
          duration_zh_tw: string | null
          eyebrow: string | null
          eyebrow_ko: string | null
          eyebrow_zh_tw: string | null
          featured: boolean
          id: string
          ink: string
          route: string | null
          slug: string
          sort_order: number
          title: string
          title_ko: string | null
          title_zh_tw: string | null
        }
        Insert: {
          accent?: string | null
          active?: boolean
          audience?: string | null
          audience_ko?: string | null
          audience_zh_tw?: string | null
          blurb?: string | null
          blurb_ko?: string | null
          blurb_zh_tw?: string | null
          created_at?: string
          cta?: string | null
          cta_ko?: string | null
          cta_zh_tw?: string | null
          duration?: string | null
          duration_ko?: string | null
          duration_zh_tw?: string | null
          eyebrow?: string | null
          eyebrow_ko?: string | null
          eyebrow_zh_tw?: string | null
          featured?: boolean
          id?: string
          ink?: string
          route?: string | null
          slug: string
          sort_order?: number
          title: string
          title_ko?: string | null
          title_zh_tw?: string | null
        }
        Update: {
          accent?: string | null
          active?: boolean
          audience?: string | null
          audience_ko?: string | null
          audience_zh_tw?: string | null
          blurb?: string | null
          blurb_ko?: string | null
          blurb_zh_tw?: string | null
          created_at?: string
          cta?: string | null
          cta_ko?: string | null
          cta_zh_tw?: string | null
          duration?: string | null
          duration_ko?: string | null
          duration_zh_tw?: string | null
          eyebrow?: string | null
          eyebrow_ko?: string | null
          eyebrow_zh_tw?: string | null
          featured?: boolean
          id?: string
          ink?: string
          route?: string | null
          slug?: string
          sort_order?: number
          title?: string
          title_ko?: string | null
          title_zh_tw?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_staff: { Args: never; Returns: boolean }
      on_staff_list: { Args: never; Returns: boolean }
      second_factor_ok: { Args: never; Returns: boolean }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
