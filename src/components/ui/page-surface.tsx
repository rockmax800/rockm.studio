import * as React from "react";
import { cn } from "@/lib/utils";

/* ── PageSurface ─────────────────────────────────────────────
   Semantic surface wrapper with 3 elevation levels.
   Level 1 = page background (default)
   Level 2 = section / panel / card surface
   Level 3 = elevated card / dialog / sticky bar
   ──────────────────────────────────────────────────────────── */

interface PageSurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  level?: 1 | 2 | 3;
  /** Remove default padding */
  noPad?: boolean;
}

const PageSurface = React.forwardRef<HTMLDivElement, PageSurfaceProps>(
  ({ className, level = 1, noPad = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          level === 1 && "surface-level-1",
          level === 2 && "surface-level-2",
          level === 3 && "surface-level-3",
          !noPad && level === 1 && "ds-page",
          !noPad && level === 2 && "p-5",
          !noPad && level === 3 && "p-5",
          className,
        )}
        {...props}
      />
    );
  },
);
PageSurface.displayName = "PageSurface";

/* ── PageHeader ──────────────────────────────────────────── */

interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(
  ({ className, title, description, actions, ...props }, ref) => (
    <div ref={ref} className={cn("ds-page-header flex items-start justify-between gap-4", className)} {...props}>
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0 pt-1">{actions}</div>}
    </div>
  ),
);
PageHeader.displayName = "PageHeader";

/* ── EmptyState ──────────────────────────────────────────── */

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ className, icon, title, description, action, ...props }, ref) => (
    <div ref={ref} className={cn("ds-empty-state", className)} {...props}>
      {icon && <div className="text-muted-foreground/40">{icon}</div>}
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  ),
);
EmptyState.displayName = "EmptyState";

/* ── StatCard ────────────────────────────────────────────── */

interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  trend?: React.ReactNode;
}

const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  ({ className, label, value, trend, ...props }, ref) => (
    <div ref={ref} className={cn("ds-stat", className)} {...props}>
      <div className="flex items-end justify-between gap-2">
        <span className="ds-stat-value">{value}</span>
        {trend}
      </div>
      <div className="ds-stat-label">{label}</div>
    </div>
  ),
);
StatCard.displayName = "StatCard";

export { PageSurface, PageHeader, EmptyState, StatCard };
