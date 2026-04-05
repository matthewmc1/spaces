"use client";

import { useState } from "react";
import { Sidebar } from "@/components/common/Sidebar";
import { useProgrammes, useCreateProgramme } from "@/hooks/useProgrammes";
import { ProgrammeCard } from "@/components/rollup/ProgrammeCard";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { Plus, Target } from "lucide-react";

export default function ProgrammesPage() {
  const { data: programmes, isLoading } = useProgrammes();
  const createProgramme = useCreateProgramme();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    createProgramme.mutate(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        target_date: targetDate || undefined,
      },
      {
        onSuccess: () => {
          setShowCreate(false);
          setName("");
          setDescription("");
          setTargetDate("");
        },
      }
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50">
      <Sidebar />
      <main className="relative flex-1 overflow-y-auto p-4 md:p-8 animate-fade-in-up">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-3xl font-[family-name:var(--font-display)] text-neutral-800 tracking-[-0.02em]">
                Programmes
              </h1>
              <p className="mt-2 text-sm text-neutral-500 max-w-xl">
                Cross-cutting initiatives that span multiple teams and workstreams.
              </p>
            </div>
            <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowCreate(true)}>
              New Programme
            </Button>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} variant="rectangle" height="180px" />
              ))}
            </div>
          ) : !programmes || programmes.length === 0 ? (
            <div className="text-center py-20">
              <Target size={40} className="text-neutral-200 mx-auto mb-4" />
              <h3 className="text-lg font-[family-name:var(--font-display)] text-neutral-600 mb-2">
                No programmes yet
              </h3>
              <p className="text-sm text-neutral-400">
                Create a programme to group related work across teams.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {programmes.map((p) => (
                <ProgrammeCard key={p.id} programme={p} />
              ))}
            </div>
          )}
        </div>
      </main>

      {showCreate && (
        <Dialog
          open={true}
          onClose={() => setShowCreate(false)}
          title="Create Programme"
          footer={
            <>
              <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button
                loading={createProgramme.isPending}
                disabled={!name.trim()}
                type="submit"
                form="create-programme-form"
              >
                Create
              </Button>
            </>
          }
        >
          <form id="create-programme-form" onSubmit={handleCreate} className="space-y-4">
            <Input
              label="Name *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Identity Platform 2026"
              required
              autoFocus
            />
            <Input
              multiline
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              rows={3}
            />
            <div className="space-y-1">
              <label className="block text-sm font-medium text-neutral-700">Target Date</label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full bg-white border border-neutral-200 rounded-[var(--radius-md)] px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-500"
              />
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
