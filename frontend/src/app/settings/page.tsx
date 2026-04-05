"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/common/Sidebar";
import { useSettings, useUpdateSettings } from "@/hooks/useSettings";
import { useSpaces } from "@/hooks/useSpaces";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { MembersList } from "@/components/settings/MembersList";
import type { UpdateSettingsInput } from "@/types/settings";

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Vancouver",
  "America/Toronto",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Amsterdam",
  "Europe/Stockholm",
  "Europe/Helsinki",
  "Europe/Istanbul",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Bangkok",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Asia/Shanghai",
  "Australia/Sydney",
  "Australia/Melbourne",
  "Pacific/Auckland",
];

const TIMEZONE_OPTIONS = TIMEZONES.map((tz) => ({ value: tz, label: tz.replace(/_/g, " ") }));

function SavedIndicator({ visible }: { visible: boolean }) {
  return (
    <span
      className={`text-[11px] font-medium text-emerald-600 transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
    >
      Saved
    </span>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-neutral-200/70 rounded-[var(--radius-md)] shadow-[var(--shadow-sm)] overflow-hidden">
      <div className="px-6 py-4 border-b border-neutral-100">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-400">
          {title}
        </h2>
      </div>
      <div className="px-6 py-5 space-y-5">{children}</div>
    </div>
  );
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-6">
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-neutral-700">{label}</p>
        {description && (
          <p className="text-[12px] text-neutral-400 mt-0.5">{description}</p>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 ${checked ? "bg-primary-500" : "bg-neutral-200"}`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-4.5" : "translate-x-0.5"}`}
      />
    </button>
  );
}

export default function SettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const { data: spaces } = useSpaces();
  const { mutate: updateSettings } = useUpdateSettings();

  const [savedSection, setSavedSection] = useState<string | null>(null);

  const save = useCallback(
    (section: string, input: UpdateSettingsInput) => {
      updateSettings(input, {
        onSuccess: () => {
          setSavedSection(section);
          setTimeout(() => setSavedSection((prev) => (prev === section ? null : prev)), 2000);
        },
      });
    },
    [updateSettings]
  );

  const spaceOptions = [
    { value: "", label: "None" },
    ...(spaces ?? []).map((s) => ({ value: s.id, label: s.name })),
  ];

  if (isLoading || !settings) {
    return (
      <div className="flex h-screen overflow-hidden bg-neutral-50">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-2xl mx-auto space-y-6 animate-pulse">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-40 bg-neutral-100 rounded-[var(--radius-md)]" />
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
            <h1 className="text-3xl font-[family-name:var(--font-display)] text-neutral-800 tracking-[-0.02em]">
              Settings
            </h1>
            <p className="mt-1.5 text-sm text-neutral-500">
              Manage your preferences and account configuration.
            </p>
          </div>

          <div className="space-y-6">
            {/* Appearance */}
            <SectionCard title="Appearance">
              <SettingRow label="Theme" description="Choose your preferred color scheme.">
                <div className="flex items-center gap-2">
                  <SavedIndicator visible={savedSection === "theme"} />
                  <select
                    value={settings.theme}
                    onChange={(e) => save("theme", { theme: e.target.value })}
                    className="bg-white border border-neutral-200 rounded-[var(--radius-md)] px-3 py-1.5 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-500"
                  >
                    <option value="system">System</option>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                </div>
              </SettingRow>

              <div className="border-t border-neutral-100" />

              <SettingRow label="Timezone" description="Used for due dates and notifications.">
                <div className="flex items-center gap-2">
                  <SavedIndicator visible={savedSection === "timezone"} />
                  <select
                    value={settings.timezone}
                    onChange={(e) => save("timezone", { timezone: e.target.value })}
                    className="bg-white border border-neutral-200 rounded-[var(--radius-md)] px-3 py-1.5 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-500"
                  >
                    {TIMEZONE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </SettingRow>
            </SectionCard>

            {/* Board Preferences */}
            <SectionCard title="Board Preferences">
              <div className="flex items-center justify-between mb-1">
                <span />
                <SavedIndicator visible={savedSection === "board"} />
              </div>

              {(
                [
                  { key: "compact_mode", label: "Compact mode", description: "Reduce card height for denser boards." },
                  { key: "show_labels", label: "Show labels", description: "Display label chips on cards." },
                  { key: "show_priority", label: "Show priority", description: "Show priority badge on cards." },
                  { key: "show_assignee", label: "Show assignee", description: "Show assignee avatar on cards." },
                  { key: "show_due_date", label: "Show due date", description: "Display due date on cards." },
                ] as const
              ).map(({ key, label, description }, idx, arr) => (
                <div key={key}>
                  <SettingRow label={label} description={description}>
                    <Toggle
                      checked={settings.board_prefs[key]}
                      onChange={(val) =>
                        save("board", { board_prefs: { [key]: val } })
                      }
                    />
                  </SettingRow>
                  {idx < arr.length - 1 && <div className="border-t border-neutral-100 mt-5" />}
                </div>
              ))}
            </SectionCard>

            {/* Notifications */}
            <SectionCard title="Notifications">
              <SettingRow label="Email digest" description="How often to receive a summary email.">
                <div className="flex items-center gap-2">
                  <SavedIndicator visible={savedSection === "digest"} />
                  <select
                    value={settings.notification_prefs.email_digest}
                    onChange={(e) =>
                      save("digest", {
                        notification_prefs: {
                          email_digest: e.target.value as "daily" | "weekly" | "none",
                        },
                      })
                    }
                    className="bg-white border border-neutral-200 rounded-[var(--radius-md)] px-3 py-1.5 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-500"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="none">None</option>
                  </select>
                </div>
              </SettingRow>

              <div className="border-t border-neutral-100" />

              <div className="flex items-center justify-between mb-1">
                <p className="text-[12px] text-neutral-400">Push &amp; in-app notifications</p>
                <SavedIndicator visible={savedSection === "notif"} />
              </div>

              {(
                [
                  { key: "card_assigned", label: "Card assigned to me" },
                  { key: "card_mentioned", label: "Card mentioned" },
                  { key: "card_moved", label: "Card moved" },
                  { key: "goal_status_change", label: "Goal status changed" },
                ] as const
              ).map(({ key, label }, idx, arr) => (
                <div key={key}>
                  <SettingRow label={label}>
                    <Toggle
                      checked={settings.notification_prefs[key]}
                      onChange={(val) =>
                        save("notif", { notification_prefs: { [key]: val } })
                      }
                    />
                  </SettingRow>
                  {idx < arr.length - 1 && <div className="border-t border-neutral-100 mt-5" />}
                </div>
              ))}
            </SectionCard>

            {/* Default Space */}
            <SectionCard title="Default Space">
              <SettingRow
                label="Default space"
                description="The space opened when you first log in."
              >
                <div className="flex items-center gap-2">
                  <SavedIndicator visible={savedSection === "space"} />
                  <select
                    value={settings.default_space_id ?? ""}
                    onChange={(e) =>
                      save("space", {
                        default_space_id: e.target.value || undefined,
                      })
                    }
                    className="bg-white border border-neutral-200 rounded-[var(--radius-md)] px-3 py-1.5 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-500 min-w-[180px]"
                  >
                    {spaceOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </SettingRow>
            </SectionCard>

            {/* Integrations */}
            <SectionCard title="Integrations">
              <p className="text-sm text-neutral-500 mb-3">
                Connect GitHub and GitLab to automatically link PRs and issues to your cards.
              </p>
              <Link href="/settings/integrations">
                <Button variant="secondary" size="sm">Manage Integrations →</Button>
              </Link>
            </SectionCard>

            {/* Members */}
            <MembersList />
          </div>
        </div>
      </main>
    </div>
  );
}
