// Founder-only panel for controlled materialization of TaskSpec drafts into live Delivery tasks.
// Blocked until launch gate, planning approval, and sanity pass.

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
  Rocket, ShieldAlert, CheckCircle2, XCircle, AlertTriangle, Loader2, Info,
} from "lucide-react";
import type { MaterializationGate, MaterializationResult } from "@/lib/materialize-delivery-tasks";

interface Props {
  gate: MaterializationGate;
  draftsCount: number;
  onMaterialize: () => Promise<MaterializationResult>;
}

export function MaterializeTasksPanel({ gate, draftsCount, onMaterialize }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MaterializationResult | null>(null);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const res = await onMaterialize();
      setResult(res);
    } catch (e: any) {
      setResult({ success: false, createdCount: 0, errors: [e.message ?? "Unknown error"] });
    } finally {
      setLoading(false);
    }
  };

  // Already materialized
  if (result?.success) {
    return (
      <Alert className="bg-status-green/5 border-status-green/30">
        <CheckCircle2 className="h-4 w-4 text-status-green" />
        <AlertDescription className="text-[12px]">
          <span className="font-bold text-foreground">{result.createdCount} delivery tasks created</span>
          <span className="text-muted-foreground ml-1">from approved engineering drafts. Tasks are now live in Delivery Plane.</span>
        </AlertDescription>
      </Alert>
    );
  }

  // Errors from a failed attempt
  if (result && !result.success) {
    return (
      <div className="space-y-2">
        <Alert className="bg-destructive/5 border-destructive/30">
          <XCircle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-[12px] text-destructive">
            Materialization failed: {result.errors.join("; ")}
          </AlertDescription>
        </Alert>
        <Button
          variant="outline"
          size="sm"
          className="text-[11px] h-7"
          onClick={() => setResult(null)}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Gate status */}
      {!gate.canMaterialize ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-status-amber" />
            <span className="text-[12px] font-bold text-foreground">Materialization blocked</span>
          </div>
          {gate.blockers.map((b, i) => (
            <div key={i} className="flex items-start gap-2 pl-6">
              <XCircle className="h-3 w-3 text-destructive mt-0.5 shrink-0" />
              <span className="text-[11px] text-muted-foreground">{b}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-status-green" />
            <span className="text-[12px] font-bold text-foreground">
              Ready to materialize
            </span>
            <Badge variant="outline" className="text-[10px] px-2 py-0 h-5 border-border font-mono">
              {draftsCount} drafts
            </Badge>
          </div>

          {/* Warning banner */}
          <Alert className="bg-status-amber/5 border-status-amber/30">
            <AlertTriangle className="h-4 w-4 text-status-amber" />
            <AlertDescription className="text-[11px] text-muted-foreground">
              This creates live delivery work from approved engineering drafts. 
              Tasks will enter the Delivery Plane and become assignable to AI employees. 
              This action requires founder confirmation and cannot be undone.
            </AlertDescription>
          </Alert>

          {/* Founder action */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                className="gap-2 text-[12px] h-9"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Rocket className="h-3.5 w-3.5" />
                )}
                Materialize {draftsCount} Delivery Tasks
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-[15px]">Confirm Task Materialization</AlertDialogTitle>
                <AlertDialogDescription className="text-[12px] space-y-2">
                  <p>
                    You are about to create <strong>{draftsCount} live delivery tasks</strong> from 
                    approved TaskSpec drafts.
                  </p>
                  <p>
                    Once created, these tasks will be visible in the Delivery Board and can be 
                    assigned, executed, and reviewed through the standard delivery pipeline.
                  </p>
                  <p className="font-medium text-foreground">
                    This action is irreversible. Proceed?
                  </p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="text-[12px] h-8">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleConfirm}
                  className="text-[12px] h-8 gap-1.5"
                >
                  <Rocket className="h-3.5 w-3.5" />
                  Confirm Materialization
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {/* Honesty note */}
      <div className="flex items-start gap-1.5 pt-1">
        <Info className="h-3 w-3 text-muted-foreground/40 mt-0.5 shrink-0" />
        <span className="text-[10px] text-muted-foreground/40 leading-snug">
          Materialization creates tasks in "draft" state. Actual execution begins only after assignment and run scheduling through the standard delivery spine.
        </span>
      </div>
    </div>
  );
}
