"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Edit2, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { slugify } from "@/lib/utils";
import {
  getCategories,
  createCategory,
  updateCategory,
  archiveCategory,
} from "@/lib/admin/categories";
import type { Category } from "@/types/firestore";

type CategoryWithId = Category & { id: string };

export default function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryWithId[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<CategoryWithId | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [order, setOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [includeInOverall, setIncludeInOverall] = useState(true);
  const [overallWeight, setOverallWeight] = useState(1);
  const [saving, setSaving] = useState(false);

  // Archive confirmation
  const [archiveTarget, setArchiveTarget] = useState<CategoryWithId | null>(null);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openCreateDialog = () => {
    setEditingCat(null);
    setName("");
    setSlug("");
    setDescription("");
    setOrder(categories.length);
    setIsActive(true);
    setIncludeInOverall(true);
    setOverallWeight(1);
    setDialogOpen(true);
  };

  const openEditDialog = (cat: CategoryWithId) => {
    setEditingCat(cat);
    setName(cat.name);
    setSlug(cat.slug);
    setDescription(cat.description || "");
    setOrder(cat.order);
    setIsActive(cat.isActive);
    setIncludeInOverall(cat.includeInOverall);
    setOverallWeight(cat.overallWeight);
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) {
      toast.error("Please provide category name and URL slug");
      return;
    }
    if (!/^[a-z0-9-]{2,60}$/.test(slug)) {
      toast.error("Slug must be 2-60 lowercase alphanumeric characters or hyphens");
      return;
    }

    setSaving(true);
    try {
      if (editingCat) {
        await updateCategory(editingCat.id, {
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim(),
          order: Number(order),
          isActive,
          includeInOverall,
          overallWeight: Number(overallWeight),
        });
        toast.success("Category updated successfully");
      } else {
        await createCategory({
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim(),
          order: Number(order),
          isActive,
          includeInOverall,
          overallWeight: Number(overallWeight),
        });
        toast.success("Category created successfully");
      }
      setDialogOpen(false);
      fetchCategories();
    } catch (err: unknown) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to save category");
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!archiveTarget) return;
    try {
      await archiveCategory(archiveTarget.id);
      toast.success(`${archiveTarget.name} has been archived`);
      setArchiveTarget(null);
      fetchCategories();
    } catch (err: unknown) {
      console.error(err);
      toast.error("Failed to archive category");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--ink)" }}>
            Competition Categories
          </h1>
          <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
            Contest categories (e.g., Western Dance, Solo Vocals, Street Play)
          </p>
        </div>
        <Button onClick={openCreateDialog} className="flex items-center gap-2">
          <Plus className="h-4 w-4" /> Add Category
        </Button>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Order</TableHead>
                <TableHead>Category Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Overall Leaderboard</TableHead>
                <TableHead>Weight</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-sm" style={{ color: "var(--ink-muted)" }}>
                    Loading categories…
                  </TableCell>
                </TableRow>
              ) : categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-sm" style={{ color: "var(--ink-muted)" }}>
                    No categories created yet. Click &quot;Add Category&quot; above to create one.
                  </TableCell>
                </TableRow>
              ) : (
                categories.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell className="font-mono text-xs tabular-nums">{cat.order}</TableCell>
                    <TableCell>
                      <div>
                        <span className="font-semibold" style={{ color: "var(--ink)" }}>
                          {cat.name}
                        </span>
                        {cat.description && (
                          <p className="text-xs truncate max-w-xs" style={{ color: "var(--ink-muted)" }}>
                            {cat.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs" style={{ color: "var(--ink-muted)" }}>
                      {cat.slug}
                    </TableCell>
                    <TableCell>
                      <Badge variant={cat.includeInOverall ? "default" : "secondary"}>
                        {cat.includeInOverall ? "Included" : "Excluded"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs tabular-nums">
                      {cat.overallWeight}x
                    </TableCell>
                    <TableCell>
                      <Badge variant={cat.isActive ? "default" : "secondary"}>
                        {cat.isActive ? "Active" : "Archived"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(cat)}
                          className="h-8 w-8 p-0"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        {cat.isActive && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setArchiveTarget(cat)}
                            className="h-8 w-8 p-0 hover:text-red-600"
                            title="Archive"
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                        )}
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
              <DialogTitle>{editingCat ? "Edit Category" : "Add Category"}</DialogTitle>
              <DialogDescription>
                {editingCat
                  ? "Update category rules, slug, or overall leaderboard weight."
                  : "Add a new competitive category for the festival."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="cat-name">Category Name *</Label>
                <Input
                  id="cat-name"
                  placeholder="e.g. Classical Dance"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!editingCat && !slug) {
                      setSlug(slugify(e.target.value));
                    }
                  }}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cat-slug">URL Slug *</Label>
                <Input
                  id="cat-slug"
                  placeholder="e.g. classical-dance"
                  value={slug}
                  onChange={(e) => setSlug(slugify(e.target.value))}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cat-desc">Description (optional)</Label>
                <Textarea
                  id="cat-desc"
                  placeholder="Short guidelines or context for voters"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="cat-order">Sequence Order</Label>
                  <Input
                    id="cat-order"
                    type="number"
                    min={0}
                    value={order}
                    onChange={(e) => setOrder(parseInt(e.target.value) || 0)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cat-weight">Overall Weight (0–10)</Label>
                  <Input
                    id="cat-weight"
                    type="number"
                    min={0}
                    max={10}
                    step={0.5}
                    value={overallWeight}
                    onChange={(e) => setOverallWeight(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="cat-overall">Include in Overall Trophy</Label>
                    <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
                      Counts toward overall department championship
                    </p>
                  </div>
                  <Switch
                    id="cat-overall"
                    checked={includeInOverall}
                    onCheckedChange={setIncludeInOverall}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="cat-active">Category Active</Label>
                    <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
                      Can accept new performances
                    </p>
                  </div>
                  <Switch
                    id="cat-active"
                    checked={isActive}
                    onCheckedChange={setIsActive}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : editingCat ? "Save Changes" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Archive confirmation dialog */}
      <ConfirmDialog
        open={!!archiveTarget}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
        title="Archive Category?"
        description={`Are you sure you want to archive "${archiveTarget?.name}"? Existing performances and votes will be preserved, but no new performances can be scheduled in it.`}
        confirmLabel="Archive Category"
        onConfirm={handleArchive}
      />
    </div>
  );
}
