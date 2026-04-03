"use client";

import Link from "next/link";
import { Settings, LayoutDashboard } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { SpaceTree } from "@/components/spaces/SpaceTree";

interface SidebarProps {
  activeSpaceId?: string;
}

export function Sidebar({ activeSpaceId }: SidebarProps) {
  return (
    <aside className="flex-shrink-0 h-screen w-64 bg-white border-r border-neutral-200/80 flex flex-col">
      {/* Logo */}
      <div className="px-5 py-4">
        <Link href="/spaces">
          <Logo variant="full" size={28} />
        </Link>
      </div>

      <div className="mx-4 border-t border-neutral-100" />

      {/* Navigation */}
      <div className="px-4 pt-4 pb-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400 px-2 mb-2">
          Navigation
        </p>
        <Link
          href="/spaces"
          className="flex items-center gap-2.5 px-2 py-1.5 rounded-[var(--radius-sm)] text-sm text-neutral-600 hover:text-neutral-800 hover:bg-neutral-50 transition-colors"
        >
          <LayoutDashboard size={15} className="text-neutral-400" />
          <span>Dashboard</span>
        </Link>
      </div>

      {/* Space tree */}
      <div className="flex-1 overflow-y-auto">
        <SpaceTree activeSpaceId={activeSpaceId} />
      </div>

      {/* Settings */}
      <div className="mx-4 border-t border-neutral-100" />
      <div className="p-3">
        <button className="flex items-center gap-2.5 w-full px-2 py-1.5 rounded-[var(--radius-sm)] text-sm text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50 transition-colors">
          <Settings size={15} />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
}
