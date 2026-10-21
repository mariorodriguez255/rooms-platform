export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      applications: {
        Row: {
          answers: NonNullable<Json>;
          candidate_id: string;
          created_at: string;
          id: string;
          org_id: string;
          room_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          answers: NonNullable<Json>;
          candidate_id: string;
          created_at?: string;
          id?: string;
          org_id: string;
          room_id: string;
          updated_at?: string;
        };
        Update: {
          answers?: NonNullable<Json>;
          candidate_id?: string;
          created_at?: string;
          id?: string;
          org_id?: string;
          room_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "applications_org_id_candidate_id_fkey";
            columns: ["org_id", "candidate_id"];
            isOneToOne: false;
            referencedRelation: "candidates";
            referencedColumns: ["org_id", "id"];
          },
          {
            foreignKeyName: "applications_org_id_room_id_fkey";
            columns: ["org_id", "room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["org_id", "id"];
          },
        ];
      };
      candidates: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          name: string;
          org_id: string;
          phone: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          email: string;
          id?: string;
          name: string;
          org_id: string;
          phone?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          name?: string;
          org_id?: string;
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "candidates_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      consents: {
        Row: {
          accepted_at: string;
          application_id: string;
          candidate_id: string;
          id: string;
          ip_hash: string | null;
          org_id: string;
          purpose: Database["public"]["Enums"]["consent_purpose"];
          text_version: string;
        };
        ComputedFields: never;
        Insert: {
          accepted_at?: string;
          application_id: string;
          candidate_id: string;
          id?: string;
          ip_hash?: string | null;
          org_id: string;
          purpose: Database["public"]["Enums"]["consent_purpose"];
          text_version: string;
        };
        Update: {
          accepted_at?: string;
          application_id?: string;
          candidate_id?: string;
          id?: string;
          ip_hash?: string | null;
          org_id?: string;
          purpose?: Database["public"]["Enums"]["consent_purpose"];
          text_version?: string;
        };
        Relationships: [
          {
            foreignKeyName: "consents_org_id_application_id_fkey";
            columns: ["org_id", "application_id"];
            isOneToOne: false;
            referencedRelation: "applications";
            referencedColumns: ["org_id", "id"];
          },
          {
            foreignKeyName: "consents_org_id_candidate_id_fkey";
            columns: ["org_id", "candidate_id"];
            isOneToOne: false;
            referencedRelation: "candidates";
            referencedColumns: ["org_id", "id"];
          },
        ];
      };
      invitations: {
        Row: {
          accepted_at: string | null;
          accepted_by: string | null;
          created_at: string;
          email: string;
          expires_at: string;
          id: string;
          invited_by: string | null;
          org_id: string;
          revoked_at: string | null;
          role: Database["public"]["Enums"]["member_role"];
          token_hash: string;
        };
        ComputedFields: never;
        Insert: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          created_at?: string;
          email: string;
          expires_at?: string;
          id?: string;
          invited_by?: string | null;
          org_id: string;
          revoked_at?: string | null;
          role: Database["public"]["Enums"]["member_role"];
          token_hash: string;
        };
        Update: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          created_at?: string;
          email?: string;
          expires_at?: string;
          id?: string;
          invited_by?: string | null;
          org_id?: string;
          revoked_at?: string | null;
          role?: Database["public"]["Enums"]["member_role"];
          token_hash?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invitations_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      members: {
        Row: {
          created_at: string;
          id: string;
          org_id: string;
          role: Database["public"]["Enums"]["member_role"];
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          org_id: string;
          role: Database["public"]["Enums"]["member_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          org_id?: string;
          role?: Database["public"]["Enums"]["member_role"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "members_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      organizations: {
        Row: {
          contact_email: string | null;
          created_at: string;
          id: string;
          name: string;
        };
        ComputedFields: never;
        Insert: {
          contact_email?: string | null;
          created_at?: string;
          id?: string;
          name: string;
        };
        Update: {
          contact_email?: string | null;
          created_at?: string;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      photos: {
        Row: {
          created_at: string;
          height: number;
          id: string;
          org_id: string;
          property_id: string;
          room_id: string | null;
          storage_path: string;
          width: number;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          height: number;
          id?: string;
          org_id: string;
          property_id: string;
          room_id?: string | null;
          storage_path: string;
          width: number;
        };
        Update: {
          created_at?: string;
          height?: number;
          id?: string;
          org_id?: string;
          property_id?: string;
          room_id?: string | null;
          storage_path?: string;
          width?: number;
        };
        Relationships: [
          {
            foreignKeyName: "photos_org_id_property_id_fkey";
            columns: ["org_id", "property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["org_id", "id"];
          },
          {
            foreignKeyName: "photos_property_id_room_id_fkey";
            columns: ["property_id", "room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["property_id", "id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          email: string | null;
          full_name: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      properties: {
        Row: {
          address: string;
          city: string;
          created_at: string;
          id: string;
          name: string;
          org_id: string;
          region: Database["public"]["Enums"]["spanish_region"];
          total_rent_reference_cents: number | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          address: string;
          city: string;
          created_at?: string;
          id?: string;
          name: string;
          org_id: string;
          region: Database["public"]["Enums"]["spanish_region"];
          total_rent_reference_cents?: number | null;
          updated_at?: string;
        };
        Update: {
          address?: string;
          city?: string;
          created_at?: string;
          id?: string;
          name?: string;
          org_id?: string;
          region?: Database["public"]["Enums"]["spanish_region"];
          total_rent_reference_cents?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "properties_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      rooms: {
        Row: {
          available_from: string | null;
          created_at: string;
          deposit_cents: number | null;
          features: NonNullable<Json>;
          id: string;
          name: string;
          org_id: string;
          price_cents: number;
          property_id: string;
          public_token: string;
          size_m2: number | null;
          status: Database["public"]["Enums"]["room_status"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          available_from?: string | null;
          created_at?: string;
          deposit_cents?: number | null;
          features?: NonNullable<Json>;
          id?: string;
          name: string;
          org_id: string;
          price_cents: number;
          property_id: string;
          public_token?: string;
          size_m2?: number | null;
          status?: Database["public"]["Enums"]["room_status"];
          updated_at?: string;
        };
        Update: {
          available_from?: string | null;
          created_at?: string;
          deposit_cents?: number | null;
          features?: NonNullable<Json>;
          id?: string;
          name?: string;
          org_id?: string;
          price_cents?: number;
          property_id?: string;
          public_token?: string;
          size_m2?: number | null;
          status?: Database["public"]["Enums"]["room_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rooms_org_id_property_id_fkey";
            columns: ["org_id", "property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["org_id", "id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      accept_invitation: {
        Args: { invitation_token: string };
        Returns: string;
      };
      create_invitation: {
        Args: {
          invitee_email: string;
          invitee_role: Database["public"]["Enums"]["member_role"];
          target_org: string;
        };
        Returns: string;
      };
      create_organization: { Args: { org_name: string }; Returns: string };
      get_invitation: {
        Args: { invitation_token: string };
        Returns: {
          email_matches: boolean;
          org_name: string;
          role: Database["public"]["Enums"]["member_role"];
          status: string;
        }[];
      };
      get_public_room: {
        Args: { room_token: string };
        Returns: {
          accepting: boolean;
          available_from: string;
          city: string;
          contact_email: string;
          deposit_cents: number;
          features: Json;
          org_name: string;
          photos: Json;
          price_cents: number;
          region: Database["public"]["Enums"]["spanish_region"];
          room_name: string;
          size_m2: number;
          status: Database["public"]["Enums"]["room_status"];
        }[];
      };
      rotate_room_token: { Args: { target_room: string }; Returns: string };
      submit_application: {
        Args: {
          answers: Json;
          candidate_email: string;
          candidate_name: string;
          candidate_phone: string;
          client_ip_hash: string;
          consent_version: string;
          room_token: string;
        };
        Returns: {
          application_id: string;
          is_new: boolean;
        }[];
      };
    };
    Enums: {
      consent_purpose: "application";
      member_role: "owner" | "admin" | "staff";
      room_status: "vacant" | "occupied" | "unavailable";
      spanish_region:
        | "ES-AN"
        | "ES-AR"
        | "ES-AS"
        | "ES-CB"
        | "ES-CE"
        | "ES-CL"
        | "ES-CM"
        | "ES-CN"
        | "ES-CT"
        | "ES-EX"
        | "ES-GA"
        | "ES-IB"
        | "ES-MC"
        | "ES-MD"
        | "ES-ML"
        | "ES-NC"
        | "ES-PV"
        | "ES-RI"
        | "ES-VC";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      consent_purpose: ["application"],
      member_role: ["owner", "admin", "staff"],
      room_status: ["vacant", "occupied", "unavailable"],
      spanish_region: [
        "ES-AN",
        "ES-AR",
        "ES-AS",
        "ES-CB",
        "ES-CE",
        "ES-CL",
        "ES-CM",
        "ES-CN",
        "ES-CT",
        "ES-EX",
        "ES-GA",
        "ES-IB",
        "ES-MC",
        "ES-MD",
        "ES-ML",
        "ES-NC",
        "ES-PV",
        "ES-RI",
        "ES-VC",
      ],
    },
  },
} as const;
