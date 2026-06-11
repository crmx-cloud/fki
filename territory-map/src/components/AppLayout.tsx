import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { NotificationBell } from "@/components/NotificationBell";
import { TopBarNotifications } from "@/components/TopBarNotifications";
import { CenterPopupNotification } from "@/components/CenterPopupNotification";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "./ui/sidebar";

export function AppLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Persistent header — bell is always visible, right-aligned */}
        <header className="flex h-12 items-center px-4 border-b border-white/5">
          <div className="md:hidden">
            <SidebarTrigger />
          </div>
          <div className="flex-1" />
          <NotificationBell />
        </header>

        {/* Top-bar notifications stack between header and content */}
        <TopBarNotifications />

        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>

        {/* Center-popup overlay — renders on top of everything */}
        <CenterPopupNotification />
      </SidebarInset>
    </SidebarProvider>
  );
}
