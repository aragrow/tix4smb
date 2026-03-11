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
  CheckCircle2, Clock, Bell, FileText, Send, CalendarClock,
} from 'lucide-react';
import { BulkMessageModal } from '@/components/BulkMessageModal';

interface TaskListProps {
  ticketId: string;
  ticketStatus: TicketStatus;
  agentRunning?: boolean;
}

type TaskBulkAction = 'delete' | 'status' | 'notify';

const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  done: 'Done',
  sent: 'Sent',
};

const STATUS_CLASSES: Record<TaskStatus, string> = {
  pending: 'bg-muted text-muted-foreground',
  in_progress: 'bg-primary/20 text-primary',
  done: 'bg-green-500/20 text-green-600 dark:text-green-400',
  sent: 'bg-violet-500/20 text-violet-600 dark:text-violet-400',
};

function TaskItem({
  task,
  ticketId,
  editable,
  selected,
  onSelect,
  onDeleted,
}: {
  task: TicketTask;
  ticketId: string;
  editable: boolean;
  selected: boolean;
  onSelect: (checked: boolean) => void;
  onDeleted: (id: string) => void;
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
    onSuccess: () => {
      onDeleted(task._id);
      void queryClient.invalidateQueries({ queryKey: ['tasks', ticketId] });
    },
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
        {(() => {
          const m = task.description.match(/^(Job|Visit)\s+#([A-Za-z0-9+/=]+):/);
          const entityId = m?.[2] ?? task.jobber_entity_id;
          return (
            <div className="flex items-center pt-0.5 shrink-0">
              <input
                type="checkbox"
                className="h-3.5 w-3.5 rounded accent-primary cursor-pointer"
                checked={selected}
                onChange={(e) => onSelect(e.target.checked)}
                title={entityId}
              />
            </div>
          );
        })()}

        {/* Description */}
        <div className="flex-1 min-w-0 space-y-0.5">
          <p className={`text-sm ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
            {(() => {
              const m = task.description.match(/^(Job|Visit)\s+#([A-Za-z0-9+/=]+):\s+(.+)$/s);
              if (m) return <><span title={m[2]} className="font-medium cursor-help">{m[1]}</span>: {m[3]}</>;
              return task.description;
            })()}
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
            disabled={!editable || task.agent_generated}
          >
            <SelectTrigger className={`h-6 w-auto gap-1 border-0 px-2 text-xs font-medium ${STATUS_CLASSES[task.status]}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="done">Done</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
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
  const [modalType, setModalType] = useState<'notify' | null>(null);
  const [rfpModalOpen, setRfpModalOpen] = useState(false);
  const [rfrschModalOpen, setRfrschModalOpen] = useState(false);
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

  const sendRFP = useMutation({
    mutationFn: () =>
      api.post<{ ok: boolean; sent: number; skipped: number; vendors: Array<{ name: string; channel: string }> }>(
        `/api/tickets/${ticketId}/tasks/rfp`,
        { taskIds: [...selectedIds] }
      ).then((r) => r.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks', ticketId] });
      void queryClient.invalidateQueries({ queryKey: ['notes', ticketId] });
      setSelectedIds(new Set());
    },
  });

  const sendRFRSCH = useMutation({
    mutationFn: () =>
      api.post<{ ok: boolean; sent: number; skipped: number; vendors: Array<{ name: string; channel: string }> }>(
        `/api/tickets/${ticketId}/tasks/rfrsch`,
        { taskIds: [...selectedIds] }
      ).then((r) => r.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks', ticketId] });
      void queryClient.invalidateQueries({ queryKey: ['notes', ticketId] });
      setSelectedIds(new Set());
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
            title="Mark all selected tasks as done"
            disabled={bulk.isPending}
            onClick={() => bulk.mutate({ action: 'status', status: 'done' })}
          >
            <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" />
            Mark Done
          </Button>

          <Button
            size="sm" variant="outline" className="h-7 text-xs"
            title="Mark all selected tasks as pending"
            disabled={bulk.isPending}
            onClick={() => bulk.mutate({ action: 'status', status: 'pending' })}
          >
            <Clock className="h-3 w-3 mr-1 text-blue-400" />
            Mark Pending
          </Button>

          <Button
            size="sm" variant="outline" className="h-7 text-xs"
            title="Send a generic notification to the linked entity"
            disabled={bulk.isPending}
            onClick={() => setModalType('notify')}
          >
            <Bell className="h-3 w-3 mr-1 text-amber-400" />
            Send Notification
          </Button>

          <Button
            size="sm" variant="outline" className="h-7 text-xs"
            title="Send a Request for Proposal to matching Prospect Vendors in GoHighLevel"
            disabled={bulk.isPending}
            onClick={() => { setRfpModalOpen(true); sendRFP.reset(); }}
          >
            <FileText className="h-3 w-3 mr-1 text-violet-400" />
            Send RFP
          </Button>

          <Button
            size="sm" variant="outline" className="h-7 text-xs"
            title="Send a Request for Reschedule to the assigned vendor"
            disabled={bulk.isPending}
            onClick={() => { setRfrschModalOpen(true); sendRFRSCH.reset(); }}
          >
            <CalendarClock className="h-3 w-3 mr-1 text-sky-400" />
            Send RFRSCH
          </Button>

          <Button
            size="sm" variant="outline" className="h-7 text-xs border-destructive/40 text-destructive hover:bg-destructive/10"
            title="Permanently delete all selected tasks"
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
              onDeleted={(id) => setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next; })}
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

      {/* ── Message modal (notify) ── */}
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

      {/* ── RFRSCH modal ── */}
      {rfrschModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-background border rounded-xl shadow-2xl w-full max-w-md flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-semibold text-base flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-sky-400" />
                Send Reschedule Request
              </h3>
              <button
                className="text-muted-foreground hover:text-foreground text-lg leading-none"
                onClick={() => { setRfrschModalOpen(false); sendRFRSCH.reset(); }}
              >
                ✕
              </button>
            </div>

            <div className="px-6 py-4 space-y-3">
              {!sendRFRSCH.isSuccess ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    <span className="text-foreground font-medium">{selectedIds.size} task{selectedIds.size !== 1 ? 's' : ''}</span> selected.
                    Matching vendors will be contacted via SMS or email to arrange a new time.
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                    {tasks.filter((t) => selectedIds.has(t._id)).map((t) => (
                      <li key={t._id} className="truncate">{t.description}</li>
                    ))}
                  </ul>
                  {sendRFRSCH.isError && (
                    <p className="text-xs text-destructive">
                      {(sendRFRSCH.error as { response?: { data?: { error?: string } } })?.response?.data?.error
                        ?? 'Failed — check backend console.'}
                    </p>
                  )}
                </>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-green-400">
                    Reschedule request sent — {sendRFRSCH.data?.sent} message{(sendRFRSCH.data?.sent ?? 0) !== 1 ? 's' : ''} delivered
                    {(sendRFRSCH.data?.skipped ?? 0) > 0 && `, ${sendRFRSCH.data?.skipped} vendor(s) skipped`}.
                  </p>
                  {(sendRFRSCH.data?.vendors?.length ?? 0) > 0 && (
                    <ul className="text-xs space-y-1">
                      {sendRFRSCH.data?.vendors.map((v, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <Send className="h-3 w-3 text-sky-400 shrink-0" />
                          <span>{v.name}</span>
                          <span className="text-muted-foreground">via {v.channel.toUpperCase()}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t flex justify-end gap-2">
              <button
                className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded"
                onClick={() => { setRfrschModalOpen(false); sendRFRSCH.reset(); }}
              >
                {sendRFRSCH.isSuccess ? 'Close' : 'Cancel'}
              </button>
              {!sendRFRSCH.isSuccess && (
                <Button
                  size="sm"
                  className="gap-1.5"
                  disabled={sendRFRSCH.isPending}
                  onClick={() => sendRFRSCH.mutate()}
                >
                  <CalendarClock className="h-3.5 w-3.5" />
                  {sendRFRSCH.isPending ? 'Sending…' : 'Send Request'}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── RFP modal ── */}
      {rfpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-background border rounded-xl shadow-2xl w-full max-w-md flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-semibold text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-violet-400" />
                Send RFP to Vendors
              </h3>
              <button
                className="text-muted-foreground hover:text-foreground text-lg leading-none"
                onClick={() => { setRfpModalOpen(false); sendRFP.reset(); }}
              >
                ✕
              </button>
            </div>

            <div className="px-6 py-4 space-y-3">
              {!sendRFP.isSuccess ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    <span className="text-foreground font-medium">{selectedIds.size} task{selectedIds.size !== 1 ? 's' : ''}</span> selected.
                    Matching prospect vendors will be looked up from GoHighLevel by service type and location,
                    then contacted via SMS or email.
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                    {tasks.filter((t) => selectedIds.has(t._id)).map((t) => (
                      <li key={t._id} className="truncate">{t.description}</li>
                    ))}
                  </ul>
                  {sendRFP.isError && (
                    <p className="text-xs text-destructive">
                      {(sendRFP.error as { response?: { data?: { error?: string } } })?.response?.data?.error
                        ?? 'Failed — check backend console.'}
                    </p>
                  )}
                </>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-green-400">
                    RFP sent — {sendRFP.data?.sent} message{(sendRFP.data?.sent ?? 0) !== 1 ? 's' : ''} delivered
                    {(sendRFP.data?.skipped ?? 0) > 0 && `, ${sendRFP.data?.skipped} vendor(s) skipped`}.
                  </p>
                  {(sendRFP.data?.vendors?.length ?? 0) > 0 && (
                    <ul className="text-xs space-y-1">
                      {sendRFP.data?.vendors.map((v, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <Send className="h-3 w-3 text-violet-400 shrink-0" />
                          <span>{v.name}</span>
                          <span className="text-muted-foreground">via {v.channel.toUpperCase()}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t flex justify-end gap-2">
              <button
                className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded"
                onClick={() => { setRfpModalOpen(false); sendRFP.reset(); }}
              >
                {sendRFP.isSuccess ? 'Close' : 'Cancel'}
              </button>
              {!sendRFP.isSuccess && (
                <Button
                  size="sm"
                  className="gap-1.5"
                  disabled={sendRFP.isPending}
                  onClick={() => sendRFP.mutate()}
                >
                  <FileText className="h-3.5 w-3.5" />
                  {sendRFP.isPending ? 'Sending…' : 'Send RFP'}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
