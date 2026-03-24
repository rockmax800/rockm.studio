import {
  Crosshair,
  FolderKanban,
  Monitor,
  Crown,
  Settings,
  Building2,
  Users,
  ChevronRight,
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

const primaryNav = [
  { title: "Command Center", url: "/", icon: Crosshair },
  { title: "Projects", url: "/projects", icon: FolderKanban },
  { title: "Office", url: "/office", icon: Monitor },
  { title: "Founder", url: "/founder", icon: Crown },
  { title: "System", url: "/system", icon: Settings },
];

const secondaryNav = [
  { title: "Departments", url: "/departments", icon: Building2 },
  { title: "Company", url: "/company", icon: Users },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-3">
        <div className={`flex items-center ${collapsed ? "justify-center" : "gap-2"}`}>
          <div className="h-7 w-7 rounded bg-primary/20 border border-primary/30 flex items-center justify-center animate-glow">
            <span className="text-primary text-[10px] font-bold font-mono">AI</span>
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-semibold text-xs text-foreground tracking-tight">
                Production Studio
              </span>
              <span className="text-[9px] font-mono text-muted-foreground">v2.1 · cockpit</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-muted text-[9px] uppercase tracking-widest">
            Operations
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {primaryNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="hover:bg-sidebar-accent/50 text-sidebar-foreground"
                      activeClassName="bg-primary/10 text-primary border-l-2 border-primary font-medium"
                    >
                      <item.icon className="mr-2 h-3.5 w-3.5" />
                      {!collapsed && <span className="text-xs">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-muted text-[9px] uppercase tracking-widest">
            Management
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {secondaryNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="hover:bg-sidebar-accent/50 text-sidebar-foreground"
                      activeClassName="bg-primary/10 text-primary border-l-2 border-primary font-medium"
                    >
                      <item.icon className="mr-2 h-3.5 w-3.5" />
                      {!collapsed && <span className="text-xs">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        {!collapsed && (
          <div className="flex items-center gap-1.5 text-[9px] font-mono text-sidebar-muted">
            <div className="h-1.5 w-1.5 rounded-full bg-status-green animate-pulse" />
            System Online
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
