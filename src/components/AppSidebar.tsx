import {
  LayoutDashboard,
  FolderKanban,
  ListChecks,
  Play,
  FileBox,
  ShieldCheck,
  Stamp,
  Bot,
  BookOpen,
  Settings,
  Unplug,
  Shield,
  Building2,
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

const mainNav = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Projects", url: "/projects", icon: FolderKanban },
  { title: "Tasks", url: "/tasks", icon: ListChecks },
  { title: "Runs", url: "/runs", icon: Play },
  { title: "Artifacts", url: "/artifacts", icon: FileBox },
  { title: "Reviews", url: "/reviews", icon: ShieldCheck },
  { title: "Approvals", url: "/approvals", icon: Stamp },
];

const systemNav = [
  { title: "Agents", url: "/agents", icon: Bot },
  { title: "Providers", url: "/providers", icon: Unplug },
  { title: "Docs", url: "/docs", icon: BookOpen },
  { title: "Settings", url: "/settings", icon: Settings },
];

const controlNav = [
  { title: "Control Plane", url: "/control", icon: Shield },
  { title: "Office", url: "/control/office", icon: Building2 },
  { title: "Provider Control", url: "/control/providers", icon: Unplug },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-sidebar-primary flex items-center justify-center">
              <span className="text-sidebar-primary-foreground text-xs font-bold">AI</span>
            </div>
            <span className="font-semibold text-sm text-sidebar-accent-foreground tracking-tight">
              Workshop OS
            </span>
          </div>
        )}
        {collapsed && (
          <div className="flex justify-center">
            <div className="h-7 w-7 rounded-md bg-sidebar-primary flex items-center justify-center">
              <span className="text-sidebar-primary-foreground text-xs font-bold">AI</span>
            </div>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-muted">Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-muted">System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-muted">Control</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {controlNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        {!collapsed && (
          <div className="text-xs text-sidebar-muted">
            V1 · Internal
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}