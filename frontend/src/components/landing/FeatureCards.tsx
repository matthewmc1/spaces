import { Building2, SquareKanban, Target, BarChart3, Briefcase, Shield } from "lucide-react";
import { type ReactNode } from "react";

function FeatureCard({
  icon,
  title,
  description,
  delay,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  delay: string;
}) {
  return (
    <div
      className="p-8 rounded-[var(--radius-xl)] border border-neutral-200/60 bg-white shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-shadow animate-fade-in-up"
      style={{ animationDelay: delay }}
    >
      <div className="inline-flex items-center justify-center w-11 h-11 rounded-[var(--radius-lg)] bg-primary-50 text-primary-600 mb-5">
        {icon}
      </div>
      <h3 className="text-lg font-[family-name:var(--font-display)] text-neutral-800 mb-2">
        {title}
      </h3>
      <p className="text-sm text-neutral-500 leading-relaxed">{description}</p>
    </div>
  );
}

export function FeatureCards() {
  return (
    <section className="py-20 px-6 bg-neutral-50">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs font-medium text-primary-600 uppercase tracking-[0.08em] mb-3">
            The engineering operating system
          </p>
          <h2 className="text-4xl font-[family-name:var(--font-display)] text-neutral-800 tracking-[-0.02em]">
            Portfolio visibility meets team autonomy
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FeatureCard
            icon={<Building2 className="w-5 h-5" />}
            title="Org → Team → Workstream"
            description="Nested spaces mirror your org structure. Departments, teams, and workstreams — each with their own board, all rolling up to a single portfolio view."
            delay="0.1s"
          />
          <FeatureCard
            icon={<SquareKanban className="w-5 h-5" />}
            title="WIP-Limited Kanban"
            description="Configurable WIP limits per column enforce discipline. Visual warnings when columns are over capacity. The bottleneck is always visible."
            delay="0.2s"
          />
          <FeatureCard
            icon={<Target className="w-5 h-5" />}
            title="Alignment Chains"
            description="Link cards to goals, goals to org objectives. Trace any piece of work upward to the strategy it supports. See alignment gaps instantly."
            delay="0.3s"
          />
          <FeatureCard
            icon={<BarChart3 className="w-5 h-5" />}
            title="Flow Distribution"
            description="Classify work as Feature, Defect, Risk, or Debt. See where capacity actually flows and compare against targets. Say no with data."
            delay="0.4s"
          />
          <FeatureCard
            icon={<Briefcase className="w-5 h-5" />}
            title="Cross-Cutting Programmes"
            description="Initiatives that span multiple teams? Programmes group work from anywhere in the org tree with aggregated metrics and health scoring."
            delay="0.5s"
          />
          <FeatureCard
            icon={<Shield className="w-5 h-5" />}
            title="Enterprise Ready"
            description="Multi-tenant isolation, RBAC, Clerk SSO, activity logging, real-time WebSocket updates. Built for organizations that take security seriously."
            delay="0.6s"
          />
        </div>
        <div className="max-w-4xl mx-auto mt-20 pt-16 border-t border-neutral-200/60">
          <div className="text-center mb-10">
            <p className="text-xs font-medium text-primary-600 uppercase tracking-[0.08em] mb-3">
              The operating cadence
            </p>
            <h2 className="text-4xl font-[family-name:var(--font-display)] text-neutral-800 tracking-[-0.02em]">
              From cognitive overload to calm clarity
            </h2>
          </div>
          <div className="space-y-8">
            <Step number="01" title="Make all work visible at the portfolio level" description="Every programme, team, and workstream appears on one board with uniform metadata — health status, alignment score, flow distribution. When someone wants to add something and the portfolio is full, the conversation becomes 'which existing item do we pause?'" />
            <Step number="02" title="Protect strategic time with structural discipline" description="WIP limits operate at every level — column limits protect team flow, portfolio limits protect leadership attention. Capacity allocation targets show where effort should go versus where it actually goes." />
            <Step number="03" title="Align work to outcomes, not opinions" description="The alignment chain traces any card through goals up to org-level objectives. Orphaned goals surface instantly. High-priority cards without goal links get flagged. Every prioritization decision has data behind it." />
          </div>
        </div>
      </div>
    </section>
  );
}

function Step({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="flex gap-6 items-start">
      <span className="text-3xl font-bold text-primary-200 shrink-0 w-12">{number}</span>
      <div>
        <h3 className="text-lg font-[family-name:var(--font-display)] text-neutral-800 mb-1">{title}</h3>
        <p className="text-sm text-neutral-500 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
