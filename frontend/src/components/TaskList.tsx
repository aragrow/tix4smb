import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/api/client';
import type { TicketTask, TaskStatus, TicketStatus, JobberEntityType } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { JobberEntityPicker } from '@/components/JobberEntityPicker';
import { Trash2, Plus, ChevronDown, Bot, StickyNote, Check, X } from 'lucide-react';

interface TaskListProps {
  ticketId: string;
  ticketStatus: TicketStatus;
  agentRunning?: boolean;
}

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
}: {
  task: TicketTask;
  ticketId: string;
  editable: boolean;
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
      className={`rounded-lg border bg-card px-4 py-3 space-y-2 ${
        task.status === 'done' ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-start gap-3">
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
              <span>{STATUS_LABELS[task.status]}</span>
              {editable && <ChevronDown className="h-3 w-3 opacity-60" />}
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
        <div className="space-y-1.5 pt-1">
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
          className="text-xs text-muted-foreground whitespace-pre-wrap border-t pt-2 cursor-pointer hover:text-foreground"
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

  const pending = tasks.filter((t) => t.status === 'pending').length;
  const done = tasks.filter((t) => t.status === 'done').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Tasks ({tasks.length})
          {tasks.length > 0 && (
            <span className="ml-2 font-normal normal-case">
              — {done}/{tasks.length} done, {pending} pending
            </span>
          )}
          {agentRunning && (
            <span className="ml-2 text-xs text-primary animate-pulse">AI generating tasks...</span>
          )}
        </h3>
        {editable && !showForm && (
          <Button size="sm" variant="ghost" onClick={() => setShowForm(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add task
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading tasks...</p>
      ) : tasks.length === 0 && !showForm ? (
        <p className="text-sm text-muted-foreground">No tasks yet.</p>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <TaskItem key={task._id} task={task} ticketId={ticketId} editable={editable} />
          ))}
        </div>
      )}

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
    </div>
  );
}
