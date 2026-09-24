"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DepartmentChip } from "@/components/common/DepartmentChip";
import { DEPARTMENT_SWATCHES } from "@/config/constants";
import {
  getDepartments,
  createDepartment,
  updateDepartment,
  archiveDepartment,
  deleteDepartment,
} from "@/lib/admin/departments";
import type { Department } from "@/types/firestore";

type DepartmentWithId = Department & { id: string };

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<DepartmentWithId[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentWithId | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [color, setColor] = useState("#3B4CCA");
  const [order, setOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // Archive and Delete confirmation
  const [archiveTarget, setArchiveTarget] = useState<DepartmentWithId | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DepartmentWithId | null>(null);

  const fetchDepts = async () => {
    setLoading(true);
    try {
      const data = await getDepartments();
      setDepartments(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load departments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepts();
  }, []);

  const openCreateDialog = () => {
    setEditingDept(null);
    setName("");
    setShortName("");
    setColor("#3B4CCA");
    setOrder(departments.length);
    setIsActive(true);
    setDialogOpen(true);
  };

  const openEditDialog = (dept: DepartmentWithId) => {
    setEditingDept(dept);
    setName(dept.name);
    setShortName(dept.shortName);
    setColor(dept.color);
    setOrder(dept.order);
    setIsActive(dept.isActive);
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !shortName.trim()) {
      toast.error("Please fill in department name and short name");
      return;
    }
    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
      toast.error("Please enter a valid hex color like #3B4CCA");
      return;
    }

    setSaving(true);
    try {
      if (editingDept) {
        await updateDepartment(editingDept.id, {
          name: name.trim(),
          shortName: shortName.trim().slice(0, 12),
          color,
          order: Number(order),
          isActive,
        });
        toast.success("Department updated successfully");
      } else {
        await createDepartment({
          name: name.trim(),
          shortName: shortName.trim().slice(0, 12),
          color,
          order: Number(order),
          isActive,
        });
        toast.success("Department created successfully");
      }
      setDialogOpen(false);
      fetchDepts();
    } catch (err: unknown) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to save department");
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!archiveTarget) return;
    try {
      await archiveDepartment(archiveTarget.id);
      toast.success(`${archiveTarget.name} has been archived`);
      setArchiveTarget(null);
      fetchDepts();
    } catch (err: unknown) {
      console.error(err);
      toast.error("Failed to archive department");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDepartment(deleteTarget.id);
      toast.success(`${deleteTarget.name} has been deleted`);
      setDeleteTarget(null);
      fetchDepts();
    } catch (err: unknown) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to delete department");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl tracking-wide uppercase text-[#2C1B6B]">
            Departments & Clubs
          </h1>
          <p className="text-xs sm:text-sm text-[#5B5470]">
            Global list of participating college departments and clubs
          </p>
        </div>
        <Button onClick={openCreateDialog} className="flex items-center gap-2 font-bold cursor-pointer">
          <i className="bi bi-plus-lg text-sm" /> Add Department
        </Button>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Order</TableHead>
                <TableHead>Department Name</TableHead>
                <TableHead>Short Name / Chip</TableHead>
                <TableHead>Color</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-sm" style={{ color: "var(--ink-muted)" }}>
                    Loading departments…
                  </TableCell>
                </TableRow>
              ) : departments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-sm" style={{ color: "var(--ink-muted)" }}>
                    No departments added yet. Click &quot;Add Department&quot; above to create one.
                  </TableCell>
                </TableRow>
              ) : (
                departments.map((dept) => (
                  <TableRow key={dept.id}>
                    <TableCell className="font-mono text-xs tabular-nums">{dept.order}</TableCell>
                    <TableCell className="font-semibold" style={{ color: "var(--ink)" }}>
                      {dept.name}
                    </TableCell>
                    <TableCell>
                      <DepartmentChip name={dept.name} shortName={dept.shortName} color={dept.color} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span
                          className="h-4 w-4 rounded-full border shadow-xs"
                          style={{ backgroundColor: dept.color }}
                        />
                        <span className="font-mono text-xs uppercase" style={{ color: "var(--ink-muted)" }}>
                          {dept.color}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={dept.isActive ? "default" : "secondary"}>
                        {dept.isActive ? "Active" : "Archived"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(dept)}
                          className="h-8 w-8 p-0 text-slate-500 hover:text-slate-800"
                          title="Edit"
                        >
                          <i className="bi bi-pencil text-sm" />
                        </Button>
                        {dept.isActive && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setArchiveTarget(dept)}
                            className="h-8 w-8 p-0 text-slate-400 hover:text-amber-600"
                            title="Archive"
                          >
                            <i className="bi bi-archive text-sm" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteTarget(dept)}
                          className="h-8 w-8 p-0 text-slate-400 hover:text-red-600"
                          title="Delete Department"
                        >
                          <i className="bi bi-trash3 text-sm" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>{editingDept ? "Edit Department" : "Add Department"}</DialogTitle>
              <DialogDescription>
                {editingDept
                  ? "Update department name, short name, or branding color."
                  : "Add a new participating club or department."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="dept-name">Department / Club Name *</Label>
                <Input
                  id="dept-name"
                  placeholder="e.g. Dance Club"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!editingDept && !shortName) {
                      setShortName(e.target.value.slice(0, 10));
                    }
                  }}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dept-short">Short Name (chip display, max 12 chars) *</Label>
                <Input
                  id="dept-short"
                  placeholder="e.g. Dance"
                  maxLength={12}
                  value={shortName}
                  onChange={(e) => setShortName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Bar Chart Color *</Label>
                  <span className="text-[11px] text-purple-700 font-bold">Used for Auditorium Projector Bar Chart</span>
                </div>
                <p className="text-xs text-slate-500">
                  Select the color representing this department&apos;s vertical bar and title on the live results screen.
                </p>
                <div className="flex flex-wrap gap-2 my-2">
                  {DEPARTMENT_SWATCHES.map((swatch) => (
                    <button
                      key={swatch.hex}
                      type="button"
                      onClick={() => setColor(swatch.hex)}
                      className={`h-7 w-7 rounded-full border-2 transition-all flex items-center justify-center ${
                        color.toUpperCase() === swatch.hex.toUpperCase()
                          ? "ring-2 ring-offset-2 ring-purple-600 scale-110"
                          : "opacity-80 hover:opacity-100"
                      }`}
                      style={{ backgroundColor: swatch.hex }}
                      title={swatch.label}
                    >
                      {color.toUpperCase() === swatch.hex.toUpperCase() && (
                        <i className="bi bi-check-lg text-white font-bold text-xs" />
                      )}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2.5">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-9 w-12 cursor-pointer rounded-lg border border-slate-300 bg-transparent p-1 shadow-xs"
                    title="Click to choose custom bar chart color"
                  />
                  <Input
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="#3B4CCA"
                    maxLength={7}
                    className="font-mono uppercase text-sm w-32"
                  />
                  <div className="flex items-center gap-2 text-xs" style={{ color: "var(--ink-muted)" }}>
                    <span>Projector Preview:</span>
                    <DepartmentChip
                      name={name || "Preview"}
                      shortName={shortName || "Preview"}
                      color={color}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="dept-order">Display Order</Label>
                  <Input
                    id="dept-order"
                    type="number"
                    min={0}
                    value={order}
                    onChange={(e) => setOrder(parseInt(e.target.value) || 0)}
                  />
                </div>

                <div className="flex flex-col justify-end space-y-1.5">
                  <div className="flex items-center gap-2 h-10">
                    <Switch
                      id="dept-active"
                      checked={isActive}
                      onCheckedChange={setIsActive}
                    />
                    <Label htmlFor="dept-active">Active</Label>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : editingDept ? "Save Changes" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Archive confirmation dialog */}
      <ConfirmDialog
        open={!!archiveTarget}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
        title="Archive Department?"
        description={`Are you sure you want to archive "${archiveTarget?.name}"? Its performances and student registrations will remain intact, but it will be hidden from new registrations.`}
        confirmLabel="Archive Department"
        onConfirm={handleArchive}
      />

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Department?"
        description={`Are you sure you want to permanently delete "${deleteTarget?.name}"? This department will be permanently removed from the system.`}
        confirmLabel="Delete Department"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
