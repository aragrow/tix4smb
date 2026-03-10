import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/api/client';
import type { Ticket, TicketPriority, JobberEntityType } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { JobberEntityPicker } from '@/components/JobberEntityPicker';
import { ChevronLeft } from 'lucide-react';

export default function TicketNew() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [entityType, setEntityType] = useState<JobberEntityType | ''>('');
  const [entityId, setEntityId] = useState('');
  const [entityLabel, setEntityLabel] = useState('');
  const [tags, setTags] = useState('');
  const [error, setError] = useState('');

  const create = useMutation({
    mutationFn: (payload: unknown) =>
      api.post<Ticket>('/api/tickets', payload).then((r) => r.data),
    onSuccess: (ticket) => {
      void queryClient.invalidateQueries({ queryKey: ['tickets'] });
      void navigate(`/tickets/${ticket._id}`);
    },
    onError: () => setError('Failed to create ticket. Please try again.'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError('Title is required.'); return; }
    setError('');
    create.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      jobber_entity_type: entityType || undefined,
      jobber_entity_id: entityId || undefined,
      jobber_entity_label: entityLabel || undefined,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
    });
  };

  return (
    <div className="p-8 max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/tickets">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Link>
        </Button>
        <h2 className="text-2xl font-bold">New Ticket</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive-foreground">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Title *</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs to be tracked?"
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Description</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Additional details..."
            rows={4}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Priority</label>
          <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Jobber Entity (optional)</label>
          <JobberEntityPicker
            entityType={entityType}
            entityId={entityId}
            onTypeChange={setEntityType}
            onIdChange={setEntityId}
            onLabelChange={setEntityLabel}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Tags</label>
          <Input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="tag1, tag2, tag3"
          />
          <p className="text-xs text-muted-foreground">Comma-separated tags</p>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? 'Creating...' : 'Create Ticket'}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link to="/tickets">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
