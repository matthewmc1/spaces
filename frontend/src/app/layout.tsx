import type { Metadata } from "next";
import { Instrument_Serif, DM_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/common/QueryProvider";

const instrumentSerif = Instrument_Serif({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

const ibmPlexMono = IBM_Plex_Mono({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Spaces",
  description: "Strategic planning and alignment platform",
  icons: {
    icon: "/favicon.svg",
  },
};

// Skip Clerk when no publishable key is configured (local dev without auth)
const clerkEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const inner = (
    <html lang="en" className={`${instrumentSerif.variable} ${dmSans.variable} ${ibmPlexMono.variable}`}>
      <body className="antialiased" suppressHydrationWarning>
        <QueryProvider>
          {clerkEnabled && <ClerkTokenBridgeLazy />}
          {children}
        </QueryProvider>
      </body>
    </html>
  );

  if (clerkEnabled) {
    const { ClerkProvider } = await import("@clerk/nextjs");
    return (
      <ClerkProvider afterSignOutUrl="/sign-in">
        {inner}
      </ClerkProvider>
    );
  }

  return inner;
}

// Lazy-loaded so the import doesn't fail when Clerk isn't configured
function ClerkTokenBridgeLazy() {
  // Dynamic import at render time — safe because clerkEnabled gates this
  const { ClerkTokenBridge } = require("@/components/common/ClerkTokenBridge");
  return <ClerkTokenBridge />;
}
