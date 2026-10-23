import { Navbar } from "@/components/nav/Navbar";
import { AppShell } from "@/components/nav/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="analyst-shell">
      <Navbar variant="app" />
      <AppShell>{children}</AppShell>
    </div>
  );
}
