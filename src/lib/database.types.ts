export type UserRole = "malik" | "boss" | "manager" | "associate" | "intern";
export type ProjectStatus = "active" | "on_hold" | "completed";
export type TaskStatus = "todo" | "in_progress" | "in_review" | "done";
export type TaskPriority = "low" | "medium" | "high";

export type Profile = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  manager_id: string | null;
  avatar_url: string | null;
  onboarded: boolean;
  created_at: string;
};

export type Project = {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  owner_id: string;
  created_at: string;
};

export type ProjectMember = {
  project_id: string;
  user_id: string;
  added_at: string;
};

export type Task = {
  id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id: string | null;
  created_by: string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
};

export type Invite = {
  email: string;
  role: UserRole;
  manager_id: string | null;
  invited_by: string;
  created_at: string;
};

export type InviteLink = {
  id: string;
  token: string;
  role: UserRole;
  manager_id: string;
  created_by: string;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

export type ActivityLog = {
  id: string;
  actor_id: string;
  message: string;
  created_at: string;
};

export type PushSubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string; name: string; email: string };
        Update: Partial<Profile>;
        Relationships: [
          {
            foreignKeyName: "profiles_manager_id_fkey";
            columns: ["manager_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      projects: {
        Row: Project;
        Insert: Partial<Project> & { name: string; owner_id: string };
        Update: Partial<Project>;
        Relationships: [
          {
            foreignKeyName: "projects_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      project_members: {
        Row: ProjectMember;
        Insert: Partial<ProjectMember> & { project_id: string; user_id: string };
        Update: Partial<ProjectMember>;
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      tasks: {
        Row: Task;
        Insert: Partial<Task> & { title: string; created_by: string };
        Update: Partial<Task>;
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_assignee_id_fkey";
            columns: ["assignee_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      invites: {
        Row: Invite;
        Insert: Partial<Invite> & { email: string; role: UserRole; invited_by: string };
        Update: Partial<Invite>;
        Relationships: [
          {
            foreignKeyName: "invites_manager_id_fkey";
            columns: ["manager_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invites_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      invite_links: {
        Row: InviteLink;
        Insert: Partial<InviteLink> & { token: string; role: UserRole; manager_id: string; created_by: string };
        Update: Partial<InviteLink>;
        Relationships: [
          {
            foreignKeyName: "invite_links_manager_id_fkey";
            columns: ["manager_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invite_links_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      activity_log: {
        Row: ActivityLog;
        Insert: Partial<ActivityLog> & { actor_id: string; message: string };
        Update: Partial<ActivityLog>;
        Relationships: [
          {
            foreignKeyName: "activity_log_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      push_subscriptions: {
        Row: PushSubscriptionRow;
        Insert: Partial<PushSubscriptionRow> & {
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
        };
        Update: Partial<PushSubscriptionRow>;
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      apply_pending_invite: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      claim_invite_link: {
        Args: { p_token: string };
        Returns: undefined;
      };
      invite_link_info: {
        Args: { p_token: string };
        Returns: { role: UserRole; inviter_name: string; valid: boolean }[];
      };
      get_push_subscriptions: {
        Args: { target: string };
        Returns: { endpoint: string; p256dh: string; auth: string }[];
      };
      delete_push_subscription: {
        Args: { p_endpoint: string };
        Returns: undefined;
      };
      manager_chain: {
        Args: { target: string };
        Returns: { id: string; name: string; email: string }[];
      };
      org_tree_profiles: {
        Args: Record<string, never>;
        Returns: { id: string; name: string; role: UserRole; manager_id: string | null }[];
      };
    };
    Enums: {
      user_role: UserRole;
      project_status: ProjectStatus;
      task_status: TaskStatus;
      task_priority: TaskPriority;
    };
    CompositeTypes: Record<string, never>;
  };
};
