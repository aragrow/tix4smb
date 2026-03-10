import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/api/client';
import type { TicketTask, TaskStatus, TicketStatus, JobberEntityType } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { JobberEntityPicker } from '@/components/JobberEntityPicker';
import {
  Trash2, Plus, Bot, StickyNote, Check, X,
  CheckCircle2, Clock, Bell, FileText,
} from 'lucide-react';
import { BulkMessageModal } from '@/components/BulkMessageModal';

interface TaskListProps {
  ticketId: string;
  ticketStatus: TicketStatus;
  agentRunning?: boolean;
}

type TaskBulkAction = 'delete' | 'status' | 'notify' | 'rfp';

const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  done: 'Done',
};

const STATUS_CLASSES: Record<TaskStatus, string> = {
  pending: 'bg-muted text-muted-foreground',
  in_progress: 'bg-primary/20 text-primary',
  done: 'bg-green-500/20 text-green-600 dark:text-green-400',
};

function TaskItem({
  task,
  ticketId,
  editable,
  selected,
  onSelect,
}: {
  task: TicketTask;
  ticketId: string;
  editable: boolean;
  selected: boolean;
  onSelect: (checked: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');

  const update = useMutation({
    mutationFn: (patch: object) =>
      api.patch(`/api/tickets/${ticketId}/tasks/${task._id}`, patch).then((r) => r.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks', ticketId] });
      setEditingNotes(false);
    },
  });

  const deleteTask = useMutation({
    mutationFn: () => api.delete(`/api/tickets/${ticketId}/tasks/${task._id}`),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['tasks', ticketId] }),
  });

  const startEditNotes = () => {
    setNotesDraft(task.notes ?? '');
    setEditingNotes(true);
  };

  return (
    <div
      className={`rounded-lg border bg-card px-4 py-3 space-y-2 transition-colors ${
        selected ? 'border-primary/40 bg-primary/5' : ''
      } ${task.status === 'done' ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <div className="flex items-center pt-0.5 shrink-0">
          <input
            type="checkbox"
            className="h-3.5 w-3.5 rounded accent-primary cursor-pointer"
            checked={selected}
            onChange={(e) => onSelect(e.target.checked)}
          />
        </div>

        {/* Description */}
        <div className="flex-1 min-w-0 space-y-0.5">
          <p className={`text-sm ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
            {task.description}
          </p>
          {task.jobber_entity_label && (
            <p className="text-xs text-muted-foreground">
              <span className="capitalize">{task.jobber_entity_type}</span>: {task.jobber_entity_label}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {task.agent_generated && (
            <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5">
              <Bot className="h-3 w-3" />
              AI
            </span>
          )}
          <Select
            value={task.status}
            onValueChange={(v) => update.mutate({ status: v as TaskStatus })}
            disabled={!editable}
          >
            <SelectTrigger className={`h-6 w-auto gap-1 border-0 px-2 text-xs font-medium ${STATUS_CLASSES[task.status]}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
          {editable && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              title="Add/edit notes"
              onClick={startEditNotes}
            >
              <StickyNote className="h-3 w-3" />
            </Button>
          )}
          {editable && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive hover:text-destructive"
              onClick={() => {
                if (confirm('Delete this task?')) deleteTask.mutate();
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Task notes */}
      {editingNotes ? (
        <div className="space-y-1.5 pt-1 pl-6">
          <Textarea
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            rows={3}
            autoFocus
            placeholder="Add notes for this task..."
            className="text-xs"
          />
          <div className="flex gap-1.5">
            <Button
              size="sm"
              className="h-6 text-xs px-2"
              onClick={() => update.mutate({ notes: notesDraft })}
              disabled={update.isPending}
            >
              <Check className="h-3 w-3 mr-1" />
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-xs px-2"
              onClick={() => setEditingNotes(false)}
            >
              <X className="h-3 w-3 mr-1" />
              Cancel
            </Button>
          </div>
        </div>
      ) : task.notes ? (
        <p
          className="text-xs text-muted-foreground whitespace-pre-wrap border-t pt-2 pl-6 cursor-pointer hover:text-foreground"
          onClick={editable ? startEditNotes : undefined}
        >
          {task.notes}
        </p>
      ) : null}
    </div>
  );
}

export function TaskList({ ticketId, ticketStatus, agentRunning }: TaskListProps) {
  const [showForm, setShowForm] = useState(false);
  const [description, setDescription] = useState('');
  const [entityType, setEntityType] = useState<JobberEntityType | ''>('');
  const [entityId, setEntityId] = useState('');
  const [entityLabel, setEntityLabel] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [modalType, setModalType] = useState<'notify' | 'rfp' | null>(null);
  const queryClient = useQueryClient();
  const editable = ticketStatus !== 'closed';

  const { data: tasks = [], isLoading } = useQuery<TicketTask[]>({
    queryKey: ['tasks', ticketId],
    queryFn: () => api.get<TicketTask[]>(`/api/tickets/${ticketId}/tasks`).then((r) => r.data),
    refetchInterval: agentRunning ? 2000 : false,
  });

  const addTask = useMutation({
    mutationFn: (payload: object) =>
      api.post<TicketTask>(`/api/tickets/${ticketId}/tasks`, payload).then((r) => r.data),
    onSuccess: () => {
      setDescription('');
      setEntityType('');
      setEntityId('');
      setEntityLabel('');
      setShowForm(false);
      void queryClient.invalidateQueries({ queryKey: ['tasks', ticketId] });
    },
  });

  const bulk = useMutation({
    mutationFn: (payload: { action: TaskBulkAction; status?: TaskStatus; message?: string }) =>
      api.post(`/api/tickets/${ticketId}/tasks/bulk`, {
        ids: [...selectedIds],
        ...payload,
      }).then((r) => r.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks', ticketId] });
      void queryClient.invalidateQueries({ queryKey: ['notes', ticketId] });
      setSelectedIds(new Set());
      setModalType(null);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    addTask.mutate({
      description: description.trim(),
      jobber_entity_type: entityType || undefined,
      jobber_entity_id: entityId || undefined,
      jobber_entity_label: entityLabel || undefined,
    });
  };

  const toggleOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const allSelected = tasks.length > 0 && tasks.every((t) => selectedIds.has(t._id));
  const toggleAll = (checked: boolean) => {
    if (checked) setSelectedIds(new Set(tasks.map((t) => t._id)));
    else setSelectedIds(new Set());
  };

  const someSelected = selectedIds.size > 0;
  const pending = tasks.filter((t) => t.status === 'pending').length;
  const done = tasks.filter((t) => t.status === 'done').length;

  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {tasks.length > 0 && editable && (
            <input
              type="checkbox"
              className="h-3.5 w-3.5 rounded accent-primary cursor-pointer"
              checked={allSelected}
              onChange={(e) => toggleAll(e.target.checked)}
              title="Select all tasks"
            />
          )}
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Tasks ({tasks.length})
            {tasks.length > 0 && (
              <span className="ml-2 font-normal normal-case">
                — {done}/{tasks.length} done, {pending} pending
              </span>
            )}
            {agentRunning && (
              <span className="ml-2 text-xs text-primary animate-pulse">AI generating tasks…</span>
            )}
          </h3>
        </div>
        {editable && !showForm && (
          <Button size="sm" variant="ghost" onClick={() => setShowForm(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add task
          </Button>
        )}
      </div>

      {/* ── Bulk action bar ── */}
      {someSelected && editable && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
          <span className="text-xs font-medium text-primary mr-1">
            {selectedIds.size} selected
          </span>

          <Button
            size="sm" variant="outline" className="h-7 text-xs"
            disabled={bulk.isPending}
            onClick={() => bulk.mutate({ action: 'status', status: 'done' })}
          >
            <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" />
            Mark Done
          </Button>

          <Button
            size="sm" variant="outline" className="h-7 text-xs"
            disabled={bulk.isPending}
            onClick={() => bulk.mutate({ action: 'status', status: 'pending' })}
          >
            <Clock className="h-3 w-3 mr-1 text-blue-400" />
            Mark Pending
          </Button>

          <Button
            size="sm" variant="outline" className="h-7 text-xs"
            disabled={bulk.isPending}
            onClick={() => setModalType('notify')}
          >
            <Bell className="h-3 w-3 mr-1 text-amber-400" />
            Send Notification
          </Button>

          <Button
            size="sm" variant="outline" className="h-7 text-xs"
            disabled={bulk.isPending}
            onClick={() => setModalType('rfp')}
          >
            <FileText className="h-3 w-3 mr-1 text-violet-400" />
            Send RFP
          </Button>

          <Button
            size="sm" variant="outline" className="h-7 text-xs border-destructive/40 text-destructive hover:bg-destructive/10"
            disabled={bulk.isPending}
            onClick={() => {
              if (confirm(`Delete ${selectedIds.size} task(s)?`)) bulk.mutate({ action: 'delete' });
            }}
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Delete
          </Button>

          <Button
            size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground ml-auto"
            onClick={() => setSelectedIds(new Set())}
          >
            <X className="h-3 w-3 mr-1" />
            Clear
          </Button>

          {bulk.isPending && (
            <span className="text-xs text-muted-foreground animate-pulse">Working…</span>
          )}
        </div>
      )}

      {/* ── Task items ── */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading tasks...</p>
      ) : tasks.length === 0 && !showForm ? (
        <p className="text-sm text-muted-foreground">No tasks yet.</p>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <TaskItem
              key={task._id}
              task={task}
              ticketId={ticketId}
              editable={editable}
              selected={selectedIds.has(task._id)}
              onSelect={(checked) => toggleOne(task._id, checked)}
            />
          ))}
        </div>
      )}

      {/* ── Add task form ── */}
      {showForm && editable && (
        <form onSubmit={handleSubmit} className="rounded-lg border bg-card p-4 space-y-3">
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Task description..."
            autoFocus
          />
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Link to Jobber entity (optional)</p>
            <JobberEntityPicker
              entityType={entityType}
              entityId={entityId}
              onTypeChange={setEntityType}
              onIdChange={setEntityId}
              onLabelChange={setEntityLabel}
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={!description.trim() || addTask.isPending}>
              {addTask.isPending ? 'Adding...' : 'Add Task'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowForm(false);
                setDescription('');
                setEntityType('');
                setEntityId('');
                setEntityLabel('');
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* ── Message modal ── */}
      {modalType && (
        <BulkMessageModal
          type={modalType}
          ticketId={ticketId}
          selectedTasks={tasks.filter((t) => selectedIds.has(t._id))}
          onClose={() => setModalType(null)}
          onSend={(message) => bulk.mutate({ action: modalType, message })}
          isSending={bulk.isPending}
        />
      )}
    </div>
  );
}
