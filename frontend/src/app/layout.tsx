import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/components/common/QueryProvider";

export const metadata: Metadata = {
  title: "Spaces",
  description: "Strategic planning and alignment platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
