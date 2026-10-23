import type { Metadata, Viewport } from "next";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/600.css";
import "@fontsource-variable/ibm-plex-sans";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: `${BRAND.name} ${BRAND.product} | ${BRAND.tagline}`,
  description: "An AI agent investigates fraud signals across the graph and recommends a next action. An analyst makes the final decision.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FAF2F4",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
