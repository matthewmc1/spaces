export interface NotificationPrefs {
  email_digest: "daily" | "weekly" | "none";
  card_assigned: boolean;
  card_mentioned: boolean;
  card_moved: boolean;
  goal_status_change: boolean;
}

export interface BoardPrefs {
  compact_mode: boolean;
  show_labels: boolean;
  show_priority: boolean;
  show_assignee: boolean;
  show_due_date: boolean;
}

export interface UserSettings {
  id: string;
  user_id: string;
  tenant_id: string;
  theme: "light" | "dark" | "system";
  default_space_id?: string;
  notification_prefs: NotificationPrefs;
  board_prefs: BoardPrefs;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateSettingsInput {
  theme?: string;
  default_space_id?: string;
  notification_prefs?: Partial<NotificationPrefs>;
  board_prefs?: Partial<BoardPrefs>;
  timezone?: string;
}
