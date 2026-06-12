import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { LayoutDashboard, LogOut, Moon, Settings, Sun, MapPin, Building2, Shield, UserCircle, Sparkles, User, ClipboardList, Heart, Tag, Bell, Contact, Scale, FileSearch, BarChart3, MessageCircle } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useTheme } from "@/contexts/ThemeContext";
import { APP_NAME } from "@/lib/constants";
import { api } from "../../convex/_generated/api";
import { Avatar, AvatarFallback } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "./ui/sidebar";

function NavLink({
  href,
  label,
  icon: Icon,
  isActive,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
}) {
  const { setOpenMobile } = useSidebar();

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive}>
        <Link to={href} onClick={() => setOpenMobile(false)}>
          <Icon />
          <span>{label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function SidebarNav() {
  const location = useLocation();
  const myProfile = useQuery(api.users.getMyProfile);

  const isAdmin = myProfile?.isAdmin; // super_admin or admin
  const isBrandAdmin = myProfile?.isBrandAdmin;
  const isInternal = myProfile?.isInternal; // super_admin, admin, or standard
  const isAnyAdmin = isAdmin || isBrandAdmin;
  const isProspect = myProfile?.profile?.role === "prospect";
  const isFranchisor = myProfile?.profile?.role === "franchisor";
  const isBroker = myProfile?.profile?.role === "broker";

  return (
    <SidebarContent>
      {/* ── Prospect navigation ── */}
      {isProspect && (
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <NavLink href="/dashboard" label="My Matches" icon={Sparkles} isActive={location.pathname === "/dashboard"} />
              <NavLink href="/saved" label="Saved Brands" icon={Heart} isActive={location.pathname === "/saved"} />
              <NavLink href="/dossier" label="Due Diligence Report" icon={FileSearch} isActive={location.pathname === "/dossier"} />
              <NavLink href="/my-profile" label="My Profile" icon={User} isActive={location.pathname === "/my-profile"} />
              <NavLink href="/messages" label="Messages" icon={MessageCircle} isActive={location.pathname === "/messages"} />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      )}

      {/* ── Franchisor navigation ── */}
      {/* ── Broker navigation: assigned leads + read-only tags ── */}
      {isBroker && (
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <NavLink href="/crm" label="My Leads" icon={UserCircle} isActive={location.pathname === "/crm"} />
              <NavLink href="/messages" label="Messages" icon={MessageCircle} isActive={location.pathname === "/messages"} />
              <NavLink href="/tags" label="Tags" icon={Tag} isActive={location.pathname === "/tags"} />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      )}

      {isFranchisor && !isAnyAdmin && (
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <NavLink href="/dashboard" label="Dashboard" icon={LayoutDashboard} isActive={location.pathname === "/dashboard"} />
              <NavLink href="/franchise-onboarding" label="Brand Profile" icon={ClipboardList} isActive={location.pathname.startsWith("/franchise-onboarding")} />
              <NavLink href="/territories" label="Territories" icon={MapPin} isActive={location.pathname === "/territories"} />
              <NavLink href="/crm" label="CRM / Leads" icon={UserCircle} isActive={location.pathname === "/crm"} />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      )}

      {/* ── Internal team + Brand Admin navigation ── */}
      {(isInternal || isBrandAdmin) && (
        <>
          {/* Dashboard */}
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <NavLink href="/dashboard" label="Dashboard" icon={LayoutDashboard} isActive={location.pathname === "/dashboard"} />
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <div className="mx-3 border-t border-sidebar-border" />

          {/* Core: Brands, Territories, Leads, Contacts */}
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <NavLink href="/brands" label="Brands" icon={Building2} isActive={location.pathname === "/brands"} />
                <NavLink href="/territories" label="Territories" icon={MapPin} isActive={location.pathname === "/territories"} />
                <NavLink href="/crm" label="Leads" icon={UserCircle} isActive={location.pathname === "/crm"} />
                <NavLink href="/contacts" label="Contacts" icon={Contact} isActive={location.pathname === "/contacts"} />
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Admin tools: Tags, Notifications */}
          {isAdmin && (
            <>
              <div className="mx-3 border-t border-sidebar-border" />
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <NavLink href="/messages" label="Messages" icon={MessageCircle} isActive={location.pathname === "/messages"} />
                    <NavLink href="/kpis" label="Company KPIs" icon={BarChart3} isActive={location.pathname === "/kpis"} />
                    <NavLink href="/tags" label="Tags" icon={Tag} isActive={location.pathname === "/tags"} />
                    {myProfile?.isSuperAdmin && (
                      <NavLink href="/users" label="Users" icon={User} isActive={location.pathname === "/users"} />
                    )}
                    <NavLink href="/claims-admin" label="Brand Claims" icon={Shield} isActive={location.pathname === "/claims-admin"} />
                    <NavLink href="/notifications-admin" label="Notifications" icon={Bell} isActive={location.pathname === "/notifications-admin"} />
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </>
          )}
        </>
      )}

      {/* Brand admin badge */}
      {isBrandAdmin && !isAdmin && (
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs text-muted-foreground">
            <Shield className="w-3 h-3 mr-1 inline" />
            Brand Admin
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <p className="text-xs text-muted-foreground px-3">
              You have access to your assigned brand{(myProfile?.brandIds?.length || 0) > 1 ? "s" : ""} only.
            </p>
          </SidebarGroupContent>
        </SidebarGroup>
      )}

      {/* Prospect badge */}
      {isProspect && (
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs text-muted-foreground">
            <Sparkles className="w-3 h-3 mr-1 inline" />
            Franchise Fit AI
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <p className="text-xs text-muted-foreground px-3">
              Complete your profile to unlock AI-powered franchise matches.
            </p>
          </SidebarGroupContent>
        </SidebarGroup>
      )}
    </SidebarContent>
  );
}

function SidebarUserMenu() {
  const user = useQuery(api.auth.currentUser);
  const myProfile = useQuery(api.users.getMyProfile);
  const { signOut } = useAuthActions();
  const { theme, toggleTheme, switchable } = useTheme();
  const { setOpenMobile } = useSidebar();

  const roleLabel = myProfile?.profile?.role === "super_admin" ? "Super Admin"
    : myProfile?.profile?.role === "broker" ? "Consultant"
    : myProfile?.profile?.role === "admin" ? "Admin"
    : myProfile?.profile?.role === "standard" ? "Standard"
    : myProfile?.profile?.role === "brand_admin" ? "Brand Admin"
    : myProfile?.profile?.role === "franchisor" ? "Franchisor"
    : myProfile?.profile?.role === "prospect" ? "Prospect"
    : "User";

  return (
    <SidebarFooter className="border-t border-sidebar-border">
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton size="lg">
                <Avatar className="size-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                    {user?.name?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start text-left">
                  <span className="text-sm font-medium truncate">
                    {user?.name || "User"}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    {roleLabel} · {user?.email}
                  </span>
                </div>
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="top"
              align="start"
              className="w-[--radix-dropdown-menu-trigger-width]"
            >
              <DropdownMenuItem asChild>
                <Link to="/settings" onClick={() => setOpenMobile(false)}>
                  <Settings className="size-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              {switchable && (
                <DropdownMenuItem onClick={toggleTheme}>
                  {theme === "light" ? (
                    <Moon className="size-4" />
                  ) : (
                    <Sun className="size-4" />
                  )}
                  {theme === "light" ? "Dark mode" : "Light mode"}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => signOut()}
                className="text-destructive focus:text-destructive focus:bg-destructive/10"
              >
                <LogOut className="size-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  );
}

function SidebarHeaderContent() {
  const { setOpenMobile } = useSidebar();

  return (
    <SidebarHeader className="border-b border-sidebar-border">
      <div className="flex items-center px-2 py-1">
        <Link
          to="/"
          onClick={() => setOpenMobile(false)}
          className="flex items-center gap-2"
        >
          <img src="/logo-dark-bg.png" alt={APP_NAME} className="h-9" />
        </Link>
      </div>
    </SidebarHeader>
  );
}

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarHeaderContent />
      <SidebarNav />
      <SidebarUserMenu />
    </Sidebar>
  );
}
