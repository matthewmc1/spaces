import { Folder, SquareKanban, Target } from "lucide-react";
import { type ReactNode } from "react";

function FeatureCard({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <div className="text-center p-6">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-[var(--radius-lg)] bg-primary-50 text-primary-600 mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-neutral-800">{title}</h3>
      <p className="mt-2 text-sm text-neutral-500 leading-relaxed">{description}</p>
    </div>
  );
}

export function FeatureCards() {
  return (
    <section className="py-16 px-6">
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        <FeatureCard
          icon={<Folder className="w-6 h-6" />}
          title="Flexible Hierarchies"
          description="Nest spaces within spaces to mirror your org structure. Programs, teams, workstreams — organized your way."
        />
        <FeatureCard
          icon={<SquareKanban className="w-6 h-6" />}
          title="Kanban Flow"
          description="Triage, plan, execute, and deliver with a flow designed for strategic work. From inbox to done, with clarity at every stage."
        />
        <FeatureCard
          icon={<Target className="w-6 h-6" />}
          title="Goal Alignment"
          description="Link work to goals at any level. See at a glance whether day-to-day effort drives strategic outcomes."
        />
      </div>
    </section>
  );
}
