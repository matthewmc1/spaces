"use client";

import { useState } from "react";
import { useUsers, useInviteUser } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { UserRole } from "@/types/auth";

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "member", label: "Member" },
  { value: "admin", label: "Admin" },
  { value: "viewer", label: "Viewer" },
];

const roleBadgeClasses: Record<UserRole, string> = {
  owner: "bg-purple-100 text-purple-700",
  admin: "bg-primary-100 text-primary-700",
  member: "bg-neutral-100 text-neutral-600",
  viewer: "bg-slate-100 text-slate-600",
};

export function MembersList() {
  const { data: users, isLoading } = useUsers();
  const { mutate: inviteUser, isPending } = useInviteUser();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("member");

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    inviteUser(
      { name: name.trim(), email: email.trim(), role },
      {
        onSuccess: () => {
          setName("");
          setEmail("");
          setRole("member");
        },
      }
    );
  }

  return (
    <div className="bg-white border border-neutral-200/70 rounded-[var(--radius-md)] shadow-[var(--shadow-sm)] overflow-hidden">
      {/* Section header */}
      <div className="px-6 py-4 border-b border-neutral-100">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-400">
          Members
        </h2>
      </div>

      <div className="px-6 py-5 space-y-5">
        {/* Member list */}
        <div className="space-y-1">
          {isLoading ? (
            // Skeleton rows
            <>
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="flex items-center justify-between py-2.5 animate-pulse"
                >
                  <div className="space-y-1.5">
                    <div className="h-3.5 w-32 bg-neutral-100 rounded" />
                    <div className="h-3 w-44 bg-neutral-100 rounded" />
                  </div>
                  <div className="h-5 w-16 bg-neutral-100 rounded-full" />
                </div>
              ))}
            </>
          ) : !users || users.length === 0 ? (
            <p className="text-[13px] text-neutral-400 py-2">No members yet</p>
          ) : (
            users.map((user, idx) => (
              <div key={user.id}>
                <div className="flex items-center justify-between py-2.5">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-neutral-700 truncate">
                      {user.name}
                    </p>
                    <p className="text-[12px] text-neutral-400 truncate">{user.email}</p>
                  </div>
                  <span
                    className={`ml-4 flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${roleBadgeClasses[user.role]}`}
                  >
                    {user.role}
                  </span>
                </div>
                {idx < users.length - 1 && (
                  <div className="border-t border-neutral-100" />
                )}
              </div>
            ))
          )}
        </div>

        {/* Invite form */}
        <div className="border-t border-neutral-100 pt-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-400 mb-3">
            Invite a member
          </p>
          <form onSubmit={handleInvite} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="Name"
                value={name}
                onChange={(e) => setName((e.target as HTMLInputElement).value)}
                disabled={isPending}
              />
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
                disabled={isPending}
              />
            </div>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Select
                  options={ROLE_OPTIONS}
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  disabled={isPending}
                />
              </div>
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={isPending}
                disabled={!name.trim() || !email.trim()}
              >
                Invite
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
