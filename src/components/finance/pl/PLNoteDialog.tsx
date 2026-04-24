import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { MessageSquare, Plus, User, Clock } from 'lucide-react';

interface PLNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionKey: string;
  lineLabel: string;
  period: string;
  companyId?: string;
}

export function PLNoteDialog({ open, onOpenChange, sectionKey, lineLabel, period, companyId }: PLNoteDialogProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [note, setNote] = useState('');

  const { data: notes = [] } = useQuery({
    queryKey: ['pl-notes', sectionKey, lineLabel, period],
    enabled: open,
    queryFn: async () => {
      let q = supabase.from('pl_report_notes' as any).select('*').eq('section_key', sectionKey).eq('period', period).order('created_at', { ascending: false }) as any;
      if (lineLabel) q = q.eq('line_label', lineLabel);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const addNote = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase.from('pl_report_notes' as any).insert({
        section_key: sectionKey, line_label: lineLabel, period, note,
        company_id: companyId || null, created_by: user?.id,
        created_by_name: user?.email || 'Unknown',
      }) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pl-notes'] });
      setNote('');
      toast.success('Note added');
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Finance Notes: {lineLabel}
            <Badge variant="outline" className="text-xs">{period}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Add Commentary</Label>
            <Textarea rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="Enter finance commentary..." />
            <Button size="sm" onClick={() => addNote.mutate()} disabled={!note.trim()}>
              <Plus className="h-3 w-3 mr-1" />Add Note
            </Button>
          </div>

          <div className="space-y-2 max-h-[300px] overflow-auto">
            {notes.map((n: any) => (
              <div key={n.id} className="border rounded p-3 text-sm space-y-1">
                <p>{n.note}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><User className="h-3 w-3" />{n.created_by_name}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(n.created_at).toLocaleString()}</span>
                </div>
              </div>
            ))}
            {notes.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No notes yet</p>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
