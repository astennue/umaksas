"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ClipboardCheck,
  Save,
  Loader2,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  GripVertical,
  AlertTriangle,
  Pencil,
  HelpCircle,
  CheckCircle2,
  XCircle,
  Percent,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useConfirm } from "@/hooks/use-confirm";
import { RoleGuard } from "@/components/auth/role-guard";

// ============================================
// Types
// ============================================

interface QuestionItem {
  id?: string;
  question: string;
  description: string;
  orderIndex: number;
  isActive: boolean;
  // Client-side tracking
  _isNew?: boolean;
  _isDeleted?: boolean;
}

interface CategoryItem {
  id?: string;
  name: string;
  description: string;
  weight: number;
  maxScore: number;
  orderIndex: number;
  isActive: boolean;
  questions: QuestionItem[];
  // Client-side tracking
  _isNew?: boolean;
  _isDeleted?: boolean;
  // UI state
  _expanded?: boolean;
}

// ============================================
// Loading Skeleton
// ============================================

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-52" />
          <Skeleton className="h-4 w-80" />
        </div>
      </div>
      <Skeleton className="h-12 w-full rounded-xl" />
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

// ============================================
// Empty State
// ============================================

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 mb-4">
          <ClipboardCheck className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
          No rubric categories yet
        </h3>
        <p className="mt-1 text-sm text-muted-foreground max-w-sm text-center">
          Create evaluation rubric categories with weighted scoring questions to define how student assistants are evaluated.
        </p>
        <Button
          onClick={onAdd}
          className="mt-4 gap-2 bg-[#003366] hover:bg-[#003366]/90 text-white"
        >
          <Plus className="h-4 w-4" />
          Add First Category
        </Button>
      </CardContent>
    </Card>
  );
}

// ============================================
// Weight Overview Bar
// ============================================

function WeightBar({ total, categories }: { total: number; categories: number }) {
  const isExact = Math.abs(total - 100) < 0.001;
  const isOver = total > 100;
  const isUnder = total < 100;

  return (
    <Card
      className={cn(
        "overflow-hidden border transition-colors",
        isExact
          ? "border-emerald-200 dark:border-emerald-800/50"
          : "border-red-200 dark:border-red-800/50"
      )}
    >
      <div
        className={cn(
          "h-1.5 transition-colors",
          isExact
            ? "bg-emerald-500"
            : "bg-red-500"
        )}
      />
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="flex items-center gap-2">
            {isExact ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            )}
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              Total Weight
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-2xl font-bold tabular-nums",
                isExact
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              )}
            >
              {total.toFixed(1)}%
            </span>
            <span className="text-sm text-muted-foreground">/ 100%</span>
          </div>
        </div>

        {/* Visual progress bar */}
        <div className="relative h-3 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300",
              isExact
                ? "bg-emerald-500"
                : isOver
                  ? "bg-red-500"
                  : "bg-amber-500"
            )}
            style={{
              width: `${Math.min(total, 100)}%`,
            }}
          />
          {isOver && (
            <div
              className="absolute top-0 left-full h-full w-2 bg-red-300 dark:bg-red-700 animate-pulse rounded-r-full"
              style={{
                width: `${Math.min(total - 100, 20)}%`,
              }}
            />
          )}
          {/* 100% marker */}
          <div className="absolute top-0 right-0 h-full w-px bg-gray-400 dark:bg-gray-600" />
        </div>

        {!isExact && (
          <div className="mt-2 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
            <p className="text-xs text-red-600 dark:text-red-400">
              {isOver
                ? `Total exceeds 100% by ${(total - 100).toFixed(1)}%. Please adjust category weights.`
                : `Total is ${(100 - total).toFixed(1)}% short of 100%. Add more weight to categories.`}
            </p>
          </div>
        )}

        <p className="mt-1.5 text-xs text-muted-foreground">
          {categories} {categories === 1 ? "category" : "categories"} configured
        </p>
      </CardContent>
    </Card>
  );
}

// ============================================
// Question Dialog (Add/Edit)
// ============================================

function QuestionDialog({
  open,
  onClose,
  onSave,
  initialQuestion,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (question: string, description: string) => void;
  initialQuestion?: QuestionItem | null;
}) {
  const [text, setText] = useState(() => initialQuestion?.question || "");
  const [desc, setDesc] = useState(() => initialQuestion?.description || "");

  const handleSave = () => {
    if (!text.trim()) {
      toast.error("Question text is required");
      return;
    }
    onSave(text.trim(), desc.trim());
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {initialQuestion ? "Edit Question" : "Add Question"}
          </DialogTitle>
          <DialogDescription>
            {initialQuestion
              ? "Modify the question text and description."
              : "Enter the evaluation question to add to this category."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="question-text" className="text-sm font-medium">
              Question Text <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="question-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g., The SA arrives on time for their scheduled shifts..."
              rows={3}
              className="resize-none"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="question-desc" className="text-sm font-medium">
              Description{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Textarea
              id="question-desc"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Additional context or guidance for this question..."
              rows={2}
              className="resize-none text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!text.trim()}
            className="bg-[#003366] hover:bg-[#003366]/90 text-white"
          >
            {initialQuestion ? "Update Question" : "Add Question"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// Category Card Component
// ============================================

const CATEGORY_COLORS = [
  { from: "from-[#003366] to-[#1e40af]", badge: "bg-[#003366]/10 text-[#003366] dark:bg-[#003366]/20 dark:text-blue-300" },
  { from: "from-emerald-600 to-emerald-500", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  { from: "from-amber-600 to-yellow-500", badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  { from: "from-purple-600 to-violet-500", badge: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  { from: "from-rose-600 to-pink-500", badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" },
  { from: "from-cyan-600 to-teal-500", badge: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400" },
];

function CategoryCard({
  category,
  index,
  isFirst,
  isLast,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onAddQuestion,
  onUpdateQuestion,
  onDeleteQuestion,
  onMoveQuestionUp,
  onMoveQuestionDown,
}: {
  category: CategoryItem;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onUpdate: (index: number, field: string, value: unknown) => void;
  onDelete: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onAddQuestion: (categoryIndex: number, question: string, description: string) => void;
  onUpdateQuestion: (categoryIndex: number, questionIndex: number, question: string, description: string) => void;
  onDeleteQuestion: (categoryIndex: number, questionIndex: number) => void;
  onMoveQuestionUp: (categoryIndex: number, questionIndex: number) => void;
  onMoveQuestionDown: (categoryIndex: number, questionIndex: number) => void;
}) {
  const [isEditing, setIsEditing] = useState(category._isNew || !category.id);
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionItem | null>(null);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState(-1);

  const colorSet = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
  const activeQuestions = category.questions.filter((q) => !q._isDeleted);

  const handleSaveEdit = () => {
    if (!category.name.trim()) {
      toast.error("Category name is required");
      return;
    }
    setIsEditing(false);
  };

  const handleOpenAddQuestion = () => {
    setEditingQuestion(null);
    setEditingQuestionIndex(-1);
    setQuestionDialogOpen(true);
  };

  const handleOpenEditQuestion = (qIndex: number) => {
    setEditingQuestion(activeQuestions[qIndex]);
    setEditingQuestionIndex(qIndex);
    setQuestionDialogOpen(true);
  };

  const handleSaveQuestion = (question: string, description: string) => {
    if (editingQuestionIndex >= 0) {
      onUpdateQuestion(index, editingQuestionIndex, question, description);
    } else {
      onAddQuestion(index, question, description);
    }
    setQuestionDialogOpen(false);
    setEditingQuestion(null);
    setEditingQuestionIndex(-1);
  };

  return (
    <Collapsible
      open={category._expanded}
      onOpenChange={(open) => onUpdate(index, "_expanded", open)}
    >
      <Card className="overflow-hidden border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
        {/* Accent bar */}
        <div className={cn("h-1.5 bg-gradient-to-r", colorSet.from)} />

        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 mt-0.5"
                >
                  <ChevronRight
                    className={cn(
                      "h-4 w-4 transition-transform",
                      category._expanded && "rotate-90"
                    )}
                  />
                </Button>
              </CollapsibleTrigger>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="font-mono text-xs shrink-0">
                    #{index + 1}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className={cn("text-xs shrink-0", colorSet.badge)}
                  >
                    <Percent className="mr-1 h-3 w-3" />
                    {category.weight}%
                  </Badge>
                  <Badge variant="secondary" className="text-xs shrink-0 bg-slate-100 dark:bg-slate-800">
                    <HelpCircle className="mr-1 h-3 w-3" />
                    {activeQuestions.length} {activeQuestions.length === 1 ? "question" : "questions"}
                  </Badge>
                  <Badge variant="secondary" className="text-xs shrink-0 bg-slate-100 dark:bg-slate-800">
                    Max: {category.maxScore}
                  </Badge>
                </div>

                {isEditing ? (
                  <div className="space-y-2 mt-2">
                    <Input
                      value={category.name}
                      onChange={(e) => onUpdate(index, "name", e.target.value)}
                      placeholder="Category name"
                      className="h-9"
                      autoFocus
                    />
                    <Textarea
                      value={category.description}
                      onChange={(e) => onUpdate(index, "description", e.target.value)}
                      placeholder="Category description (optional)"
                      rows={2}
                      className="resize-none text-sm"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">
                          Weight: {category.weight}%
                        </Label>
                        <Slider
                          value={[category.weight]}
                          onValueChange={([v]) => onUpdate(index, "weight", v)}
                          min={0}
                          max={100}
                          step={0.5}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`maxScore-${index}`} className="text-xs font-medium">
                          Max Score
                        </Label>
                        <Input
                          id={`maxScore-${index}`}
                          type="number"
                          min={1}
                          max={10}
                          value={category.maxScore}
                          onChange={(e) =>
                            onUpdate(index, "maxScore", Math.max(1, Math.min(10, parseInt(e.target.value) || 5)))
                          }
                          className="h-9"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Button size="sm" onClick={handleSaveEdit} className="h-7 gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Done
                      </Button>
                      {category.id && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setIsEditing(false)}
                          className="h-7 gap-1"
                        >
                          <XCircle className="h-3 w-3" />
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white leading-snug">
                      {category.name || "Untitled Category"}
                    </h3>
                    {category.description && (
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                        {category.description}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Action buttons - only show when not editing */}
            {!isEditing && (
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onMoveUp(index)}
                  disabled={isFirst}
                  title="Move category up"
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onMoveDown(index)}
                  disabled={isLast}
                  title="Move category down"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setIsEditing(true)}
                  title="Edit category"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => onDelete(index)}
                  title="Delete category"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>

        {/* Questions section */}
        <CollapsibleContent>
          <div className="border-t border-slate-100 dark:border-slate-800">
            <div className="px-6 py-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Questions
                </h4>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  onClick={handleOpenAddQuestion}
                >
                  <Plus className="h-3 w-3" />
                  Add Question
                </Button>
              </div>
            </div>

            {activeQuestions.length === 0 ? (
              <div className="px-6 pb-4">
                <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-700 py-6 flex flex-col items-center">
                  <HelpCircle className="h-6 w-6 text-muted-foreground mb-2" />
                  <p className="text-xs text-muted-foreground">
                    No questions yet. Add questions to define evaluation criteria.
                  </p>
                </div>
              </div>
            ) : (
              <div className="px-6 pb-4 space-y-2 max-h-96 overflow-y-auto">
                {activeQuestions.map((q, qIndex) => (
                  <div
                    key={q.id || `new-${qIndex}`}
                    className="group flex items-start gap-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-3 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800/50"
                  >
                    <div className="flex items-center gap-1 text-muted-foreground pt-0.5">
                      <GripVertical className="h-4 w-4" />
                      <Badge variant="outline" className="font-mono text-[10px] h-5 px-1.5">
                        {qIndex + 1}
                      </Badge>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 dark:text-white leading-snug">
                        {q.question}
                      </p>
                      {q.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {q.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => onMoveQuestionUp(index, qIndex)}
                        disabled={qIndex === 0}
                        title="Move question up"
                      >
                        <ChevronUp className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => onMoveQuestionDown(index, qIndex)}
                        disabled={qIndex === activeQuestions.length - 1}
                        title="Move question down"
                      >
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleOpenEditQuestion(qIndex)}
                        title="Edit question"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={() => onDeleteQuestion(index, qIndex)}
                        title="Delete question"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Card>

      {/* Question Dialog — key forces remount when initialQuestion changes */}
      {questionDialogOpen && (
        <QuestionDialog
          key={editingQuestion?.id ?? `add-${editingQuestionIndex}`}
          open={questionDialogOpen}
          onClose={() => {
            setQuestionDialogOpen(false);
            setEditingQuestion(null);
            setEditingQuestionIndex(-1);
          }}
          onSave={handleSaveQuestion}
          initialQuestion={editingQuestion}
        />
      )}
    </Collapsible>
  );
}

// ============================================
// Main Page Component
// ============================================

function EvaluationCMS() {
  const { confirm, ConfirmDialog } = useConfirm();

  // Data state
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [originalCategories, setOriginalCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/evaluation-rubric");
      if (!res.ok) throw new Error("Failed to fetch evaluation rubric");
      const data = await res.json();

      const mapped: CategoryItem[] = (data.categories || []).map(
        (c: Record<string, unknown>) => ({
          id: c.id as string,
          name: (c.name as string) || "",
          description: (c.description as string) || "",
          weight: (c.weight as number) ?? 25,
          maxScore: (c.maxScore as number) ?? 5,
          orderIndex: (c.orderIndex as number) ?? 0,
          isActive: (c.isActive as boolean) ?? true,
          questions: ((c.questions || []) as Record<string, unknown>[]).map(
            (q: Record<string, unknown>) => ({
              id: q.id as string,
              question: (q.question as string) || "",
              description: (q.description as string) || "",
              orderIndex: (q.orderIndex as number) ?? 0,
              isActive: (q.isActive as boolean) ?? true,
            })
          ),
          _expanded: false,
        })
      );

      setCategories(mapped);
      setOriginalCategories(JSON.parse(JSON.stringify(mapped)));
    } catch {
      toast.error("Failed to load evaluation rubric");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Computed
  const totalWeight = categories
    .filter((c) => !c._isDeleted)
    .reduce((sum, c) => sum + (c.weight || 0), 0);
  const weightIsValid = Math.abs(totalWeight - 100) < 0.001;

  // Check for unsaved changes — deep compare
  const hasChanges = (() => {
    if (categories.length !== originalCategories.length) return true;
    for (let i = 0; i < categories.length; i++) {
      const c = categories[i];
      const o = originalCategories[i];
      if (c._isNew !== o._isNew) return true;
      if (c._isDeleted !== o._isDeleted) return true;
      if (c.name !== o.name || c.description !== o.description) return true;
      if (c.weight !== o.weight || c.maxScore !== o.maxScore) return true;
      if (c.orderIndex !== o.orderIndex) return true;
      // Check questions
      const cQ = c.questions.filter((q) => !q._isDeleted);
      const oQ = o.questions.filter((q) => !q._isDeleted);
      if (cQ.length !== oQ.length) return true;
      for (let j = 0; j < cQ.length; j++) {
        if (cQ[j]._isNew) return true;
        if (cQ[j].question !== oQ[j]?.question || cQ[j].description !== oQ[j]?.description) return true;
        if (cQ[j].orderIndex !== oQ[j]?.orderIndex) return true;
      }
    }
    return false;
  })();

  // ========== Category Handlers ==========

  const handleUpdateCategory = (index: number, field: string, value: unknown) => {
    setCategories((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    );
  };

  const handleAddCategory = () => {
    const newCat: CategoryItem = {
      name: "",
      description: "",
      weight: Math.max(0, Math.round((100 - totalWeight) * 10) / 10),
      maxScore: 5,
      orderIndex: categories.length,
      isActive: true,
      questions: [],
      _isNew: true,
      _expanded: true,
    };
    setCategories((prev) => [...prev, newCat]);
    toast.success("New category added — fill in the details");
  };

  const handleDeleteCategory = async (index: number) => {
    const cat = categories[index];
    const catName = cat.name || `Category #${index + 1}`;
    const questionCount = cat.questions.filter((q) => !q._isDeleted).length;

    const confirmed = await confirm({
      title: "Delete Category",
      description: `Are you sure you want to delete "${catName}"?${questionCount > 0 ? ` This will also remove ${questionCount} question${questionCount !== 1 ? "s" : ""}.` : ""} This action cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "destructive",
    });

    if (!confirmed) return;

    if (cat._isNew) {
      // New unsaved category — just remove from state
      setCategories((prev) => prev.filter((_, i) => i !== index));
    } else {
      // Existing category — mark as deleted
      setCategories((prev) =>
        prev.map((c, i) => (i === index ? { ...c, _isDeleted: true } : c))
      );
    }
    toast.success(`"${catName}" deleted`);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setCategories((prev) => {
      const updated = [...prev];
      [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
      return updated.map((c, i) => ({ ...c, orderIndex: i }));
    });
  };

  const handleMoveDown = (index: number) => {
    if (index === categories.length - 1) return;
    setCategories((prev) => {
      const updated = [...prev];
      [updated[index + 1], updated[index]] = [updated[index], updated[index + 1]];
      return updated.map((c, i) => ({ ...c, orderIndex: i }));
    });
  };

  // ========== Question Handlers ==========

  const handleAddQuestion = (categoryIndex: number, question: string, description: string) => {
    const cat = categories[categoryIndex];
    const newQ: QuestionItem = {
      question,
      description,
      orderIndex: cat.questions.filter((q) => !q._isDeleted).length,
      isActive: true,
      _isNew: true,
    };
    setCategories((prev) =>
      prev.map((c, i) =>
        i === categoryIndex ? { ...c, questions: [...c.questions, newQ] } : c
      )
    );
    toast.success("Question added");
  };

  const handleUpdateQuestion = (
    categoryIndex: number,
    questionIndex: number,
    question: string,
    description: string
  ) => {
    setCategories((prev) =>
      prev.map((c, ci) => {
        if (ci !== categoryIndex) return c;
        const activeQuestions = c.questions.filter((q) => !q._isDeleted);
        const targetQ = activeQuestions[questionIndex];
        if (!targetQ) return c;
        const updatedQuestions = c.questions.map((q) =>
          q === targetQ ? { ...q, question, description } : q
        );
        return { ...c, questions: updatedQuestions };
      })
    );
    toast.success("Question updated");
  };

  const handleDeleteQuestion = async (categoryIndex: number, questionIndex: number) => {
    const cat = categories[categoryIndex];
    const activeQuestions = cat.questions.filter((q) => !q._isDeleted);
    const targetQ = activeQuestions[questionIndex];
    if (!targetQ) return;

    const confirmed = await confirm({
      title: "Delete Question",
      description: `Are you sure you want to delete "${targetQ.question.slice(0, 60)}${targetQ.question.length > 60 ? "..." : ""}"?`,
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "destructive",
    });

    if (!confirmed) return;

    if (targetQ._isNew) {
      // Remove from array
      setCategories((prev) =>
        prev.map((c, i) =>
          i === categoryIndex
            ? { ...c, questions: c.questions.filter((q) => q !== targetQ) }
            : c
        )
      );
    } else {
      // Mark as deleted
      setCategories((prev) =>
        prev.map((c, i) =>
          i === categoryIndex
            ? { ...c, questions: c.questions.map((q) => (q === targetQ ? { ...q, _isDeleted: true } : q)) }
            : c
        )
      );
    }
    toast.success("Question deleted");
  };

  const handleMoveQuestionUp = (categoryIndex: number, questionIndex: number) => {
    if (questionIndex === 0) return;
    setCategories((prev) =>
      prev.map((c, i) => {
        if (i !== categoryIndex) return c;
        const activeQuestions = c.questions.filter((q) => !q._isDeleted);
        const newActive = [...activeQuestions];
        [newActive[questionIndex - 1], newActive[questionIndex]] = [
          newActive[questionIndex],
          newActive[questionIndex - 1],
        ];
        // Rebuild questions array maintaining deleted items
        const newQuestions = newActive.map((q, idx) => ({ ...q, orderIndex: idx }));
        // Add back deleted items
        c.questions
          .filter((q) => q._isDeleted)
          .forEach((q) => newQuestions.push(q));
        return { ...c, questions: newQuestions };
      })
    );
  };

  const handleMoveQuestionDown = (categoryIndex: number, questionIndex: number) => {
    const cat = categories[categoryIndex];
    const activeQuestions = cat.questions.filter((q) => !q._isDeleted);
    if (questionIndex >= activeQuestions.length - 1) return;

    setCategories((prev) =>
      prev.map((c, i) => {
        if (i !== categoryIndex) return c;
        const active = c.questions.filter((q) => !q._isDeleted);
        const newActive = [...active];
        [newActive[questionIndex + 1], newActive[questionIndex]] = [
          newActive[questionIndex],
          newActive[questionIndex + 1],
        ];
        const newQuestions = newActive.map((q, idx) => ({ ...q, orderIndex: idx }));
        c.questions
          .filter((q) => q._isDeleted)
          .forEach((q) => newQuestions.push(q));
        return { ...c, questions: newQuestions };
      })
    );
  };

  // ========== Save ==========

  const handleSave = async () => {
    const activeCategories = categories.filter((c) => !c._isDeleted);

    // Validate
    const invalidCat = activeCategories.find((c) => !c.name.trim());
    if (invalidCat) {
      toast.error("All categories must have a name");
      return;
    }

    const emptyQuestionCat = activeCategories.find(
      (c) => c.questions.filter((q) => !q._isDeleted).length === 0
    );
    if (emptyQuestionCat && activeCategories.length > 0) {
      const confirmed = await confirm({
        title: "Category Without Questions",
        description: `"${emptyQuestionCat.name}" has no questions. Continue saving anyway?`,
        confirmText: "Save Anyway",
        cancelText: "Go Back",
      });
      if (!confirmed) return;
    }

    if (!weightIsValid) {
      toast.error("Total weight must equal 100% before saving");
      return;
    }

    const catCount = activeCategories.length;
    const questionCount = activeCategories.reduce(
      (sum, c) => sum + c.questions.filter((q) => !q._isDeleted).length,
      0
    );

    const confirmed = await confirm({
      title: "Save Evaluation Rubric",
      description: `Save ${catCount} ${catCount === 1 ? "category" : "categories"} with ${questionCount} total ${questionCount === 1 ? "question" : "questions"}?`,
      confirmText: "Save Changes",
      cancelText: "Cancel",
    });

    if (!confirmed) return;

    setSaving(true);
    try {
      let errorOccurred = false;

      // 1. Create new categories
      const newCategories = activeCategories.filter((c) => c._isNew);
      for (const cat of newCategories) {
        const res = await fetch("/api/evaluation-rubric/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: cat.name.trim(),
            description: cat.description.trim() || null,
            weight: cat.weight,
            maxScore: cat.maxScore,
            orderIndex: cat.orderIndex,
          }),
        });
        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error || "Failed to create category");
        }
        const created = await res.json();
        // Store created ID for questions
        cat.id = created.id;
        cat._isNew = false;
      }

      // 2. Update existing categories
      const existingCategories = activeCategories.filter((c) => !c._isNew && c.id);
      for (const cat of existingCategories) {
        const origCat = originalCategories.find((o) => o.id === cat.id);
        if (
          origCat &&
          (origCat.name !== cat.name ||
            origCat.description !== cat.description ||
            origCat.weight !== cat.weight ||
            origCat.maxScore !== cat.maxScore ||
            origCat.orderIndex !== cat.orderIndex)
        ) {
          const res = await fetch(`/api/evaluation-rubric/categories/${cat.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: cat.name.trim(),
              description: cat.description.trim() || null,
              weight: cat.weight,
              maxScore: cat.maxScore,
              orderIndex: cat.orderIndex,
            }),
          });
          if (!res.ok) {
            const json = await res.json();
            throw new Error(json.error || "Failed to update category");
          }
        }
      }

      // 3. Delete categories marked as deleted
      const deletedCategories = categories.filter((c) => c._isDeleted && c.id);
      for (const cat of deletedCategories) {
        const res = await fetch(`/api/evaluation-rubric/categories/${cat.id}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error || "Failed to delete category");
        }
      }

      // 4. Create new questions for each category
      for (const cat of activeCategories) {
        const newQuestions = cat.questions.filter((q) => q._isNew);
        for (const q of newQuestions) {
          if (!cat.id) continue;
          const res = await fetch(`/api/evaluation-rubric/categories/${cat.id}/questions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              question: q.question.trim(),
              description: q.description.trim() || null,
              orderIndex: q.orderIndex,
            }),
          });
          if (!res.ok) {
            const json = await res.json();
            throw new Error(json.error || "Failed to create question");
          }
          const created = await res.json();
          q.id = created.id;
          q._isNew = false;
        }

        // 5. Update existing questions
        const existingQuestions = cat.questions.filter((q) => !q._isNew && !q._isDeleted && q.id);
        for (const q of existingQuestions) {
          const res = await fetch(`/api/evaluation-rubric/questions/${q.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              question: q.question.trim(),
              description: q.description.trim() || null,
              orderIndex: q.orderIndex,
            }),
          });
          if (!res.ok) {
            const json = await res.json();
            throw new Error(json.error || "Failed to update question");
          }
        }

        // 6. Delete questions marked as deleted
        const deletedQuestions = cat.questions.filter((q) => q._isDeleted && q.id);
        for (const q of deletedQuestions) {
          const res = await fetch(`/api/evaluation-rubric/questions/${q.id}`, {
            method: "DELETE",
          });
          if (!res.ok) {
            const json = await res.json();
            throw new Error(json.error || "Failed to delete question");
          }
        }
      }

      if (!errorOccurred) {
        // Refresh data from server
        await fetchData();
        toast.success("Evaluation rubric saved successfully");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save changes"
      );
    } finally {
      setSaving(false);
    }
  };

  // Discard changes
  const handleDiscard = async () => {
    if (!hasChanges) return;

    const confirmed = await confirm({
      title: "Discard Changes?",
      description: "All unsaved changes will be lost. This cannot be undone.",
      confirmText: "Discard",
      cancelText: "Keep Editing",
      variant: "destructive",
    });

    if (!confirmed) return;

    setCategories(JSON.parse(JSON.stringify(originalCategories)));
    toast.info("Changes discarded");
  };

  // Expand/Collapse all
  const handleExpandAll = () => {
    setCategories((prev) => prev.map((c) => ({ ...c, _expanded: true })));
  };

  const handleCollapseAll = () => {
    setCategories((prev) => prev.map((c) => ({ ...c, _expanded: false })));
  };

  const activeCategories = categories.filter((c) => !c._isDeleted);

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      <ConfirmDialog />

      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
            <ClipboardCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Evaluation CMS
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage evaluation rubric categories and questions
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={handleExpandAll}
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            disabled={activeCategories.length === 0}
          >
            Expand All
          </Button>
          <Button
            onClick={handleCollapseAll}
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            disabled={activeCategories.length === 0}
          >
            Collapse All
          </Button>
          <Button
            onClick={handleAddCategory}
            variant="outline"
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Category
          </Button>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleDiscard}
              variant="outline"
              disabled={!hasChanges || saving}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Discard
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !hasChanges || !weightIsValid}
              className="bg-[#003366] hover:bg-[#003366]/90 text-white min-w-[140px]"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Unsaved changes indicator */}
      {hasChanges && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 px-4 py-2.5">
          <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            You have unsaved changes
          </p>
        </div>
      )}

      {/* Weight overview bar */}
      {activeCategories.length > 0 && (
        <WeightBar total={totalWeight} categories={activeCategories.length} />
      )}

      {/* Stats */}
      <div className="flex items-center gap-4 flex-wrap">
        <Badge variant="secondary" className="text-xs">
          {activeCategories.length} {activeCategories.length === 1 ? "category" : "categories"}
        </Badge>
        <Badge variant="secondary" className="text-xs">
          {activeCategories.reduce(
            (sum, c) => sum + c.questions.filter((q) => !q._isDeleted).length,
            0
          )}{" "}
          total questions
        </Badge>
        {!weightIsValid && (
          <Badge variant="secondary" className="text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
            <AlertTriangle className="mr-1 h-3 w-3" />
            Weight must equal 100% to save
          </Badge>
        )}
      </div>

      {/* Category cards */}
      {activeCategories.length === 0 ? (
        <EmptyState onAdd={handleAddCategory} />
      ) : (
        <div className="space-y-4">
          {activeCategories.map((cat, index) => (
            <CategoryCard
              key={cat.id || `new-${index}`}
              category={cat}
              index={index}
              isFirst={index === 0}
              isLast={index === activeCategories.length - 1}
              onUpdate={handleUpdateCategory}
              onDelete={handleDeleteCategory}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
              onAddQuestion={handleAddQuestion}
              onUpdateQuestion={handleUpdateQuestion}
              onDeleteQuestion={handleDeleteQuestion}
              onMoveQuestionUp={handleMoveQuestionUp}
              onMoveQuestionDown={handleMoveQuestionDown}
            />
          ))}
        </div>
      )}

      {/* Add Category (at bottom) */}
      {activeCategories.length > 0 && (
        <Button
          onClick={handleAddCategory}
          variant="outline"
          className="w-full gap-2 border-dashed py-6"
        >
          <Plus className="h-4 w-4" />
          Add New Category
        </Button>
      )}
    </div>
  );
}

// ============================================
// Page Export with RoleGuard
// ============================================

export default function EvaluationCMSPage() {
  return (
    <RoleGuard
      allowedRoles={["SUPER_ADMIN", "ADVISER", "OFFICER"]}
      presidentOnly
    >
      <EvaluationCMS />
    </RoleGuard>
  );
}
