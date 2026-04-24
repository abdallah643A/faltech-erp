import { useCompanies, useCountries, useUpdateCompany } from '@/hooks/useGroupStructure';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export function CompaniesTab() {
  const { data: companies = [], isLoading } = useCompanies();
  const { data: countries = [] } = useCountries();
  const update = useUpdateCompany();

  return (
    <div className="enterprise-card overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Company</TableHead>
            <TableHead>Country</TableHead>
            <TableHead>Base Currency</TableHead>
            <TableHead>Language</TableHead>
            <TableHead>Timezone</TableHead>
            <TableHead>FY Start</TableHead>
            <TableHead className="text-right">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground p-6">Loading…</TableCell></TableRow>
          ) : companies.map(c => (
            <TableRow key={c.id}>
              <TableCell className="font-medium">
                {c.company_name}
                {c.is_default && <Badge variant="secondary" className="ml-2 text-[10px]">Default</Badge>}
              </TableCell>
              <TableCell>
                <Select value={c.country_code || ''} onValueChange={(v) => update.mutate({ id: c.id, country_code: v })}>
                  <SelectTrigger className="h-8 w-32"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {countries.map(co => <SelectItem key={co.code} value={co.code}>{co.code} · {co.name_en}</SelectItem>)}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Input className="h-8 w-20" defaultValue={c.base_currency || ''} onBlur={(e) => {
                  const v = e.target.value.toUpperCase().trim();
                  if (v && v !== c.base_currency) update.mutate({ id: c.id, base_currency: v });
                }} aria-label="Base currency" />
              </TableCell>
              <TableCell>
                <Select value={c.default_language || 'en'} onValueChange={(v) => update.mutate({ id: c.id, default_language: v })}>
                  <SelectTrigger className="h-8 w-24"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ar">العربية</SelectItem>
                    <SelectItem value="ur">اردو</SelectItem>
                    <SelectItem value="hi">हिन्दी</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Input className="h-8 w-36" defaultValue={c.timezone || ''} onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && v !== c.timezone) update.mutate({ id: c.id, timezone: v });
                }} aria-label="Timezone" placeholder="e.g. Asia/Riyadh" />
              </TableCell>
              <TableCell>
                <Select value={String(c.fiscal_year_start_month || 1)} onValueChange={(v) => update.mutate({ id: c.id, fiscal_year_start_month: Number(v) })}>
                  <SelectTrigger className="h-8 w-20"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell className="text-right">
                <Badge variant={c.is_active ? 'default' : 'secondary'}>{c.is_active ? 'Active' : 'Inactive'}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
