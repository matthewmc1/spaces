export type IntegrationProvider = "github" | "gitlab";
export type IntegrationStatus = "active" | "inactive" | "error";
export type ExternalType = "pull_request" | "issue" | "branch" | "build" | "commit";

export interface Integration {
  id: string;
  tenant_id: string;
  space_id?: string;
  provider: IntegrationProvider;
  name: string;
  config: Record<string, unknown>;
  status: IntegrationStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateIntegrationInput {
  space_id?: string;
  provider: IntegrationProvider;
  name: string;
  config?: Record<string, unknown>;
}

export interface UpdateIntegrationInput {
  name?: string;
  config?: Record<string, unknown>;
  status?: IntegrationStatus;
}

export interface CardLink {
  id: string;
  card_id: string;
  integration_id: string;
  tenant_id: string;
  external_type: ExternalType;
  external_id: string;
  external_url: string;
  title?: string;
  status?: string;
  metadata?: Record<string, unknown>;
  last_synced_at: string;
  created_at: string;
}

export interface CreateCardLinkInput {
  integration_id: string;
  external_type: ExternalType;
  external_id: string;
  external_url: string;
  title?: string;
  status?: string;
}
