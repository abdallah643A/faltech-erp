import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ShieldAlert, Send } from 'lucide-react';
import { useProfileChangeActions, isSensitiveField } from '@/hooks/useSupplierPortalEnhanced';

const FIELDS = [
  { key: 'contact_name', label: 'Contact Name' },
  { key: 'contact_email', label: 'Contact Email' },
  { key: 'contact_phone', label: 'Contact Phone' },
  { key: 'address', label: 'Address' },
  { key: 'legal_name', label: 'Legal Name' },
  { key: 'tax_id', label: 'Tax / VAT ID' },
  { key: 'bank_account', label: 'Bank Account' },
  { key: 'iban', label: 'IBAN' },
  { key: 'swift', label: 'SWIFT' },
  { key: 'beneficiary_name', label: 'Beneficiary Name' },
];

export default function SupplierPortalProfile({ account }: { account: any }) {
  const { submit } = useProfileChangeActions();
  const initial = FIELDS.reduce((a, f) => ({ ...a, [f.key]: account[f.key] || '' }), {} as any);
  const [values, setValues] = useState(initial);

  const changes: any = {};
  for (const f of FIELDS) {
    if ((values[f.key] || '') !== (initial[f.key] || '')) {
      changes[f.key] = { old: initial[f.key], new: values[f.key] };
    }
  }
  const sensitiveCount = Object.keys(changes).filter(isSensitiveField).length;
  const dirty = Object.keys(changes).length > 0;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">My Profile</h2>
        <p className="text-sm text-muted-foreground">Update your profile. Sensitive fields require dual approval before being applied.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Profile Information</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {FIELDS.map(f => (
            <div key={f.key}>
              <Label className="flex items-center gap-2">
                {f.label}
                {isSensitiveField(f.key) && <Badge className="bg-orange-500/10 text-orange-500 text-xs"><ShieldAlert className="h-3 w-3 mr-1" />Sensitive</Badge>}
              </Label>
              <Input value={values[f.key]} onChange={e => setValues((p: any) => ({ ...p, [f.key]: e.target.value }))} />
            </div>
          ))}
        </CardContent>
      </Card>

      {dirty && (
        <Card className="border-yellow-500/30">
          <CardContent className="p-4 space-y-2">
            <p className="text-sm font-medium">Pending changes: {Object.keys(changes).length}</p>
            {sensitiveCount > 0 && (
              <p className="text-xs text-orange-500"><ShieldAlert className="h-3 w-3 inline mr-1" />{sensitiveCount} sensitive field(s) — will require dual approval.</p>
            )}
            <Button onClick={() => submit.mutate({
              portal_account_id: account.id,
              company_id: account.company_id,
              vendor_id: account.vendor_id,
              vendor_name: account.contact_name,
              changes,
            })} disabled={submit.isPending}>
              <Send className="h-4 w-4 mr-2" />Submit for Approval
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
