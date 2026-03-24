import {
  Crosshair,
  FolderKanban,
  Monitor,
  Crown,
  Settings,
  Users,
  Megaphone,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const operationsNav = [
  { title: "Command Center", url: "/", icon: Crosshair },
  { title: "Projects", url: "/projects", icon: FolderKanban },
  { title: "Office", url: "/office", icon: Monitor },
  { title: "Founder", url: "/founder", icon: Crown },
  { title: "System", url: "/system", icon: Settings },
];

const managementNav = [
  { title: "Teams", url: "/teams", icon: Users },
  { title: "Content", url: "/smm", icon: Megaphone },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon">
      {/* ── Brand ─────────────────────────────────────────── */}
      <SidebarHeader className="px-4 pt-6 pb-5">
        <div className={`flex items-center ${collapsed ? "justify-center" : "gap-3"}`}>
          <div className="h-9 w-9 rounded-[11px] bg-foreground/90 flex items-center justify-center shrink-0 shadow-card">
            <span className="text-background text-[11px] font-bold font-mono leading-none tracking-tight">AI</span>
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-[14px] font-semibold text-foreground leading-tight tracking-[-0.01em]">
                Production Studio
              </span>
              <span className="text-[10px] text-muted-foreground/60 font-mono mt-0.5">v2.2</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 mt-1">
        {/* ── Operations ─────────────────────────────────── */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] font-medium text-muted-foreground/50 px-3 mb-1.5 tracking-[0.02em]">
            Operations
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {operationsNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="group flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground/80 hover:text-foreground hover:bg-sidebar-accent/60 transition-all duration-180"
                      activeClassName="bg-sidebar-accent text-foreground font-medium shadow-[inset_0_0_0_1px_hsl(var(--border)/0.4)] [&_svg]:text-foreground"
                    >
                      <item.icon className="h-[17px] w-[17px] shrink-0 transition-colors duration-180" strokeWidth={1.6} />
                      {!collapsed && <span className="text-[13.5px] leading-none">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* ── Management ───────────────────────────────── */}
        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="text-[11px] font-medium text-muted-foreground/50 px-3 mb-1.5 tracking-[0.02em]">
            Management
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {managementNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="group flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground/80 hover:text-foreground hover:bg-sidebar-accent/60 transition-all duration-180"
                      activeClassName="bg-sidebar-accent text-foreground font-medium shadow-[inset_0_0_0_1px_hsl(var(--border)/0.4)] [&_svg]:text-foreground"
                    >
                      <item.icon className="h-[17px] w-[17px] shrink-0 transition-colors duration-180" strokeWidth={1.6} />
                      {!collapsed && <span className="text-[13.5px] leading-none">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-4 py-4">
        {!collapsed && (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground/50 font-mono">
            <div className="h-1.5 w-1.5 rounded-full bg-status-green/70 shrink-0" />
            <span>Online</span>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
