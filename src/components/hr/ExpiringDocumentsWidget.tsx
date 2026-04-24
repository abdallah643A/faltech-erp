import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, Bell, FileWarning } from 'lucide-react';
import { differenceInDays, format, parseISO } from 'date-fns';

interface ExpiringDoc {
  id: string;
  employee_id: string;
  document_type: string;
  title: string;
  expiry_date: string;
  employee?: { first_name: string; last_name: string; employee_code: string } | null;
}

export function ExpiringDocumentsWidget() {
  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['expiring-documents-widget'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const ninetyDaysOut = new Date();
      ninetyDaysOut.setDate(ninetyDaysOut.getDate() + 90);

      const { data, error } = await supabase
        .from('employee_documents')
        .select(`
          id, employee_id, document_type, title, expiry_date,
          employee:employees!employee_documents_employee_id_fkey(first_name, last_name, employee_code)
        `)
        .not('expiry_date', 'is', null)
        .lte('expiry_date', ninetyDaysOut.toISOString().split('T')[0])
        .order('expiry_date', { ascending: true })
        .limit(10);

      if (error) throw error;
      return data as ExpiringDoc[];
    },
    refetchInterval: 60000,
  });

  const getUrgencyIcon = (expiryDate: string) => {
    const days = differenceInDays(parseISO(expiryDate), new Date());
    if (days < 0) return <AlertTriangle className="h-4 w-4 text-destructive" />;
    if (days <= 30) return <Bell className="h-4 w-4 text-orange-500" />;
    return <Clock className="h-4 w-4 text-yellow-500" />;
  };

  const getUrgencyBadge = (expiryDate: string) => {
    const days = differenceInDays(parseISO(expiryDate), new Date());
    if (days < 0) return <Badge variant="destructive">Expired {Math.abs(days)}d ago</Badge>;
    if (days <= 30) return <Badge className="bg-orange-100 text-orange-800">{days}d left</Badge>;
    return <Badge variant="secondary">{days}d left</Badge>;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <FileWarning className="h-4 w-4 text-orange-500" />
          Expiring Documents / وثائق منتهية الصلاحية
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-center text-muted-foreground py-4 text-sm">Loading...</p>
        ) : docs.length === 0 ? (
          <p className="text-center text-muted-foreground py-4 text-sm">No expiring documents in the next 90 days</p>
        ) : (
          <div className="space-y-2">
            {docs.map(doc => {
              const emp = Array.isArray(doc.employee) ? doc.employee[0] : doc.employee;
              return (
                <div key={doc.id} className="flex items-center justify-between p-2 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    {getUrgencyIcon(doc.expiry_date)}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {emp?.first_name} {emp?.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {doc.document_type.replace('_', ' ')} • {format(parseISO(doc.expiry_date), 'dd MMM yyyy')}
                      </p>
                    </div>
                  </div>
                  {getUrgencyBadge(doc.expiry_date)}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
