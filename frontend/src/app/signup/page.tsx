"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSignup } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Logo } from "@/components/ui/Logo";
import type { SignupInput } from "@/types/auth";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function SignupPage() {
  const router = useRouter();
  const signup = useSignup();
  const [slugEdited, setSlugEdited] = useState(false);
  const [form, setForm] = useState<SignupInput>({
    org_name: "",
    org_slug: "",
    user_name: "",
    email: "",
  });

  function handleOrgNameChange(value: string) {
    setForm((f) => ({
      ...f,
      org_name: value,
      org_slug: slugEdited ? f.org_slug : slugify(value),
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    signup.mutate(form, {
      onSuccess: () => router.push("/spaces"),
    });
  }

  const isValid = form.org_name && form.org_slug && form.user_name && form.email;
  const errorMessage = signup.error instanceof Error ? signup.error.message : null;

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo />
          </div>
          <h1 className="text-3xl font-[family-name:var(--font-display)] text-neutral-800 tracking-[-0.02em]">
            Create your workspace
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            Start your organization on Spaces
          </p>
        </div>

        <div className="bg-white rounded-[var(--radius-lg)] border border-neutral-200/60 shadow-[var(--shadow-sm)] p-4 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Organization name *"
              value={form.org_name}
              onChange={(e) => handleOrgNameChange(e.target.value)}
              placeholder="Acme Inc"
              required
              disabled={signup.isPending}
            />
            <Input
              label="Organization slug *"
              value={form.org_slug}
              onChange={(e) => {
                setSlugEdited(true);
                setForm((f) => ({ ...f, org_slug: slugify(e.target.value) }));
              }}
              placeholder="acme-inc"
              hint="Used in URLs. Only lowercase letters, numbers, and hyphens."
              required
              disabled={signup.isPending}
            />
            <Input
              label="Your name *"
              value={form.user_name}
              onChange={(e) => setForm((f) => ({ ...f, user_name: e.target.value }))}
              placeholder="Jane Smith"
              required
              disabled={signup.isPending}
            />
            <Input
              label="Email *"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="jane@acme.com"
              required
              disabled={signup.isPending}
            />

            {errorMessage && (
              <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-[var(--radius-sm)] p-2">
                {errorMessage}
              </p>
            )}

            <Button
              type="submit"
              className="w-full"
              loading={signup.isPending}
              disabled={!isValid}
            >
              Create Workspace
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-neutral-400 mt-6">
          Already have a workspace?{" "}
          <a href="/" className="text-primary-500 hover:text-primary-600 transition-colors">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
