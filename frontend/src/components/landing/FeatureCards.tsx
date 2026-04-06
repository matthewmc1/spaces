import { Folder, SquareKanban, Target, BarChart3, GitBranch, Shield } from "lucide-react";
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
            Built for strategic teams
          </p>
          <h2 className="text-3xl font-[family-name:var(--font-display)] text-neutral-800 tracking-[-0.02em]">
            Everything you need to align and deliver
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FeatureCard
            icon={<Folder className="w-5 h-5" />}
            title="Flexible Hierarchies"
            description="Nest spaces within spaces to mirror your org structure. Programs, teams, workstreams — organized your way."
            delay="0.1s"
          />
          <FeatureCard
            icon={<SquareKanban className="w-5 h-5" />}
            title="Kanban Flow"
            description="Triage, plan, execute, and deliver with a flow designed for strategic work. From inbox to done, with clarity at every stage."
            delay="0.2s"
          />
          <FeatureCard
            icon={<Target className="w-5 h-5" />}
            title="Goal Alignment"
            description="Link work to goals at any level. See at a glance whether day-to-day effort drives strategic outcomes."
            delay="0.3s"
          />
          <FeatureCard
            icon={<BarChart3 className="w-5 h-5" />}
            title="Flow Metrics"
            description="Cycle time, throughput, and capacity data at your fingertips. Spot bottlenecks before they become blockers."
            delay="0.4s"
          />
          <FeatureCard
            icon={<GitBranch className="w-5 h-5" />}
            title="Integrations"
            description="Connect to GitHub, GitLab, and CI/CD pipelines. See build status and PRs directly on your cards."
            delay="0.5s"
          />
          <FeatureCard
            icon={<Shield className="w-5 h-5" />}
            title="Enterprise Ready"
            description="Multi-tenant isolation, role-based access, audit logging, and SSO. Built for organizations that take security seriously."
            delay="0.6s"
          />
        </div>
        {/* How it works section */}
        <div className="max-w-4xl mx-auto mt-20 pt-16 border-t border-neutral-200/60">
          <div className="text-center mb-10">
            <p className="text-xs font-medium text-primary-600 uppercase tracking-[0.08em] mb-3">
              How teams use Spaces
            </p>
            <h2 className="text-3xl font-[family-name:var(--font-display)] text-neutral-800 tracking-[-0.02em]">
              From chaos to clarity in three steps
            </h2>
          </div>
          <div className="space-y-8">
            <Step number="01" title="Capture everything in your inbox" description="Every idea, request, and initiative starts in the inbox. No more lost Slack threads or forgotten email asks. Triage when you're ready — ice box what needs definition, freeze what needs validation." />
            <Step number="02" title="Plan with alignment" description="Link work to strategic goals at any level. See at a glance whether your sprint is driving quarterly objectives or drifting toward busy work. Configurable columns adapt to your team's flow." />
            <Step number="03" title="Deliver with visibility" description="Track cycle times, spot bottlenecks, and celebrate completions. Leadership sees the roll-up across all spaces. Teams see their own board. Everyone sees the same truth." />
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
