import { Sidebar } from "@/components/common/Sidebar";

export default function SpacesPage() {
  return (
    <div className="flex min-h-screen bg-neutral-50">
      <Sidebar />
      <main className="relative flex-1 ml-64 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold text-neutral-800 tracking-[-0.02em]">
            Your Workspaces
          </h1>
          <p className="text-sm text-neutral-500 mt-3 leading-relaxed">
            Select a space to view its board, or create a new one using the plus
            button in the sidebar.
          </p>
        </div>
      </main>
    </div>
  );
}
