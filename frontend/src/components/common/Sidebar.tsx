"use client";

import Link from "next/link";
import { Settings } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { SpaceTree } from "@/components/spaces/SpaceTree";

interface SidebarProps {
  activeSpaceId?: string;
}

export function Sidebar({ activeSpaceId }: SidebarProps) {
  return (
    <aside className="fixed top-0 left-0 h-screen w-64 bg-neutral-100 border-r border-neutral-200 flex flex-col z-40">
      <div className="p-4 border-b border-neutral-200">
        <Link href="/spaces">
          <Logo variant="full" size={24} />
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto">
        <SpaceTree activeSpaceId={activeSpaceId} />
      </div>
      <div className="p-3 border-t border-neutral-200">
        <button className="flex items-center gap-2 w-full px-3 py-2 rounded text-sm text-neutral-500 hover:text-neutral-700 hover:bg-neutral-200 transition-colors">
          <Settings size={16} />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
}
