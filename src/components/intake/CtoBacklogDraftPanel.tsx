import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  ClipboardList, ChevronDown, ChevronUp, Shield, Pencil, Split,
  Merge, HelpCircle, Check, X, AlertTriangle,
} from "lucide-react";
import type { CTOBacklogCardDraft } from "@/types/front-office-planning";
import { mergeBacklogCards, splitBacklogCard } from "@/lib/cto-backlog";

interface CtoBacklogDraftPanelProps {
  cards: CTOBacklogCardDraft[];
  onCardsChange: (cards: CTOBacklogCardDraft[]) => void;
  locked?: boolean;
}

export function CtoBacklogDraftPanel({ cards, onCardsChange, locked }: CtoBacklogDraftPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [selectedForMerge, setSelectedForMerge] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const moduleNames = [...new Set(cards.map((c) => c.moduleName))];

  const handleSplit = (id: string) => {
    const card = cards.find((c) => c.id === id);
    if (!card) return;
    const [a, b] = splitBacklogCard(card);
    onCardsChange(cards.flatMap((c) => (c.id === id ? [a, b] : [c])));
  };

  const handleMerge = () => {
    if (selectedForMerge.length !== 2) return;
    const [aId, bId] = selectedForMerge;
    const a = cards.find((c) => c.id === aId);
    const b = cards.find((c) => c.id === bId);
    if (!a || !b) return;
    const merged = mergeBacklogCards(a, b);
    onCardsChange(cards.filter((c) => c.id !== aId && c.id !== bId).concat(merged));
    setSelectedForMerge([]);
  };

  const toggleMergeSelect = (id: string) => {
    setSelectedForMerge((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 2 ? prev : [...prev, id]
    );
  };

  const handleMarkUnclear = (id: string) => {
    onCardsChange(
      cards.map((c) =>
        c.id === id
          ? { ...c, constraints: [...c.constraints, "⚠ Marked unclear by founder — needs refinement"] }
          : c
      )
    );
  };

  const handleFieldEdit = (id: string, field: keyof CTOBacklogCardDraft, value: string) => {
    onCardsChange(
      cards.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  return (
    <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] animate-slide-up">
      {/* Header */}
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-primary" />
          <span className="text-[12px] font-bold tracking-tight text-foreground">
            CTO Backlog Draft
          </span>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-status-amber/10 text-status-amber">
            PRE-DELIVERY
          </span>
          <span className="text-[10px] font-mono text-muted-foreground">
            {cards.length} card{cards.length !== 1 ? "s" : ""}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Merge action */}
          {!locked && selectedForMerge.length === 2 && (
            <button
              onClick={handleMerge}
              className="w-full flex items-center justify-center gap-1.5 h-7 rounded-lg text-[10px] font-bold bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              <Merge className="h-3 w-3" /> Merge selected cards
            </button>
          )}

          {/* Cards grouped by module */}
          {moduleNames.map((modName) => (
            <div key={modName}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{modName}</span>
                <span className="text-[9px] font-mono text-muted-foreground/40">
                  {cards.filter((c) => c.moduleName === modName).length} card{cards.filter((c) => c.moduleName === modName).length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="space-y-2">
                {cards
                  .filter((c) => c.moduleName === modName)
                  .map((card) => (
                    <BacklogCard
                      key={card.id}
                      card={card}
                      locked={!!locked}
                      isEditing={editingId === card.id}
                      isMergeSelected={selectedForMerge.includes(card.id)}
                      onStartEdit={() => setEditingId(card.id)}
                      onStopEdit={() => setEditingId(null)}
                      onSplit={() => handleSplit(card.id)}
                      onToggleMerge={() => toggleMergeSelect(card.id)}
                      onMarkUnclear={() => handleMarkUnclear(card.id)}
                      onFieldEdit={(field, value) => handleFieldEdit(card.id, field, value)}
                    />
                  ))}
              </div>
            </div>
          ))}

          {/* Info footer */}
          <div className="flex items-center gap-1.5 px-1">
            <Shield className="h-3 w-3 text-muted-foreground/40" />
            <span className="text-[9px] text-muted-foreground/50">
              Intent Plane artifact · draft/planning state · live Delivery tasks created only after launch gate
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── BacklogCard ── */

function BacklogCard({
  card,
  locked,
  isEditing,
  isMergeSelected,
  onStartEdit,
  onStopEdit,
  onSplit,
  onToggleMerge,
  onMarkUnclear,
  onFieldEdit,
}: {
  card: CTOBacklogCardDraft;
  locked: boolean;
  isEditing: boolean;
  isMergeSelected: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
  onSplit: () => void;
  onToggleMerge: () => void;
  onMarkUnclear: () => void;
  onFieldEdit: (field: keyof CTOBacklogCardDraft, value: string) => void;
}) {
  const [showDetail, setShowDetail] = useState(false);
  const isUnclear = card.constraints.some((c) => c.includes("⚠ Marked unclear"));

  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2.5 transition-all",
        isMergeSelected
          ? "border-primary bg-primary/5"
          : isUnclear
          ? "border-status-amber/30 bg-status-amber/5"
          : "border-border bg-muted/30"
      )}
    >
      {/* Top row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={() => setShowDetail((p) => !p)} className="shrink-0">
            {showDetail ? (
              <ChevronUp className="h-3 w-3 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            )}
          </button>
          <span className="text-[11px] font-bold text-foreground truncate">{card.featureSlice}</span>
        </div>
        {isUnclear && <AlertTriangle className="h-3 w-3 text-status-amber shrink-0" />}
      </div>

      {/* Technical spec preview */}
      {!showDetail && (
        <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2 pl-5">{card.technicalSpec}</p>
      )}

      {/* Expanded detail */}
      {showDetail && (
        <div className="mt-2 pl-5 space-y-2">
          <DetailField
            label="Technical Spec"
            value={card.technicalSpec}
            editing={isEditing}
            onEdit={(v) => onFieldEdit("technicalSpec", v)}
          />
          <DetailField
            label="Definition of Done"
            value={card.definitionOfDone}
            editing={isEditing}
            onEdit={(v) => onFieldEdit("definitionOfDone", v)}
          />
          <DetailList label="Constraints" items={card.constraints} />
          <DetailList label="Test Requirements" items={card.testRequirements} />
          <DetailList label="Forbidden Shortcuts" items={card.forbiddenShortcuts} />
          <DetailList label="Performance Constraints" items={card.performanceConstraints} />

          {/* Actions */}
          {!locked && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {!isEditing ? (
                <ActionBtn icon={Pencil} label="Edit" onClick={onStartEdit} />
              ) : (
                <ActionBtn icon={Check} label="Done" onClick={onStopEdit} color="text-status-green" />
              )}
              <ActionBtn icon={Split} label="Split" onClick={onSplit} />
              <ActionBtn
                icon={Merge}
                label={isMergeSelected ? "Deselect" : "Select to merge"}
                onClick={onToggleMerge}
                color={isMergeSelected ? "text-primary" : undefined}
              />
              {!isUnclear && (
                <ActionBtn icon={HelpCircle} label="Mark unclear" onClick={onMarkUnclear} color="text-status-amber" />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Helpers ── */

function DetailField({
  label,
  value,
  editing,
  onEdit,
}: {
  label: string;
  value: string;
  editing: boolean;
  onEdit: (v: string) => void;
}) {
  return (
    <div>
      <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      {editing ? (
        <textarea
          value={value}
          onChange={(e) => onEdit(e.target.value)}
          className="w-full text-[10px] px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground outline-none focus:border-primary/50 resize-none transition-colors"
          rows={2}
        />
      ) : (
        <p className="text-[10px] text-foreground/80 mt-0.5">{value}</p>
      )}
    </div>
  );
}

function DetailList({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      <ul className="mt-0.5 space-y-0.5">
        {items.map((item, i) => (
          <li key={i} className="text-[10px] text-foreground/70 flex items-start gap-1.5">
            <span className="text-muted-foreground/40 mt-0.5">·</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ActionBtn({
  icon: Icon,
  label,
  onClick,
  color,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1 text-[9px] font-semibold px-2 py-1 rounded-lg border border-border hover:bg-muted transition-colors",
        color ?? "text-muted-foreground"
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </button>
  );
}
