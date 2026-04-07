import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-neutral-100 border-t border-neutral-200 py-12 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <p className="text-sm font-medium text-neutral-800 mb-3">Product</p>
            <div className="space-y-2 text-sm text-neutral-500">
              <p>Portfolio Board</p>
              <p>Team Dashboards</p>
              <p>Flow Metrics</p>
              <p>Alignment Chains</p>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-800 mb-3">Frameworks</p>
            <div className="space-y-2 text-sm text-neutral-500">
              <p>Flight Levels (Leopold)</p>
              <p>Flow Framework (Kersten)</p>
              <p>Making Work Visible (DeGrandis)</p>
              <p>WSJF Prioritization</p>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-800 mb-3">Platform</p>
            <div className="space-y-2 text-sm text-neutral-500">
              <p>Multi-tenant RBAC</p>
              <p>Real-time Updates</p>
              <p>GitHub Integration</p>
              <p>Clerk SSO</p>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-800 mb-3">Get Started</p>
            <div className="space-y-2 text-sm">
              <Link href="/sign-up" className="block text-primary-600 hover:text-primary-700 transition-colors">Create Account</Link>
              <Link href="/sign-in" className="block text-primary-600 hover:text-primary-700 transition-colors">Sign In</Link>
            </div>
          </div>
        </div>
        <div className="pt-6 border-t border-neutral-200">
          <p className="text-center text-xs text-neutral-400">
            Built on insights from Klaus Leopold, Dominica DeGrandis, Will Larson, Mik Kersten, and Don Reinertsen.
          </p>
        </div>
      </div>
    </footer>
  );
}
