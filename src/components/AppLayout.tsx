import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { TopBar } from "@/components/TopBar";

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
  fullHeight?: boolean;
}

export function AppLayout({ children, title, fullHeight }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar title={title} />
          <main className={`flex-1 overflow-auto ${fullHeight ? "" : "px-8 py-6"}`}>
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
