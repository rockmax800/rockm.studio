import { useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import CompanyLeadSession from "@/pages/CompanyLeadSession";

interface CompanyLeadWorkspaceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CompanyLeadWorkspace({ open, onOpenChange }: CompanyLeadWorkspaceProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:w-[92vw] sm:max-w-[1400px] p-0 border-l border-border bg-background overflow-hidden [&>button]:hidden"
      >
        <CompanyLeadSession
          embedded
          onClose={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  );
}
