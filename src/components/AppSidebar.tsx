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
import { useLocation } from "react-router-dom";
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
      <SidebarHeader className="px-4 py-5">
        <div className={`flex items-center ${collapsed ? "justify-center" : "gap-3"}`}>
          <div className="h-8 w-8 rounded-[10px] bg-foreground flex items-center justify-center shrink-0">
            <span className="text-background text-[11px] font-bold font-mono leading-none">AI</span>
          </div>
          {!collapsed && (
            <div>
              <span className="text-[15px] font-semibold text-foreground leading-tight block tracking-tight">
                Production Studio
              </span>
              <span className="text-[12px] text-muted-foreground font-mono">v2.1</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {/* ── Operations ─────────────────────────────────── */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[12px] font-medium text-muted-foreground px-3 mb-1">
            Operations
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {operationsNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors duration-180"
                      activeClassName="bg-card text-foreground font-semibold shadow-card border-l-[3px] border-l-foreground"
                    >
                      <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
                      {!collapsed && <span className="text-[14px]">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* ── Management ───────────────────────────────── */}
        <SidebarGroup className="mt-2">
          <SidebarGroupLabel className="text-[12px] font-medium text-muted-foreground px-3 mb-1">
            Management
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {managementNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors duration-180"
                      activeClassName="bg-card text-foreground font-semibold shadow-card border-l-[3px] border-l-foreground"
                    >
                      <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
                      {!collapsed && <span className="text-[14px]">{item.title}</span>}
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
          <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-status-green shrink-0" />
            <span>System Online</span>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
