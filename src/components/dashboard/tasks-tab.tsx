"use client";

import * as React from "react";
import {
  ListTodo,
  CheckCircle2,
  RefreshCcw,
  Plus,
  Trash2,
  UserPlus,
  Timer,
  Calendar,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { AdminTask } from "@/lib/data";
import { cn } from "@/lib/utils";

const TEAM = ["Marcus", "Dana", "Vince", "Priya"];

interface TasksTabProps {
  tasks: AdminTask[];
  onAssign: (id: string, assignee: string | null) => void;
  onComplete: (id: string) => void;
  onReopen: (id: string) => void;
  onRemove: (id: string) => void;
  onSetHours: (id: string, hours: number) => void;
  onAddTask: (task: {
    client: string;
    service: string;
    due: string;
    priority: AdminTask["priority"];
    hours: string;
  }) => void;
}

export function TasksTab({
  tasks,
  onAssign,
  onComplete,
  onReopen,
  onRemove,
  onSetHours,
  onAddTask,
}: TasksTabProps) {
  const [filter, setFilter] = React.useState<"all" | "queued" | "in_progress" | "completed">("all");
  const [newTask, setNewTask] = React.useState<{
    client: string;
    service: string;
    due: string;
    priority: AdminTask["priority"];
    hours: string;
  }>({ client: "", service: "", due: "", priority: "medium", hours: "" });

  const filteredTasks = tasks.filter((t) => {
    if (filter === "completed") return t.status === "completed";
    if (filter === "in_progress") return t.status === "in_progress" || t.status === "review";
    if (filter === "queued") return t.status === "queued";
    return true;
  });

  const taskInputCls =
    "rounded-xl border border-white/10 bg-ink-800 px-3.5 py-2.5 text-xs font-medium text-white outline-none transition focus:border-brand-400/60";

  return (
    <Card className="p-6 sm:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 font-display text-lg font-bold text-white">
            <ListTodo className="h-5 w-5 text-brand-400" /> Fulfillment Task Board
          </h3>
          <p className="mt-1 text-xs text-fog">
            Assign tasks to the team · track estimated hours · recurring Stripe billing auto-syncs
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="brand" className="px-3 py-1.5 text-xs">
            <UserPlus className="mr-1.5 h-3.5 w-3.5" />{" "}
            {tasks.filter((t) => t.assignee).length}/{tasks.length} assigned
          </Badge>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 flex flex-wrap gap-2 border-b border-white/10 pb-4">
        {(["all", "queued", "in_progress", "completed"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={cn(
              "rounded-xl px-4 py-2 text-xs font-semibold capitalize transition",
              filter === tab
                ? "bg-brand-500/20 border border-brand-400/50 text-white"
                : "border border-white/5 bg-ink-850/60 text-fog hover:text-white",
            )}
          >
            {tab.replace("_", " ")} ({tasks.filter((t) => {
              if (tab === "completed") return t.status === "completed";
              if (tab === "in_progress") return t.status === "in_progress" || t.status === "review";
              if (tab === "queued") return t.status === "queued";
              return true;
            }).length})
          </button>
        ))}
      </div>

      {/* New Task Creation Bar */}
      <div className="mb-6 grid gap-3 rounded-2xl border border-white/10 bg-ink-850/60 p-4 sm:grid-cols-[1fr_1fr_auto_auto_auto_auto]">
        <input
          value={newTask.client}
          onChange={(e) => setNewTask({ ...newTask, client: e.target.value })}
          placeholder="Client name (e.g. Ace Plumbing)"
          className={taskInputCls}
        />
        <input
          value={newTask.service}
          onChange={(e) => setNewTask({ ...newTask, service: e.target.value })}
          placeholder="Service / module (e.g. GBP Optimization)"
          className={taskInputCls}
        />
        <input
          type="date"
          value={newTask.due}
          onChange={(e) => setNewTask({ ...newTask, due: e.target.value })}
          className={cn(taskInputCls, "sm:w-40")}
        />
        <input
          value={newTask.hours}
          onChange={(e) => setNewTask({ ...newTask, hours: e.target.value.replace(/[^0-9.]/g, "") })}
          placeholder="Est hrs"
          inputMode="decimal"
          className={cn(taskInputCls, "sm:w-24")}
        />
        <select
          value={newTask.priority}
          onChange={(e) =>
            setNewTask({
              ...newTask,
              priority: e.target.value as AdminTask["priority"],
            })
          }
          className={cn(taskInputCls, "sm:w-32")}
        >
          <option value="high">High Priority</option>
          <option value="medium">Medium Priority</option>
          <option value="low">Low Priority</option>
        </select>
        <button
          onClick={() => {
            if (!newTask.service.trim()) return;
            onAddTask(newTask);
            setNewTask({ client: "", service: "", due: "", priority: "medium", hours: "" });
          }}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-brand-600 shadow-lg shadow-brand-500/20"
        >
          <Plus className="h-4 w-4" /> Add Task
        </button>
      </div>

      {/* Task Cards / List */}
      <div className="space-y-3">
        {filteredTasks.map((t) => {
          const prioStyle =
            t.priority === "high"
              ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
              : t.priority === "medium"
                ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                : "border-white/10 bg-white/5 text-fog";
          const done = t.status === "completed";

          return (
            <div
              key={t.id}
              className={cn(
                "flex flex-col gap-3 rounded-2xl border border-white/10 bg-ink-850/80 p-4 transition sm:flex-row sm:items-center sm:justify-between sm:p-5",
                done && "opacity-75 bg-ink-900/40",
              )}
            >
              <div className="flex items-start gap-3 sm:items-center">
                <span className="mt-0.5 rounded-lg border border-white/10 bg-ink-900 px-2.5 py-1 font-mono text-xs text-mute">
                  {t.id}
                </span>
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-white truncate">{t.service}</h4>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-fog">
                    <span className="font-medium text-mist">Client: {t.client || "Unassigned client"}</span>
                    <span className="flex items-center gap-1 text-mute">
                      <Calendar className="h-3 w-3" /> Due {t.due || "No due date"}
                    </span>
                    {done && t.completedAt && (
                      <span className="text-glow-400">
                        · Done {new Date(t.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 sm:shrink-0">
                <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-ink-900 px-2.5 py-1">
                  <Timer className="h-3.5 w-3.5 text-brand-400" />
                  <input
                    value={t.estimatedHours ? String(t.estimatedHours) : ""}
                    onChange={(e) =>
                      onSetHours(t.id, Number(e.target.value.replace(/[^0-9.]/g, "")) || 0)
                    }
                    placeholder="0"
                    inputMode="decimal"
                    title="Estimated hours"
                    className="w-12 bg-transparent text-center text-xs font-semibold text-white outline-none"
                  />
                  <span className="text-[11px] text-mute">hrs</span>
                </div>

                <span className={cn("rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wider", prioStyle)}>
                  {t.priority}
                </span>

                {done ? (
                  <>
                    <Badge variant="emerald" className="px-3 py-1">
                      <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Completed
                    </Badge>
                    <button
                      onClick={() => onReopen(t.id)}
                      title="Reopen task"
                      className="rounded-xl border border-white/10 bg-ink-900 p-2 text-mute transition hover:border-white/25 hover:text-white"
                    >
                      <RefreshCcw className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <select
                      value={t.assignee ?? ""}
                      onChange={(e) => onAssign(t.id, e.target.value || null)}
                      className={cn(
                        "rounded-xl border border-white/10 bg-ink-900 px-3 py-2 text-xs font-semibold text-white outline-none transition focus:border-brand-400/60",
                        t.assignee ? "border-glow-500/40 text-glow-300" : "text-fog",
                      )}
                    >
                      <option value="">Unassigned</option>
                      {TEAM.map((m) => (
                        <option key={m} value={m}>
                          Assign to {m}
                        </option>
                      ))}
                    </select>

                    {t.assignee && (
                      <button
                        onClick={() => onComplete(t.id)}
                        className="flex items-center gap-1.5 rounded-xl border border-glow-500/40 bg-glow-500/15 px-3.5 py-2 text-xs font-semibold text-glow-300 transition hover:bg-glow-500/25"
                      >
                        <CheckCircle2 className="h-4 w-4" /> Mark Done
                      </button>
                    )}
                  </>
                )}

                <button
                  onClick={() => onRemove(t.id)}
                  title="Remove task"
                  className="rounded-xl border border-white/5 bg-ink-900 p-2 text-mute transition hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-300"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}

        {filteredTasks.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/15 p-12 text-center text-sm text-fog">
            No fulfillment tasks found in this view. Add a task above or sync orders from Stripe checkout.
          </div>
        )}
      </div>
    </Card>
  );
};
