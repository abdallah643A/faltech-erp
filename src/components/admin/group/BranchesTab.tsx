import { useState } from 'react';
import { useBranches, useCompanies, useCountries, useUpdateBranch } from '@/hooks/useGroupStructure';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

export function BranchesTab() {
  const { data: companies = [] } = useCompanies();
  const [companyId, setCompanyId] = useState<string>('');
  const effectiveCompany = companyId || companies[0]?.id || '';
  const { data: branches = [], isLoading } = useBranches(effectiveCompany);
  const { data: countries = [] } = useCountries();
  const update = useUpdateBranch();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium" htmlFor="branch-company">Company:</label>
        <Select value={effectiveCompany} onValueChange={setCompanyId}>
          <SelectTrigger id="branch-company" className="w-72"><SelectValue placeholder="Select company" /></SelectTrigger>
          <SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="enterprise-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Language</TableHead>
              <TableHead>Timezone</TableHead>
              <TableHead className="text-center">Default</TableHead>
              <TableHead className="text-center">Active</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground p-6">Loading…</TableCell></TableRow>
            ) : branches.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground p-6">No branches for this company</TableCell></TableRow>
            ) : branches.map(b => (
              <TableRow key={b.id}>
                <TableCell className="font-mono text-xs">{b.code || '—'}</TableCell>
                <TableCell>
                  <div className="font-medium">{b.name}</div>
                  {b.name_ar && <div className="text-xs text-muted-foreground" dir="rtl">{b.name_ar}</div>}
                </TableCell>
                <TableCell>
                  <Select value={b.country_code || ''} onValueChange={(v) => update.mutate({ id: b.id, country_code: v })}>
                    <SelectTrigger className="h-8 w-28"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>{countries.map(co => <SelectItem key={co.code} value={co.code}>{co.code}</SelectItem>)}</SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select value={b.language || 'en'} onValueChange={(v) => update.mutate({ id: b.id, language: v })}>
                    <SelectTrigger className="h-8 w-20"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">EN</SelectItem><SelectItem value="ar">AR</SelectItem>
                      <SelectItem value="ur">UR</SelectItem><SelectItem value="hi">HI</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Input className="h-8 w-36" defaultValue={b.timezone || ''} onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v && v !== b.timezone) update.mutate({ id: b.id, timezone: v });
                  }} aria-label="Branch timezone" />
                </TableCell>
                <TableCell className="text-center">
                  <Switch checked={b.is_default} onCheckedChange={(v) => update.mutate({ id: b.id, is_default: v })} aria-label="Default branch" />
                </TableCell>
                <TableCell className="text-center">
                  <Switch checked={b.is_active} onCheckedChange={(v) => update.mutate({ id: b.id, is_active: v })} aria-label="Active branch" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
