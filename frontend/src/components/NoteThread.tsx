import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/api/client';
import type { Note, TicketStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Bot, Pencil, Trash2, X, Check } from 'lucide-react';

interface NoteThreadProps {
  ticketId: string;
  ticketStatus: TicketStatus;
}

export function NoteThread({ ticketId, ticketStatus }: NoteThreadProps) {
  const [body, setBody] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');
  const queryClient = useQueryClient();
  const editable = ticketStatus !== 'closed';

  const { data: notes = [], isLoading } = useQuery<Note[]>({
    queryKey: ['notes', ticketId],
    queryFn: () => api.get<Note[]>(`/api/tickets/${ticketId}/notes`).then((r) => r.data),
    refetchInterval: 5000,
  });

  const addNote = useMutation({
    mutationFn: (noteBody: string) =>
      api.post<Note>(`/api/tickets/${ticketId}/notes`, { body: noteBody }).then((r) => r.data),
    onSuccess: () => {
      setBody('');
      void queryClient.invalidateQueries({ queryKey: ['notes', ticketId] });
    },
  });

  const updateNote = useMutation({
    mutationFn: ({ noteId, body: b }: { noteId: string; body: string }) =>
      api.patch<Note>(`/api/tickets/${ticketId}/notes/${noteId}`, { body: b }).then((r) => r.data),
    onSuccess: () => {
      setEditingId(null);
      void queryClient.invalidateQueries({ queryKey: ['notes', ticketId] });
    },
  });

  const deleteNote = useMutation({
    mutationFn: (noteId: string) =>
      api.delete(`/api/tickets/${ticketId}/notes/${noteId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notes', ticketId] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (body.trim()) addNote.mutate(body.trim());
  };

  const startEdit = (note: Note) => {
    setEditingId(note._id);
    setEditBody(note.body);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        Notes ({notes.length})
      </h3>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading notes...</p>
      ) : notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No notes yet.</p>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div key={note._id} className="rounded-lg border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {note.agent_generated ? (
                    <>
                      <Bot className="h-3.5 w-3.5 text-primary" />
                      <span className="text-sm font-medium text-primary">AI Agent</span>
                    </>
                  ) : (
                    <span className="text-sm font-medium">{note.author?.name ?? 'Unknown'}</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">
                    {new Date(note.created_at).toLocaleString()}
                  </span>
                  {editable && !note.agent_generated && editingId !== note._id && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => startEdit(note)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm('Delete this note?')) deleteNote.mutate(note._id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {editingId === note._id ? (
                <div className="space-y-2">
                  <Textarea
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    rows={3}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => updateNote.mutate({ noteId: note._id, body: editBody.trim() })}
                      disabled={!editBody.trim() || updateNote.isPending}
                    >
                      <Check className="h-3.5 w-3.5 mr-1" />
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                      <X className="h-3.5 w-3.5 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm whitespace-pre-wrap">{note.body}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {editable && (
        <form onSubmit={handleSubmit} className="space-y-2">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Add a note..."
            rows={3}
          />
          <Button
            type="submit"
            size="sm"
            disabled={!body.trim() || addNote.isPending}
          >
            {addNote.isPending ? 'Adding...' : 'Add Note'}
          </Button>
        </form>
      )}
    </div>
  );
}
