"use client";

// ============================================================================
// ResourceManager — admin CRUD for reservation resources
// ============================================================================

import { useState, useTransition, useCallback, useEffect } from "react";
import {
  getAllResources,
  createResource,
  updateResource,
  toggleResourceAvailability,
  deleteResource,
  type ResourceActionState,
} from "@/actions/admin-resources";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Car,
  DoorOpen,
  Wrench,
  CircleParking,
  Plus,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Loader2,
  X,
  MapPin,
  Package,
  ChevronDown,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types & config
// ---------------------------------------------------------------------------

type Resource = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  location: string | null;
  imageUrl: string | null;
  isAvailable: boolean;
  metadata: unknown;
  createdAt: Date | string;
  _count: { reservations: number };
};

const TYPE_META: Record<
  string,
  { icon: typeof Car; color: string; bg: string; label: string }
> = {
  CAR: {
    icon: Car,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-900/30",
    label: "Auto",
  },
  ROOM: {
    icon: DoorOpen,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-900/30",
    label: "Místnost",
  },
  TOOL: {
    icon: Wrench,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-900/30",
    label: "Nástroj",
  },
  PARKING_SPOT: {
    icon: CircleParking,
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-900/30",
    label: "Parkování",
  },
};

const RESOURCE_TYPES = [
  { value: "CAR", label: "Auto" },
  { value: "ROOM", label: "Místnost" },
  { value: "TOOL", label: "Nástroj" },
  { value: "PARKING_SPOT", label: "Parkování" },
] as const;

// ---------------------------------------------------------------------------
// ResourceManager
// ---------------------------------------------------------------------------

export function ResourceManager() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [filter, setFilter] = useState<string>("ALL");

  const loadResources = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllResources();
      setResources(data as Resource[]);
    } catch {
      setError("Nepodařilo se načíst zdroje");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadResources();
  }, [loadResources]);

  const filtered =
    filter === "ALL" ? resources : resources.filter((r) => r.type === filter);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
        <Loader2 className="h-8 w-8 animate-spin text-foreground-muted" />
        <p className="mt-3 text-sm text-foreground-secondary">
          Načítání zdrojů…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16 space-y-3">
        <Package className="h-8 w-8 text-red-500" />
        <p className="text-sm text-foreground-secondary">{error}</p>
        <button
          onClick={loadResources}
          className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
        >
          Zkusit znovu
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header + add button */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-accent" />
          <h3 className="font-semibold text-foreground">Správa zdrojů</h3>
          <span className="rounded-lg bg-background-secondary px-2 py-0.5 text-xs font-medium text-foreground-secondary">
            {resources.length}
          </span>
        </div>
        <button
          onClick={() => {
            setEditingResource(null);
            setShowForm(true);
          }}
          className="flex items-center gap-1.5 rounded-xl bg-accent px-3.5 py-2 text-sm font-medium text-white shadow-sm active:scale-95 transition-transform hover:bg-accent-hover"
        >
          <Plus className="h-4 w-4" />
          Přidat zdroj
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <FilterTab
          active={filter === "ALL"}
          onClick={() => setFilter("ALL")}
          label="Vše"
          count={resources.length}
        />
        {RESOURCE_TYPES.map((t) => {
          const count = resources.filter((r) => r.type === t.value).length;
          return (
            <FilterTab
              key={t.value}
              active={filter === t.value}
              onClick={() => setFilter(t.value)}
              label={t.label}
              count={count}
              icon={TYPE_META[t.value]?.icon}
            />
          );
        })}
      </div>

      {/* Form modal */}
      {showForm && (
        <ResourceForm
          resource={editingResource}
          onClose={() => {
            setShowForm(false);
            setEditingResource(null);
          }}
          onSuccess={() => {
            setShowForm(false);
            setEditingResource(null);
            loadResources();
          }}
        />
      )}

      {/* Resource list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-12">
          <Package className="h-8 w-8 text-foreground-muted" />
          <p className="mt-2 text-sm text-foreground-secondary">
            {filter === "ALL"
              ? "Žádné zdroje. Přidejte první."
              : "Žádné zdroje v této kategorii"}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((res) => (
            <ResourceRow
              key={res.id}
              resource={res}
              onEdit={() => {
                setEditingResource(res);
                setShowForm(true);
              }}
              onToggle={async () => {
                const result = await toggleResourceAvailability(res.id);
                if (result.error) {
                  toast.error(result.error);
                } else {
                  toast.success(
                    res.isAvailable ? "Zdroj deaktivován" : "Zdroj aktivován"
                  );
                  loadResources();
                }
              }}
              onDelete={async () => {
                if (
                  !confirm(
                    `Opravdu smazat "${res.name}"? Tato akce je nevratná.`
                  )
                )
                  return;
                const result = await deleteResource(res.id);
                if (result.error) {
                  toast.error(result.error);
                } else {
                  toast.success("Zdroj smazán");
                  loadResources();
                }
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// FilterTab
// ---------------------------------------------------------------------------

function FilterTab({
  active,
  onClick,
  label,
  count,
  icon: Icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  icon?: typeof Car;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition-all active:scale-95",
        active
          ? "bg-accent text-white shadow-sm"
          : "bg-background-secondary text-foreground-secondary hover:bg-border"
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {label}
      <span
        className={cn(
          "ml-0.5 rounded-md px-1.5 py-0.5 text-xs",
          active
            ? "bg-white/20 text-white"
            : "bg-border text-foreground-muted"
        )}
      >
        {count}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// ResourceRow
// ---------------------------------------------------------------------------

function ResourceRow({
  resource,
  onEdit,
  onToggle,
  onDelete,
}: {
  resource: Resource;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [toggling, startToggle] = useTransition();
  const [deleting, startDelete] = useTransition();
  const meta = TYPE_META[resource.type] ?? TYPE_META.TOOL;
  const Icon = meta.icon;

  return (
    <li className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        {/* Type icon */}
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            meta.bg
          )}
        >
          <Icon className={cn("h-5 w-5", meta.color)} />
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-foreground">
              {resource.name}
            </p>
            <span
              className={cn(
                "rounded-lg px-2 py-0.5 text-xs font-medium",
                resource.isAvailable
                  ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                  : "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400"
              )}
            >
              {resource.isAvailable ? "Aktivní" : "Neaktivní"}
            </span>
          </div>

          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-foreground-muted">
            <span className={cn("font-medium", meta.color)}>{meta.label}</span>
            {resource.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {resource.location}
              </span>
            )}
            <span>{resource._count.reservations} rezervací</span>
          </div>

          {resource.description && (
            <p className="mt-1 text-xs text-foreground-secondary line-clamp-1">
              {resource.description}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground-secondary hover:bg-background-secondary active:scale-95 transition-all"
            title="Upravit"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => startToggle(onToggle)}
            disabled={toggling}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground-secondary hover:bg-background-secondary active:scale-95 transition-all disabled:opacity-50"
            title={resource.isAvailable ? "Deaktivovat" : "Aktivovat"}
          >
            {toggling ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : resource.isAvailable ? (
              <ToggleRight className="h-4 w-4 text-emerald-600" />
            ) : (
              <ToggleLeft className="h-4 w-4 text-red-500" />
            )}
          </button>
          <button
            type="button"
            onClick={() => startDelete(onDelete)}
            disabled={deleting}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 active:scale-95 transition-all disabled:opacity-50"
            title="Smazat"
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// ResourceForm — create / edit
// ---------------------------------------------------------------------------

function ResourceForm({
  resource,
  onClose,
  onSuccess,
}: {
  resource: Resource | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEdit = !!resource;
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<ResourceActionState | undefined>();

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      let result: ResourceActionState;
      if (isEdit && resource) {
        result = await updateResource(resource.id, undefined, formData);
      } else {
        result = await createResource(undefined, formData);
      }

      setState(result);
      if (result.success) {
        toast.success(isEdit ? "Zdroj upraven" : "Zdroj vytvořen");
        onSuccess();
      }
    });
  };

  return (
    <div className="rounded-2xl border border-accent/30 bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">
          {isEdit ? "Upravit zdroj" : "Nový zdroj"}
        </h4>
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-foreground-secondary hover:bg-background-secondary"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {state?.error && (
        <div className="mb-4 rounded-xl bg-red-50 dark:bg-red-900/30 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-400">
          {state.error}
        </div>
      )}

      <form action={handleSubmit} className="space-y-3">
        {/* Name */}
        <div>
          <label className="mb-1 block text-xs font-medium text-foreground-secondary">
            Název *
          </label>
          <input
            name="name"
            defaultValue={resource?.name ?? ""}
            required
            maxLength={100}
            placeholder="např. Škoda Octavia"
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
          {state?.fieldErrors?.name && (
            <p className="mt-1 text-xs text-red-500">
              {state.fieldErrors.name[0]}
            </p>
          )}
        </div>

        {/* Type */}
        <div>
          <label className="mb-1 block text-xs font-medium text-foreground-secondary">
            Kategorie *
          </label>
          <div className="relative">
            <select
              name="type"
              defaultValue={resource?.type ?? "CAR"}
              className="w-full appearance-none rounded-xl border border-border bg-background px-3 py-2.5 pr-8 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            >
              {RESOURCE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted" />
          </div>
          {state?.fieldErrors?.type && (
            <p className="mt-1 text-xs text-red-500">
              {state.fieldErrors.type[0]}
            </p>
          )}
        </div>

        {/* Location */}
        <div>
          <label className="mb-1 block text-xs font-medium text-foreground-secondary">
            Umístění
          </label>
          <input
            name="location"
            defaultValue={resource?.location ?? ""}
            maxLength={200}
            placeholder="např. Parking B, místo 12"
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
        </div>

        {/* Description */}
        <div>
          <label className="mb-1 block text-xs font-medium text-foreground-secondary">
            Popis
          </label>
          <textarea
            name="description"
            defaultValue={resource?.description ?? ""}
            maxLength={500}
            rows={2}
            placeholder="Volitelný popis zdroje"
            className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
        </div>

        {/* Image URL */}
        <div>
          <label className="mb-1 block text-xs font-medium text-foreground-secondary">
            URL obrázku
          </label>
          <input
            name="imageUrl"
            defaultValue={resource?.imageUrl ?? ""}
            type="url"
            placeholder="https://..."
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
        </div>

        {/* Available toggle */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            name="isAvailableCheck"
            defaultChecked={resource?.isAvailable ?? true}
            onChange={(e) => {
              const hidden = e.target.form?.querySelector(
                'input[name="isAvailable"]'
              ) as HTMLInputElement | null;
              if (hidden) hidden.value = e.target.checked ? "true" : "false";
            }}
            className="h-4 w-4 rounded border-border text-accent focus:ring-accent/20"
          />
          <span className="text-sm text-foreground">Dostupný k rezervaci</span>
        </label>
        <input
          type="hidden"
          name="isAvailable"
          defaultValue={resource?.isAvailable === false ? "false" : "true"}
        />

        {/* Submit */}
        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={isPending}
            className={cn(
              "flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all active:scale-[0.98]",
              isPending
                ? "bg-border text-foreground-muted cursor-not-allowed"
                : "bg-accent text-white shadow-sm hover:bg-accent-hover"
            )}
          >
            {isPending ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {isEdit ? "Ukládám…" : "Vytvářím…"}
              </span>
            ) : isEdit ? (
              "Uložit změny"
            ) : (
              "Vytvořit zdroj"
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground-secondary hover:bg-background-secondary transition-colors"
          >
            Zrušit
          </button>
        </div>
      </form>
    </div>
  );
}
