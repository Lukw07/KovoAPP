"use client";

// ============================================================================
// CategoryManager — Admin CRUD for HR Request & Resource categories
// ============================================================================

import { useState, useTransition, useEffect, useCallback } from "react";
import {
  Plus,
  Pencil,
  Trash,
  Eye,
  EyeSlash,
  ArrowUp,
  ArrowDown,
  Check,
  X,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  getAllHrRequestCategories,
  createHrRequestCategory,
  updateHrRequestCategory,
  toggleHrRequestCategory,
  deleteHrRequestCategory,
  getAllResourceCategories,
  createResourceCategory,
  updateResourceCategory,
  toggleResourceCategory,
  deleteResourceCategory,
} from "@/actions/admin-categories";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Category {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  isActive: boolean;
  sortOrder: number;
}

type CategoryType = "hrRequest" | "resource";

const PRESET_COLORS = [
  "#3B82F6", // blue
  "#10B981", // emerald
  "#F59E0B", // amber
  "#EF4444", // red
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#06B6D4", // cyan
  "#F97316", // orange
  "#14B8A6", // teal
  "#6366F1", // indigo
];

const PRESET_ICONS = ["📋", "🏖️", "🏥", "📝", "🎓", "🔧", "🚗", "💼", "🏠", "⚙️"];

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function CategoryManager({ type }: { type: CategoryType }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formColor, setFormColor] = useState(PRESET_COLORS[0]);
  const [formIcon, setFormIcon] = useState("");
  const [formSortOrder, setFormSortOrder] = useState(0);

  // Delete dialog
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    id: string;
    name: string;
  }>({ open: false, id: "", name: "" });

  const label = type === "hrRequest" ? "žádostí" : "rezervací";

  // Fetch
  const fetchCategories = useCallback(async () => {
    try {
      const data =
        type === "hrRequest"
          ? await getAllHrRequestCategories()
          : await getAllResourceCategories();
      setCategories(data as Category[]);
    } catch {
      toast.error("Nepodařilo se načíst kategorie");
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Reset form
  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormName("");
    setFormDescription("");
    setFormColor(PRESET_COLORS[0]);
    setFormIcon("");
    setFormSortOrder(0);
  };

  // Open edit
  const openEdit = (cat: Category) => {
    setEditingId(cat.id);
    setFormName(cat.name);
    setFormDescription(cat.description || "");
    setFormColor(cat.color || PRESET_COLORS[0]);
    setFormIcon(cat.icon || "");
    setFormSortOrder(cat.sortOrder);
    setShowForm(true);
  };

  // Save
  const handleSave = () => {
    if (!formName.trim()) {
      toast.error("Název je povinný");
      return;
    }

    startTransition(async () => {
      try {
        const data = {
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          color: formColor || undefined,
          icon: formIcon || undefined,
          sortOrder: formSortOrder,
        };

        if (editingId) {
          if (type === "hrRequest") {
            await updateHrRequestCategory(editingId, data);
          } else {
            await updateResourceCategory(editingId, data);
          }
          toast.success("Kategorie aktualizována");
        } else {
          if (type === "hrRequest") {
            await createHrRequestCategory(data);
          } else {
            await createResourceCategory(data);
          }
          toast.success("Kategorie vytvořena");
        }

        resetForm();
        fetchCategories();
      } catch {
        toast.error("Chyba při ukládání");
      }
    });
  };

  // Toggle active
  const handleToggle = (id: string, current: boolean) => {
    startTransition(async () => {
      try {
        if (type === "hrRequest") {
          await toggleHrRequestCategory(id, !current);
        } else {
          await toggleResourceCategory(id, !current);
        }
        fetchCategories();
        toast.success(current ? "Kategorie deaktivována" : "Kategorie aktivována");
      } catch {
        toast.error("Chyba při změně stavu");
      }
    });
  };

  // Delete
  const handleDelete = () => {
    startTransition(async () => {
      try {
        if (type === "hrRequest") {
          await deleteHrRequestCategory(deleteDialog.id);
        } else {
          await deleteResourceCategory(deleteDialog.id);
        }
        setDeleteDialog({ open: false, id: "", name: "" });
        fetchCategories();
        toast.success("Kategorie smazána");
      } catch {
        toast.error("Chyba při mazání");
      }
    });
  };

  // Move sort order
  const handleMove = (id: string, direction: "up" | "down") => {
    const idx = categories.findIndex((c) => c.id === id);
    if (idx === -1) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= categories.length) return;

    const cat = categories[idx];
    const swapCat = categories[swapIdx];

    startTransition(async () => {
      try {
        const updateFn =
          type === "hrRequest"
            ? updateHrRequestCategory
            : updateResourceCategory;

        await Promise.all([
          updateFn(cat.id, {
            name: cat.name,
            description: cat.description || undefined,
            color: cat.color || undefined,
            icon: cat.icon || undefined,
            sortOrder: swapCat.sortOrder,
          }),
          updateFn(swapCat.id, {
            name: swapCat.name,
            description: swapCat.description || undefined,
            color: swapCat.color || undefined,
            icon: swapCat.icon || undefined,
            sortOrder: cat.sortOrder,
          }),
        ]);
        fetchCategories();
      } catch {
        toast.error("Chyba při změně pořadí");
      }
    });
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-card" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Kategorie {label}
        </h3>
        {!showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus weight="bold" className="h-4 w-4" />
            Přidat
          </Button>
        )}
      </div>

      {/* ---------- Form ---------- */}
      {showForm && (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
          <h4 className="text-sm font-medium text-foreground">
            {editingId ? "Upravit kategorii" : "Nová kategorie"}
          </h4>

          <Input
            label="Název"
            required
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="Např. Dovolená, Sick day..."
          />

          <Input
            label="Popis"
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            placeholder="Volitelný popis"
          />

          <Input
            label="Pořadí"
            type="number"
            min={0}
            value={formSortOrder}
            onChange={(e) => setFormSortOrder(parseInt(e.target.value) || 0)}
          />

          {/* Color picker */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-foreground-secondary">
              Barva
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setFormColor(c)}
                  className={cn(
                    "h-8 w-8 rounded-lg border-2 transition-all",
                    formColor === c
                      ? "border-white scale-110 shadow-lg"
                      : "border-transparent hover:scale-105",
                  )}
                  style={{ backgroundColor: c }}
                >
                  {formColor === c && (
                    <Check weight="bold" className="h-4 w-4 text-white mx-auto" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Icon picker */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-foreground-secondary">
              Ikona
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESET_ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setFormIcon(icon)}
                  className={cn(
                    "h-9 w-9 rounded-lg text-lg flex items-center justify-center border-2 transition-all",
                    formIcon === icon
                      ? "border-accent bg-accent/10 scale-110"
                      : "border-border bg-background hover:border-border-strong hover:scale-105",
                  )}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          {formName && (
            <div className="flex items-center gap-2 rounded-xl bg-background p-3 border border-border">
              <span className="text-xs text-foreground-muted">Náhled:</span>
              {formIcon && <span className="text-base">{formIcon}</span>}
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{ backgroundColor: formColor }}
              />
              <span className="text-sm font-medium text-foreground">
                {formName}
              </span>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={handleSave} loading={isPending}>
              {editingId ? "Uložit" : "Vytvořit"}
            </Button>
            <Button size="sm" variant="ghost" onClick={resetForm}>
              Zrušit
            </Button>
          </div>
        </div>
      )}

      {/* ---------- List ---------- */}
      {categories.length === 0 && !showForm ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-foreground-muted">
            Žádné kategorie. Přidejte první.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {categories.map((cat, idx) => (
            <div
              key={cat.id}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-3 transition-all",
                cat.isActive
                  ? "border-border bg-card"
                  : "border-border/50 bg-card/50 opacity-60",
              )}
            >
              {/* Icon + color */}
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {cat.icon && <span className="text-lg flex-shrink-0">{cat.icon}</span>}
                <span
                  className="h-3 w-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: cat.color || "#888" }}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {cat.name}
                  </p>
                  {cat.description && (
                    <p className="text-xs text-foreground-muted truncate">
                      {cat.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Status badge */}
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                  cat.isActive
                    ? "bg-success/10 text-success"
                    : "bg-foreground-muted/10 text-foreground-muted",
                )}
              >
                {cat.isActive ? "Aktivní" : "Neaktivní"}
              </span>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleMove(cat.id, "up")}
                  disabled={idx === 0 || isPending}
                  className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-background-secondary transition-colors disabled:opacity-30"
                  title="Posunout nahoru"
                >
                  <ArrowUp weight="bold" className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleMove(cat.id, "down")}
                  disabled={idx === categories.length - 1 || isPending}
                  className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-background-secondary transition-colors disabled:opacity-30"
                  title="Posunout dolů"
                >
                  <ArrowDown weight="bold" className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleToggle(cat.id, cat.isActive)}
                  disabled={isPending}
                  className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-background-secondary transition-colors"
                  title={cat.isActive ? "Deaktivovat" : "Aktivovat"}
                >
                  {cat.isActive ? (
                    <EyeSlash className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </button>
                <button
                  onClick={() => openEdit(cat)}
                  disabled={isPending}
                  className="p-1.5 rounded-lg text-foreground-muted hover:text-accent hover:bg-accent/10 transition-colors"
                  title="Upravit"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() =>
                    setDeleteDialog({ open: true, id: cat.id, name: cat.name })
                  }
                  disabled={isPending}
                  className="p-1.5 rounded-lg text-foreground-muted hover:text-danger hover:bg-danger/10 transition-colors"
                  title="Smazat"
                >
                  <Trash className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, id: "", name: "" })}
        title="Smazat kategorii"
        description={`Opravdu chcete smazat kategorii "${deleteDialog.name}"? Tuto akci nelze vrátit.`}
        confirmLabel="Smazat"
        confirmVariant="danger"
        onConfirm={handleDelete}
        loading={isPending}
      />
    </div>
  );
}
