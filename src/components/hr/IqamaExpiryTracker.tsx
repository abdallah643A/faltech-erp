import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, FileWarning, CheckCircle, Clock, Bell } from 'lucide-react';
import { differenceInDays, format, parseISO } from 'date-fns';

interface DocWithEmployee {
  id: string;
  employee_id: string;
  document_type: string;
  title: string;
  expiry_date: string | null;
  is_verified: boolean | null;
  employee?: { first_name: string; last_name: string; employee_code: string; nationality: string | null } | null;
}

function getExpiryStatus(expiryDate: string | null) {
  if (!expiryDate) return { status: 'no_expiry', label: 'No Expiry', color: 'secondary' as const, days: null };
  const days = differenceInDays(parseISO(expiryDate), new Date());
  if (days < 0) return { status: 'expired', label: 'Expired', color: 'destructive' as const, days };
  if (days <= 30) return { status: 'critical', label: `${days}d left`, color: 'destructive' as const, days };
  if (days <= 90) return { status: 'warning', label: `${days}d left`, color: 'default' as const, days };
  return { status: 'ok', label: `${days}d left`, color: 'secondary' as const, days };
}

const DOC_TYPE_LABELS: Record<string, string> = {
  iqama: 'Iqama / إقامة',
  passport: 'Passport / جواز سفر',
  visa: 'Visa / تأشيرة',
  work_permit: 'Work Permit / رخصة عمل',
  national_id: 'National ID / هوية',
  driving_license: 'Driving License / رخصة قيادة',
  medical_insurance: 'Medical Insurance / تأمين طبي',
  professional_license: 'Professional License',
  contract: 'Employment Contract',
};

export function IqamaExpiryTracker() {
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['all-employee-documents-expiry'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_documents')
        .select(`
          id, employee_id, document_type, title, expiry_date, is_verified,
          employee:employees!employee_documents_employee_id_fkey(first_name, last_name, employee_code, nationality)
        `)
        .not('expiry_date', 'is', null)
        .order('expiry_date', { ascending: true });
      if (error) throw error;
      return data as DocWithEmployee[];
    },
  });

  const expired = documents.filter(d => getExpiryStatus(d.expiry_date).status === 'expired');
  const critical = documents.filter(d => getExpiryStatus(d.expiry_date).status === 'critical');
  const warning = documents.filter(d => getExpiryStatus(d.expiry_date).status === 'warning');
  const ok = documents.filter(d => getExpiryStatus(d.expiry_date).status === 'ok');

  const alertDocs = [...expired, ...critical, ...warning];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileWarning className="h-5 w-5 text-orange-500" />
          <CardTitle className="text-sm">Iqama & Document Expiry Tracker / متتبع انتهاء الإقامة والوثائق</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-red-100 dark:bg-red-950/40 rounded-lg p-3 text-center">
            <AlertTriangle className="h-4 w-4 mx-auto text-red-600 mb-1" />
            <p className="text-lg font-bold text-red-600">{expired.length}</p>
            <p className="text-[10px] text-muted-foreground">Expired</p>
          </div>
          <div className="bg-orange-100 dark:bg-orange-950/40 rounded-lg p-3 text-center">
            <Bell className="h-4 w-4 mx-auto text-orange-600 mb-1" />
            <p className="text-lg font-bold text-orange-600">{critical.length}</p>
            <p className="text-[10px] text-muted-foreground">≤30 Days</p>
          </div>
          <div className="bg-yellow-100 dark:bg-yellow-950/40 rounded-lg p-3 text-center">
            <Clock className="h-4 w-4 mx-auto text-yellow-600 mb-1" />
            <p className="text-lg font-bold text-yellow-600">{warning.length}</p>
            <p className="text-[10px] text-muted-foreground">≤90 Days</p>
          </div>
          <div className="bg-green-100 dark:bg-green-950/40 rounded-lg p-3 text-center">
            <CheckCircle className="h-4 w-4 mx-auto text-green-600 mb-1" />
            <p className="text-lg font-bold text-green-600">{ok.length}</p>
            <p className="text-[10px] text-muted-foreground">Valid</p>
          </div>
        </div>

        {/* Alert documents table */}
        {isLoading ? (
          <p className="text-center text-muted-foreground py-4">Loading...</p>
        ) : alertDocs.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <CheckCircle className="h-8 w-8 mx-auto text-green-500 mb-2" />
            <p>All documents are valid. No upcoming expirations.</p>
          </div>
        ) : (
          <div className="max-h-[400px] overflow-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Document</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Verified</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alertDocs.map(doc => {
                  const expiry = getExpiryStatus(doc.expiry_date);
                  const emp = Array.isArray(doc.employee) ? doc.employee[0] : doc.employee;
                  return (
                    <TableRow key={doc.id} className={expiry.status === 'expired' ? 'bg-red-50 dark:bg-red-950/20' : ''}>
                      <TableCell className="font-medium">
                        {emp?.first_name} {emp?.last_name}
                        <br />
                        <span className="text-[10px] text-muted-foreground">{emp?.employee_code}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{DOC_TYPE_LABELS[doc.document_type] || doc.document_type}</span>
                        <br />
                        <span className="text-[10px] text-muted-foreground">{doc.title}</span>
                      </TableCell>
                      <TableCell>
                        {doc.expiry_date ? format(parseISO(doc.expiry_date), 'dd MMM yyyy') : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={expiry.color}>{expiry.label}</Badge>
                      </TableCell>
                      <TableCell>
                        {doc.is_verified
                          ? <CheckCircle className="h-4 w-4 text-green-500" />
                          : <span className="text-xs text-muted-foreground">—</span>
                        }
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
