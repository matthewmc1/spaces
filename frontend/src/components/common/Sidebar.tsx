"use client";

import Link from "next/link";
import { Settings, LayoutDashboard, Zap, HelpCircle } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { SpaceTree } from "@/components/spaces/SpaceTree";
import { UserButton } from "@clerk/nextjs";

interface SidebarProps {
  activeSpaceId?: string;
}

export function Sidebar({ activeSpaceId }: SidebarProps) {
  return (
    <aside className="flex-shrink-0 h-screen w-64 bg-white border-r border-neutral-200/60 flex flex-col">
      {/* Logo + Motivational */}
      <div className="px-5 pt-5 pb-3">
        <Link href="/spaces" className="inline-block">
          <Logo variant="full" size={32} />
        </Link>
        <MotivationalBanner />
      </div>

      <div className="mx-5 border-t border-neutral-100" />

      {/* Navigation */}
      <nav className="px-3 pt-3 pb-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-300 px-2 mb-1.5">
          Navigate
        </p>
        <Link
          href="/spaces"
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-[var(--radius-md)] text-[13px] font-[family-name:var(--font-sans)] text-neutral-600 hover:text-neutral-800 hover:bg-neutral-50 transition-all group"
        >
          <LayoutDashboard size={15} className="text-neutral-400 group-hover:text-primary-500 transition-colors" />
          <span>All Spaces</span>
        </Link>
      </nav>

      <div className="mx-5 border-t border-neutral-100" />

      {/* Space tree */}
      <div className="flex-1 overflow-y-auto pt-1">
        <SpaceTree activeSpaceId={activeSpaceId} />
      </div>

      {/* Bottom section */}
      <div className="mx-5 border-t border-neutral-100" />
      <div className="p-3 space-y-0.5">
        <SidebarLink href="#" icon={<HelpCircle size={14} />} label="Help & Feedback" />
        <SidebarLink href="/settings" icon={<Settings size={14} />} label="Settings" />
        <div className="pt-1 px-2.5">
          <UserButton />
        </div>
      </div>
    </aside>
  );
}

function SidebarLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-[var(--radius-sm)] text-[12px] font-[family-name:var(--font-sans)] text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50 transition-colors"
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

const MOTIVATIONAL_MESSAGES = [
  "Ship with clarity.",
  "Align. Deliver. Repeat.",
  "Make it visible.",
  "Focus drives outcomes.",
  "Every card is progress.",
  "Strategy, in motion.",
  "Build what matters.",
  "Clarity is a superpower.",
];

function MotivationalBanner() {
  // Rotate message based on the current hour
  const index = new Date().getHours() % MOTIVATIONAL_MESSAGES.length;
  const message = MOTIVATIONAL_MESSAGES[index];

  return (
    <p className="mt-2.5 text-[11px] font-[family-name:var(--font-display)] italic text-primary-500/70 tracking-wide">
      {message}
    </p>
  );
}
