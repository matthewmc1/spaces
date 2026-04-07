"use client";

import dynamic from "next/dynamic";

const clerkEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

const ClerkSignIn = dynamic(
  () => import("@clerk/nextjs").then((m) => m.SignIn),
  { ssr: false, loading: () => <p className="text-sm text-neutral-400">Loading...</p> }
);

export default function Page() {
  if (!clerkEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <p className="text-sm text-neutral-500">Auth is disabled in dev mode.</p>
          <a href="/spaces" className="text-sm text-primary-500 hover:text-primary-600 mt-2 inline-block">Go to Spaces →</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <ClerkSignIn />
    </div>
  );
}
