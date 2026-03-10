import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/api/client';
import type { Ticket, TicketPriority, JobberEntityType } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { JobberEntityPicker } from '@/components/JobberEntityPicker';
import { ChevronLeft, TicketCheck, AlertCircle, Tag, Link2, Flag } from 'lucide-react';

const PRIORITY_CONFIG: Record<TicketPriority, { label: string; color: string }> = {
  low:    { label: 'Low',    color: 'text-slate-400' },
  medium: { label: 'Medium', color: 'text-blue-400' },
  high:   { label: 'High',   color: 'text-amber-400' },
  urgent: { label: 'Urgent', color: 'text-red-400' },
};

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
    <div className="p-4 md:p-8 w-full max-w-8xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
          <Link to="/tickets">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Tickets
          </Link>
        </Button>
        <span className="text-muted-foreground">/</span>
        <div className="flex items-center gap-2">
          <TicketCheck className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold">New Ticket</h1>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive-foreground">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">

          {/* ── Left: Main content ── */}
          <div className="space-y-5">
            {/* Jobber link — appears first */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                  <Link2 className="h-4 w-4" />
                  Jobber Entity
                  <span className="font-normal text-xs">(optional)</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <JobberEntityPicker
                  entityType={entityType}
                  entityId={entityId}
                  onTypeChange={setEntityType}
                  onIdChange={setEntityId}
                  onLabelChange={setEntityLabel}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Link this ticket to a Jobber client, job, visit, or property.
                </p>
              </CardContent>
            </Card>

            {/* Title + Description */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">
                    Title <span className="text-destructive">*</span>
                  </label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="What needs to be tracked?"
                    autoFocus
                    className="text-base h-11"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide additional context, steps to reproduce, or any relevant details..."
                    rows={8}
                    className="resize-none"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Right: Sidebar ── */}
          <div className="space-y-4">
            {/* Priority */}
            <Card>
              <CardContent className="pt-5 space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <Flag className="h-3.5 w-3.5 text-muted-foreground" />
                  Priority
                </label>
                <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(PRIORITY_CONFIG) as [TicketPriority, { label: string; color: string }][]).map(
                      ([val, { label, color }]) => (
                        <SelectItem key={val} value={val}>
                          <span className={`font-medium ${color}`}>{label}</span>
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {priority === 'urgent' && 'Needs immediate attention.'}
                  {priority === 'high' && 'Should be resolved soon.'}
                  {priority === 'medium' && 'Normal priority — address when possible.'}
                  {priority === 'low' && 'No rush, handle when convenient.'}
                </p>
              </CardContent>
            </Card>

            {/* Tags */}
            <Card>
              <CardContent className="pt-5 space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                  Tags
                </label>
                <Input
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="billing, urgent, follow-up"
                />
                <p className="text-xs text-muted-foreground">Comma-separated</p>
                {tags.trim() && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {tags.split(',').map((t) => t.trim()).filter(Boolean).map((tag) => (
                      <span
                        key={tag}
                        className="text-xs bg-primary/15 text-primary px-2 py-0.5 rounded-full font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="space-y-2">
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={create.isPending || !title.trim()}
              >
                {create.isPending ? 'Creating...' : 'Create Ticket'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                asChild
              >
                <Link to="/tickets">Cancel</Link>
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
