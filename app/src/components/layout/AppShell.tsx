import { TopBar } from "./TopBar";
import { BottomTabBar, DesktopNav } from "./BottomTabBar";
import { Toaster } from "@/components/ui/Toaster";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <TopBar />
      <Toaster />
      <div className="mx-auto flex max-w-6xl gap-6 px-4 pb-28 pt-5 sm:pb-12">
        <DesktopNav />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
      <BottomTabBar />
    </div>
  );
}
