import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface PublicHoliday {
  id: string;
  name: string;
  name_ar: string | null;
  holiday_date: string;
  year: number;
  is_recurring: boolean | null;
  created_at: string;
}

const DEFAULT_KSA_HOLIDAYS = [
  { name: 'Eid Al Fitr', name_ar: 'عيد الفطر', duration: 4 },
  { name: 'Eid Al Adha', name_ar: 'عيد الأضحى', duration: 4 },
  { name: 'Saudi National Day', name_ar: 'اليوم الوطني', duration: 1 },
  { name: 'Founding Day', name_ar: 'يوم التأسيس', duration: 1 },
];

export function PublicHolidayConfig() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', name_ar: '', holiday_date: '', is_recurring: false });

  const { data: holidays = [], isLoading } = useQuery({
    queryKey: ['public-holidays', selectedYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('public_holidays')
        .select('*')
        .eq('year', selectedYear)
        .order('holiday_date', { ascending: true });
      if (error) throw error;
      return data as PublicHoliday[];
    },
  });

  const addHoliday = useMutation({
    mutationFn: async (holiday: typeof form) => {
      const { error } = await supabase.from('public_holidays').insert({
        ...holiday,
        year: selectedYear,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public-holidays'] });
      toast({ title: 'Holiday added' });
      setDialogOpen(false);
      setForm({ name: '', name_ar: '', holiday_date: '', is_recurring: false });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteHoliday = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('public_holidays').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public-holidays'] });
      toast({ title: 'Holiday removed' });
    },
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Public Holidays / الإجازات الرسمية
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
              <SelectTrigger className="w-24 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Holiday
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-center text-muted-foreground py-4">Loading...</p>
        ) : holidays.length === 0 ? (
          <p className="text-center text-muted-foreground py-4 text-sm">
            No holidays configured for {selectedYear}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Arabic</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Recurring</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {holidays.map(h => (
                <TableRow key={h.id}>
                  <TableCell className="font-medium">{h.name}</TableCell>
                  <TableCell>{h.name_ar || '—'}</TableCell>
                  <TableCell>{format(parseISO(h.holiday_date), 'dd MMM yyyy')}</TableCell>
                  <TableCell>
                    {h.is_recurring ? <Badge variant="secondary">Yes</Badge> : '—'}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => deleteHoliday.mutate(h.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Public Holiday</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name (English)</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <Label>Name (Arabic)</Label>
                <Input value={form.name_ar} onChange={e => setForm(f => ({ ...f, name_ar: e.target.value }))} dir="rtl" />
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" value={form.holiday_date} onChange={e => setForm(f => ({ ...f, holiday_date: e.target.value }))} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_recurring} onCheckedChange={v => setForm(f => ({ ...f, is_recurring: v }))} />
                <Label>Recurring every year</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => addHoliday.mutate(form)} disabled={!form.name || !form.holiday_date}>
                Add Holiday
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// Helper: get public holidays for a year (used in leave calculation)
export function usePublicHolidays(year?: number) {
  const y = year || new Date().getFullYear();
  return useQuery({
    queryKey: ['public-holidays', y],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('public_holidays')
        .select('*')
        .eq('year', y);
      if (error) throw error;
      return data as PublicHoliday[];
    },
  });
}

/**
 * Count business days between two dates, excluding Fri/Sat (KSA weekend) and public holidays.
 */
export function countKSAWorkingDays(startDate: string, endDate: string, publicHolidays: string[] = []): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let count = 0;
  const current = new Date(start);

  while (current <= end) {
    const dayOfWeek = current.getDay(); // 0=Sun, 5=Fri, 6=Sat
    const dateStr = current.toISOString().split('T')[0];
    const isFriday = dayOfWeek === 5;
    const isSaturday = dayOfWeek === 6;
    const isHoliday = publicHolidays.includes(dateStr);

    if (!isFriday && !isSaturday && !isHoliday) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
}
