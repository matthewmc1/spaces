import { Sidebar } from "@/components/common/Sidebar";

export default function SpacesPage() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          Welcome to Spaces
        </h1>
        <p className="text-gray-600 max-w-prose">
          Spaces help you organize your work into structured areas. Select a
          space from the sidebar to get started, or create a new one using the
          plus button.
        </p>
      </main>
    </div>
  );
}
