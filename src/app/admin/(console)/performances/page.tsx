"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Plus,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Edit2,
  Trash2,
  AlertTriangle,
  Music,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DepartmentChip } from "@/components/common/DepartmentChip";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useAppConfig, useDepartments, useCategories, useActiveEvent } from "@/hooks/useData";
import {
  getPerformances,
  createPerformance,
  updatePerformance,
  reorderPerformances,
  deletePerformance,
} from "@/lib/admin/performances";
import type { Performance } from "@/types/firestore";

type PerformanceWithId = Performance & { id: string };

interface SortableRowProps {
  perf: PerformanceWithId;
  index: number;
  total: number;
  deptName?: string;
  deptShort?: string;
  deptColor?: string;
  catName?: string;
  onEdit: (perf: PerformanceWithId) => void;
  onDelete: (perf: PerformanceWithId) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
}

function SortableRow({
  perf,
  index,
  total,
  deptName,
  deptShort,
  deptColor,
  catName,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: perf.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 sm:gap-4 p-3 rounded-xl border mb-2 bg-white shadow-xs transition-shadow hover:shadow-sm"
    >
      {/* Drag handle */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-grab active:cursor-grabbing focus:outline-hidden focus:ring-2 focus:ring-primary"
        aria-label={`Drag to reorder act ${perf.name}`}
      >
        <GripVertical className="h-5 w-5" />
      </button>

      {/* Up/Down buttons fallback */}
      <div className="flex flex-col gap-0.5">
        <button
          type="button"
          onClick={() => onMoveUp(index)}
          disabled={index === 0}
          className="p-0.5 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30"
          aria-label={`Move ${perf.name} up`}
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onMoveDown(index)}
          disabled={index === total - 1}
          className="p-0.5 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30"
          aria-label={`Move ${perf.name} down`}
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Order Badge */}
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold tabular-nums text-slate-700">
        {index + 1}
      </span>

      {/* Act Details */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold truncate text-slate-900">{perf.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-slate-500 truncate">{catName ?? "—"}</span>
          {deptName && deptColor && (
            <DepartmentChip
              name={deptName}
              shortName={deptShort}
              color={deptColor}
              className="scale-90 origin-left"
            />
          )}
        </div>
      </div>

      {/* Status Badge */}
      <Badge variant="outline" className="hidden sm:inline-flex capitalize">
        {perf.status}
      </Badge>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(perf)}
          className="h-8 w-8 p-0"
          title="Edit"
        >
          <Edit2 className="h-4 w-4" />
        </Button>
        {perf.status === "scheduled" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(perf)}
            className="h-8 w-8 p-0 hover:text-red-600"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

export default function PerformancesPage() {
  const { config } = useAppConfig();
  const { event } = useActiveEvent(config?.activeEventId);
  const { departments } = useDepartments();
  const { categories } = useCategories();

  const [performances, setPerformances] = useState<PerformanceWithId[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [deptFilter, setDeptFilter] = useState("all");
  const [catFilter, setCatFilter] = useState("all");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPerf, setEditingPerf] = useState<PerformanceWithId | null>(null);

  // Form state
  const [departmentId, setDepartmentId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete target
  const [deleteTarget, setDeleteTarget] = useState<PerformanceWithId | null>(null);

  const deptMap = useMemo(
    () => Object.fromEntries(departments.map((d) => [d.id, d])),
    [departments]
  );
  const catMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories]
  );

  const fetchPerfs = async () => {
    if (!config?.activeEventId) return;
    setLoading(true);
    try {
      const data = await getPerformances(config.activeEventId);
      setPerformances(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load performances");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (config?.activeEventId) {
      fetchPerfs();
    }
  }, [config?.activeEventId]);

  // Sensors for dnd-kit
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !config?.activeEventId) return;

    const oldIndex = performances.findIndex((p) => p.id === active.id);
    const newIndex = performances.findIndex((p) => p.id === over.id);

    const reordered = arrayMove(performances, oldIndex, newIndex);
    setPerformances(reordered);

    try {
      await reorderPerformances(
        config.activeEventId,
        reordered.map((p) => p.id)
      );
      toast.success("Lineup sequence updated");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save reordered lineup");
      fetchPerfs();
    }
  };

  const handleMove = async (index: number, direction: "up" | "down") => {
    if (!config?.activeEventId) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= performances.length) return;

    const reordered = arrayMove(performances, index, targetIndex);
    setPerformances(reordered);

    try {
      await reorderPerformances(
        config.activeEventId,
        reordered.map((p) => p.id)
      );
      toast.success("Lineup sequence updated");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save reordered lineup");
      fetchPerfs();
    }
  };

  const openCreateDialog = () => {
    setEditingPerf(null);
    setDepartmentId(departments[0]?.id ?? "");
    setCategoryId(categories[0]?.id ?? "");
    setName(categories[0]?.name ?? "");
    setDescription("");
    setDialogOpen(true);
  };

  const openEditDialog = (perf: PerformanceWithId) => {
    setEditingPerf(perf);
    setDepartmentId(perf.departmentId);
    setCategoryId(perf.categoryId);
    setName(perf.name);
    setDescription(perf.description || "");
    setDialogOpen(true);
  };

  // Warning when duplicate department + category
  const isDuplicateDeptCat = useMemo(() => {
    if (!departmentId || !categoryId) return false;
    return performances.some(
      (p) =>
        p.departmentId === departmentId &&
        p.categoryId === categoryId &&
        (!editingPerf || p.id !== editingPerf.id)
    );
  }, [departmentId, categoryId, performances, editingPerf]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config?.activeEventId) {
      toast.error("No active event selected");
      return;
    }
    if (!name.trim() || !departmentId || !categoryId) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSaving(true);
    try {
      if (editingPerf) {
        await updatePerformance(config.activeEventId, editingPerf.id, {
          departmentId,
          categoryId,
          name: name.trim(),
          description: description.trim() || null,
        });
        toast.success("Performance updated successfully");
      } else {
        await createPerformance(config.activeEventId, {
          departmentId,
          categoryId,
          name: name.trim(),
          description: description.trim() || null,
          order: performances.length,
        });
        toast.success("Performance added to lineup");
      }
      setDialogOpen(false);
      fetchPerfs();
    } catch (err: unknown) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to save performance");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || !config?.activeEventId) return;
    try {
      await deletePerformance(config.activeEventId, deleteTarget.id);
      toast.success("Performance removed from lineup");
      setDeleteTarget(null);
      fetchPerfs();
    } catch (err: unknown) {
      console.error(err);
      toast.error("Failed to delete performance");
    }
  };

  // Filtered list
  const filteredPerformances = useMemo(() => {
    return performances.filter((p) => {
      const matchDept = deptFilter === "all" || p.departmentId === deptFilter;
      const matchCat = catFilter === "all" || p.categoryId === catFilter;
      return matchDept && matchCat;
    });
  }, [performances, deptFilter, catFilter]);

  const isFiltered = deptFilter !== "all" || catFilter !== "all";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--ink)" }}>
            Lineup & Performances
          </h1>
          <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
            Order of performances for: <span className="font-semibold text-primary">{event?.name ?? "No event selected"}</span>
          </p>
        </div>
        <Button onClick={openCreateDialog} className="flex items-center gap-2">
          <Plus className="h-4 w-4" /> Add Performance
        </Button>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-slate-500 shrink-0">Filter Club:</Label>
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="h-8 text-xs w-40">
                <SelectValue placeholder="All Clubs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clubs</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Label className="text-xs text-slate-500 shrink-0">Filter Category:</Label>
            <Select value={catFilter} onValueChange={setCatFilter}>
              <SelectTrigger className="h-8 text-xs w-44">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isFiltered && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDeptFilter("all");
                setCatFilter("all");
              }}
              className="h-8 text-xs"
            >
              Reset Filters
            </Button>
          )}

          {isFiltered && (
            <span className="text-xs text-amber-600 font-medium ml-auto">
              Note: Reordering is disabled while filters are active.
            </span>
          )}
        </CardContent>
      </Card>

      {/* Lineup List */}
      <Card>
        <CardContent className="p-4">
          {loading ? (
            <p className="text-center py-8 text-sm text-slate-500">Loading performances…</p>
          ) : performances.length === 0 ? (
            <div className="text-center py-12">
              <Music className="h-10 w-10 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-700">No performances scheduled yet</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                Add performances for this event. You will be able to drag and reorder their sequence.
              </p>
              <Button onClick={openCreateDialog} size="sm">
                Add First Performance
              </Button>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={performances.map((p) => p.id)}
                strategy={verticalListSortingStrategy}
                disabled={isFiltered}
              >
                <div>
                  {filteredPerformances.map((perf, index) => {
                    const dept = deptMap[perf.departmentId];
                    const cat = catMap[perf.categoryId];
                    return (
                      <SortableRow
                        key={perf.id}
                        perf={perf}
                        index={index}
                        total={filteredPerformances.length}
                        deptName={dept?.name}
                        deptShort={dept?.shortName}
                        deptColor={dept?.color}
                        catName={cat?.name}
                        onEdit={openEditDialog}
                        onDelete={(p) => setDeleteTarget(p)}
                        onMoveUp={(i) => handleMove(i, "up")}
                        onMoveDown={(i) => handleMove(i, "down")}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>
                {editingPerf ? "Edit Performance" : "Add Performance"}
              </DialogTitle>
              <DialogDescription>
                {editingPerf
                  ? "Update performance information or department assignment."
                  : "Schedule a new act in the lineup. It will appear at the end."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="perf-dept">Participating Club / Department *</Label>
                <Select value={departmentId} onValueChange={setDepartmentId} required>
                  <SelectTrigger id="perf-dept">
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments
                      .filter((d) => d.isActive || d.id === departmentId)
                      .map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="perf-cat">Competition Category *</Label>
                <Select
                  value={categoryId}
                  onValueChange={(catId) => {
                    setCategoryId(catId);
                    if (!editingPerf) {
                      const selectedCat = catMap[catId];
                      if (selectedCat) setName(selectedCat.name);
                    }
                  }}
                  required
                >
                  <SelectTrigger id="perf-cat">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories
                      .filter((c) => c.isActive || c.id === categoryId)
                      .map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Duplicate warning */}
              {isDuplicateDeptCat && (
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                  <span>
                    Notice: This department already has another performance in this category. (Allowed, but verify if intended).
                  </span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="perf-name">Act / Performance Title *</Label>
                <Input
                  id="perf-name"
                  placeholder="e.g. Bharatanatyam Ensemble"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="perf-desc">Description (optional)</Label>
                <Textarea
                  id="perf-desc"
                  placeholder="Brief synopsis, song title, or act details"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : editingPerf ? "Save Changes" : "Add to Lineup"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Remove Performance?"
        description={`Are you sure you want to remove "${deleteTarget?.name}" from tonight's lineup? Only scheduled performances can be removed.`}
        confirmLabel="Remove Performance"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
