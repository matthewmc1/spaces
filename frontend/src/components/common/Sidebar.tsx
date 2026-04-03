"use client";

import Link from "next/link";
import { LayoutDashboard } from "lucide-react";
import { SpaceTree } from "@/components/spaces/SpaceTree";

interface SidebarProps {
  activeSpaceId?: string;
}

export function Sidebar({ activeSpaceId }: SidebarProps) {
  return (
    <aside className="fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 flex flex-col overflow-y-auto z-40">
      <div className="flex items-center gap-2 px-4 py-4 border-b border-gray-100">
        <Link
          href="/spaces"
          className="flex items-center gap-2 text-gray-800 hover:text-blue-600 transition-colors"
        >
          <LayoutDashboard size={20} />
          <span className="text-base font-semibold">Spaces</span>
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        <SpaceTree activeSpaceId={activeSpaceId} />
      </div>
    </aside>
  );
}
