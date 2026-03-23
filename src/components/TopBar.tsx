import { SidebarTrigger } from "@/components/ui/sidebar";
import { Search, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TopBarProps {
  title?: string;
}

export function TopBar({ title }: TopBarProps) {
  return (
    <header className="h-12 flex items-center justify-between border-b px-4 bg-card shrink-0">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="h-8 w-8" />
        {title && (
          <h1 className="text-sm font-semibold tracking-tight">{title}</h1>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Search className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 relative">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-status-red" />
        </Button>
      </div>
    </header>
  );
}