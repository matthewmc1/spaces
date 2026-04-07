"use client";

import { useState } from "react";
import { GitFork, GitBranch, Pencil, Trash2, Check, X } from "lucide-react";
import { Sidebar } from "@/components/common/Sidebar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import {
  useIntegrations,
  useCreateIntegration,
  useUpdateIntegration,
  useDeleteIntegration,
} from "@/hooks/useIntegrations";
import { useCurrentUser } from "@/hooks/useAuth";
import type { Integration, IntegrationProvider, IntegrationStatus } from "@/types/integration";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

const PROVIDER_OPTIONS = [
  { value: "github", label: "GitHub" },
  { value: "gitlab", label: "GitLab" },
];

function ProviderIcon({ provider }: { provider: IntegrationProvider }) {
  if (provider === "github") {
    return <GitFork size={16} className="text-neutral-600" />;
  }
  return <GitBranch size={16} className="text-neutral-500" />;
}

function StatusBadge({ status }: { status: IntegrationStatus }) {
  const variantMap: Record<IntegrationStatus, "success" | "default" | "danger"> = {
    active: "success",
    inactive: "default",
    error: "danger",
  };
  return (
    <Badge variant={variantMap[status]} dot>
      {status}
    </Badge>
  );
}

function IntegrationRow({ integration }: { integration: Integration }) {
  const { mutate: deleteIntegration, isPending: isDeleting } = useDeleteIntegration();
  const { mutate: updateIntegration, isPending: isUpdating } = useUpdateIntegration();

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(integration.name);
  const [editRepo, setEditRepo] = useState(
    (integration.config?.repo as string) ?? ""
  );

  function handleSave() {
    updateIntegration(
      {
        id: integration.id,
        input: {
          name: editName,
          config: { repo: editRepo },
        },
      },
      { onSuccess: () => setEditing(false) }
    );
  }

  function handleCancel() {
    setEditName(integration.name);
    setEditRepo((integration.config?.repo as string) ?? "");
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="px-6 py-4 space-y-3">
        <div className="flex items-center gap-3">
          <ProviderIcon provider={integration.provider} />
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-400">
            {integration.provider}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Name"
            value={editName}
            onChange={(e) => setEditName((e.target as HTMLInputElement).value)}
          />
          <Input
            label="Repository"
            placeholder="owner/repo"
            value={editRepo}
            onChange={(e) => setEditRepo((e.target as HTMLInputElement).value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="primary"
            icon={<Check size={13} />}
            loading={isUpdating}
            onClick={handleSave}
          >
            Save
          </Button>
          <Button size="sm" variant="ghost" icon={<X size={13} />} onClick={handleCancel}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-4 flex items-center gap-4">
      <ProviderIcon provider={integration.provider} />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-neutral-800 truncate">{integration.name}</p>
        {typeof integration.config?.repo === "string" && (
          <p className="text-[11px] text-neutral-400 mt-0.5 truncate">
            {integration.config.repo}
          </p>
        )}
      </div>
      <StatusBadge status={integration.status} />
      <div className="flex items-center gap-1 ml-2">
        <button
          onClick={() => setEditing(true)}
          className="p-1.5 rounded-[var(--radius-sm)] text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
          aria-label="Edit integration"
        >
          <Pencil size={13} />
        </button>
        <button
          onClick={() => deleteIntegration(integration.id)}
          disabled={isDeleting}
          className="p-1.5 rounded-[var(--radius-sm)] text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50"
          aria-label="Delete integration"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

function AddIntegrationForm() {
  const { mutate: createIntegration, isPending } = useCreateIntegration();
  const [provider, setProvider] = useState<IntegrationProvider>("github");
  const [name, setName] = useState("");
  const [repo, setRepo] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    createIntegration(
      {
        provider,
        name: name.trim(),
        config: repo.trim() ? { repo: repo.trim() } : undefined,
      },
      {
        onSuccess: () => {
          setName("");
          setRepo("");
          setProvider("github");
        },
        onError: (err: unknown) => {
          setError(err instanceof Error ? err.message : "Failed to create integration.");
        },
      }
    );
  }

  return (
    <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Select
          label="Provider"
          options={PROVIDER_OPTIONS}
          value={provider}
          onChange={(e) => setProvider(e.target.value as IntegrationProvider)}
        />
        <Input
          label="Name"
          placeholder="e.g. My GitHub Repo"
          value={name}
          onChange={(e) => setName((e.target as HTMLInputElement).value)}
          error={error ?? undefined}
        />
        <Input
          label="Repository"
          placeholder="owner/repo"
          value={repo}
          onChange={(e) => setRepo((e.target as HTMLInputElement).value)}
        />
      </div>
      <Button type="submit" size="sm" variant="primary" loading={isPending}>
        Add Integration
      </Button>
    </form>
  );
}

export default function IntegrationsPage() {
  const { data: integrations, isLoading } = useIntegrations();
  const { data: currentUser } = useCurrentUser();

  const tenantId = currentUser?.tenant_id ?? "{tenant_id}";
  const webhookBase = API_URL;

  if (isLoading) {
    return (
      <div className="flex h-screen overflow-hidden bg-neutral-50">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-2xl mx-auto space-y-6 animate-pulse">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-32 bg-neutral-100 rounded-[var(--radius-md)]" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8 animate-fade-in-up">
        <div className="max-w-2xl mx-auto">
          {/* Page header */}
          <div className="mb-8">
            <h1 className="text-4xl font-[family-name:var(--font-display)] text-neutral-800 tracking-[-0.02em]">
              Integrations
            </h1>
            <p className="mt-1.5 text-sm text-neutral-500">
              Connect GitHub and GitLab to automatically link PRs and issues to your cards.
            </p>
          </div>

          <div className="space-y-6">
            {/* Add Integration */}
            <div className="bg-white border border-neutral-200/70 rounded-[var(--radius-md)] shadow-[var(--shadow-sm)] overflow-hidden">
              <div className="px-6 py-4 border-b border-neutral-100">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-400">
                  Add Integration
                </h2>
              </div>
              <AddIntegrationForm />
            </div>

            {/* Existing Integrations */}
            <div className="bg-white border border-neutral-200/70 rounded-[var(--radius-md)] shadow-[var(--shadow-sm)] overflow-hidden">
              <div className="px-6 py-4 border-b border-neutral-100">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-400">
                  Configured Integrations
                </h2>
              </div>

              {!integrations || integrations.length === 0 ? (
                <div className="px-6 py-10 text-center">
                  <p className="text-sm text-neutral-400">
                    No integrations yet. Add one to get started.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-neutral-100">
                  {integrations.map((integration) => (
                    <IntegrationRow key={integration.id} integration={integration} />
                  ))}
                </div>
              )}
            </div>

            {/* Webhook Info */}
            <div className="bg-white border border-neutral-200/70 rounded-[var(--radius-md)] shadow-[var(--shadow-sm)] overflow-hidden">
              <div className="px-6 py-4 border-b border-neutral-100">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-400">
                  Webhook Setup
                </h2>
              </div>
              <div className="px-6 py-5 space-y-4">
                <p className="text-[13px] text-neutral-600">
                  Configure your webhook in GitHub or GitLab to point to the following URLs:
                </p>
                <div className="space-y-2">
                  <div>
                    <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-[0.08em] mb-1">
                      GitHub
                    </p>
                    <code className="block text-[12px] font-mono bg-neutral-50 border border-neutral-200 rounded-[var(--radius-sm)] px-3 py-2 text-neutral-700 break-all">
                      {webhookBase}/webhooks/github?tenant={tenantId}
                    </code>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-[0.08em] mb-1">
                      GitLab
                    </p>
                    <code className="block text-[12px] font-mono bg-neutral-50 border border-neutral-200 rounded-[var(--radius-sm)] px-3 py-2 text-neutral-700 break-all">
                      {webhookBase}/webhooks/gitlab?tenant={tenantId}
                    </code>
                  </div>
                </div>
                {currentUser?.tenant_id ? null : (
                  <p className="text-[11px] text-neutral-400">
                    Sign in to see your tenant ID populated in the webhook URLs above.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
