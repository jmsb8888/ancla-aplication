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
    PostgrestVersion: "14.15"
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
      documentos: {
        Row: {
          config: Json
          contenido_md: string
          created_at: string
          estado: string
          id: string
          metricas: Json
          prompt_enviado: string
          reunion_id: string
          user_id: string
          version_prompt: number
        }
        Insert: {
          config?: Json
          contenido_md?: string
          created_at?: string
          estado?: string
          id?: string
          metricas?: Json
          prompt_enviado?: string
          reunion_id: string
          user_id: string
          version_prompt: number
        }
        Update: {
          config?: Json
          contenido_md?: string
          created_at?: string
          estado?: string
          id?: string
          metricas?: Json
          prompt_enviado?: string
          reunion_id?: string
          user_id?: string
          version_prompt?: number
        }
        Relationships: [
          {
            foreignKeyName: "documentos_reunion_id_fkey"
            columns: ["reunion_id"]
            isOneToOne: false
            referencedRelation: "reuniones"
            referencedColumns: ["id"]
          },
        ]
      }
      exportaciones: {
        Row: {
          created_at: string
          destino: string
          documento_id: string
          error: string | null
          estado: string
          formato: string
          id: string
          url_externa: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          destino: string
          documento_id: string
          error?: string | null
          estado?: string
          formato: string
          id?: string
          url_externa?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          destino?: string
          documento_id?: string
          error?: string | null
          estado?: string
          formato?: string
          id?: string
          url_externa?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exportaciones_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
        ]
      }
      plantillas: {
        Row: {
          contenido: string
          created_at: string
          id: string
          nombre: string
          updated_at: string
          user_id: string
        }
        Insert: {
          contenido?: string
          created_at?: string
          id?: string
          nombre: string
          updated_at?: string
          user_id: string
        }
        Update: {
          contenido?: string
          created_at?: string
          id?: string
          nombre?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          nombre: string | null
          organizacion: string | null
        }
        Insert: {
          created_at?: string
          id: string
          nombre?: string | null
          organizacion?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          nombre?: string | null
          organizacion?: string | null
        }
        Relationships: []
      }
      proyectos: {
        Row: {
          activo: boolean
          carpeta_drive: string
          cliente: string
          created_at: string
          dominio: string
          id: string
          nombre: string
          plantilla_md: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activo?: boolean
          carpeta_drive?: string
          cliente?: string
          created_at?: string
          dominio?: string
          id?: string
          nombre: string
          plantilla_md?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activo?: boolean
          carpeta_drive?: string
          cliente?: string
          created_at?: string
          dominio?: string
          id?: string
          nombre?: string
          plantilla_md?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      requerimientos: {
        Row: {
          cita_offset: number | null
          cita_origen: string | null
          codigo: string
          created_at: string
          criterio_aceptacion: string | null
          documento_id: string
          id: string
          orden: number
          prioridad: string | null
          texto: string
          tipo: string
          user_id: string
        }
        Insert: {
          cita_offset?: number | null
          cita_origen?: string | null
          codigo: string
          created_at?: string
          criterio_aceptacion?: string | null
          documento_id: string
          id?: string
          orden?: number
          prioridad?: string | null
          texto: string
          tipo: string
          user_id: string
        }
        Update: {
          cita_offset?: number | null
          cita_origen?: string | null
          codigo?: string
          created_at?: string
          criterio_aceptacion?: string | null
          documento_id?: string
          id?: string
          orden?: number
          prioridad?: string | null
          texto?: string
          tipo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "requerimientos_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
        ]
      }
      reuniones: {
        Row: {
          created_at: string
          dominio: string
          fecha_reunion: string | null
          id: string
          n_entidades_anonimizadas: number
          n_palabras: number
          proyecto: string
          proyecto_id: string | null
          tiene_original: boolean
          titulo: string
          transcripcion_anonimizada: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dominio?: string
          fecha_reunion?: string | null
          id?: string
          n_entidades_anonimizadas?: number
          n_palabras?: number
          proyecto?: string
          proyecto_id?: string | null
          tiene_original?: boolean
          titulo: string
          transcripcion_anonimizada?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dominio?: string
          fecha_reunion?: string | null
          id?: string
          n_entidades_anonimizadas?: number
          n_palabras?: number
          proyecto?: string
          proyecto_id?: string | null
          tiene_original?: boolean
          titulo?: string
          transcripcion_anonimizada?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reuniones_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
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
