import {
  Crosshair,
  FolderKanban,
  Monitor,
  Crown,
  Settings,
  Building2,
  Users,
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
      <SidebarHeader className="p-4">
        <div className={`flex items-center ${collapsed ? "justify-center" : "gap-2.5"}`}>
          <div className="h-8 w-8 rounded-[10px] bg-primary flex items-center justify-center shrink-0">
            <span className="text-primary-foreground text-[11px] font-bold font-mono">AI</span>
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-semibold text-[14px] text-foreground tracking-tight leading-tight">
                Production Studio
              </span>
              <span className="text-[11px] font-mono text-muted-foreground">v2.1</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground text-[12px] font-medium px-4 mb-1">
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
                      className="hover:bg-secondary text-muted-foreground rounded-lg mx-2 px-3 py-2"
                      activeClassName="bg-secondary text-foreground font-medium"
                    >
                      <item.icon className="mr-2.5 h-4 w-4" />
                      {!collapsed && <span className="text-[14px]">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground text-[12px] font-medium px-4 mb-1">
            Management
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {secondaryNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="hover:bg-secondary text-muted-foreground rounded-lg mx-2 px-3 py-2"
                      activeClassName="bg-secondary text-foreground font-medium"
                    >
                      <item.icon className="mr-2.5 h-4 w-4" />
                      {!collapsed && <span className="text-[14px]">{item.title}</span>}
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
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-status-green" />
            System Online
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
