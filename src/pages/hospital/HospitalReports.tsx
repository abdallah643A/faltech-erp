import { useState, useMemo } from 'react';
import { BarChart3 } from 'lucide-react';
import { HospitalShell } from '@/components/hospital/HospitalShell';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useHospReports } from '@/hooks/useHospital';

const Stat = ({ label, value, sub }: { label: string; value: any; sub?: string }) => (
  <Card className="p-4">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="text-2xl font-semibold mt-1">{value}</div>
    {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
  </Card>
);

export default function HospitalReports() {
  const today = new Date();
  const monthAgo = new Date(today); monthAgo.setDate(today.getDate() - 30);
  const [from, setFrom] = useState(monthAgo.toISOString().slice(0, 10));
  const [to, setTo] = useState(today.toISOString().slice(0, 10));

  const range = useMemo(() => ({ from: `${from}T00:00:00.000Z`, to: `${to}T23:59:59.999Z` }), [from, to]);
  const { data, isLoading } = useHospReports(range);

  return (
    <HospitalShell
      title="Hospital Reports & Analytics"
      subtitle="Operational KPIs, revenue & clinical throughput"
      icon={<BarChart3 className="h-5 w-5" />}
      actions={
        <div className="flex items-end gap-2">
          <div><Label className="text-xs">From</Label><Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="h-8 w-[140px]" /></div>
          <div><Label className="text-xs">To</Label><Input type="date" value={to} onChange={e => setTo(e.target.value)} className="h-8 w-[140px]" /></div>
        </div>
      }
    >
      {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Total Encounters" value={data.encounters.length} />
            <Stat label="Admissions" value={data.admissionsCount} />
            <Stat label="Surgeries" value={data.surgeriesCount} sub={`${data.surgeriesCompleted} completed`} />
            <Stat label="Lab Orders" value={data.labOrders} sub={`${data.labCompleted} resulted`} />
            <Stat label="Radiology" value={data.radOrders} sub={`${data.radReported} reported`} />
            <Stat label="Invoices Total" value={data.invoiceTotal.toFixed(2)} />
            <Stat label="Outstanding" value={data.invoiceOutstanding.toFixed(2)} />
            <Stat label="Payments" value={data.paymentsTotal.toFixed(2)} />
          </div>

          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <Card className="p-4">
              <div className="font-semibold text-sm mb-3">Encounters by Type</div>
              <div className="space-y-2">
                {Object.entries(data.encountersByType || {}).map(([k, v]: any) => (
                  <div key={k} className="flex items-center justify-between text-sm">
                    <span className="capitalize">{k}</span>
                    <span className="font-mono">{v}</span>
                  </div>
                ))}
                {Object.keys(data.encountersByType || {}).length === 0 && <div className="text-xs text-muted-foreground">No data</div>}
              </div>
            </Card>
            <Card className="p-4">
              <div className="font-semibold text-sm mb-3">Encounters by Department</div>
              <div className="space-y-2">
                {Object.entries(data.encountersByDept || {}).map(([k, v]: any) => (
                  <div key={k} className="flex items-center justify-between text-sm">
                    <span className="capitalize">{k}</span>
                    <span className="font-mono">{v}</span>
                  </div>
                ))}
                {Object.keys(data.encountersByDept || {}).length === 0 && <div className="text-xs text-muted-foreground">No data</div>}
              </div>
            </Card>
            <Card className="p-4 md:col-span-2">
              <div className="font-semibold text-sm mb-3">Insurance Performance</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div><div className="text-xs text-muted-foreground">Requests</div><div className="font-semibold">{data.insuranceCount}</div></div>
                <div><div className="text-xs text-muted-foreground">Approved</div><div className="font-semibold">{data.insuranceApproved}</div></div>
                <div><div className="text-xs text-muted-foreground">Requested Amt</div><div className="font-semibold">{data.insuranceRequested.toFixed(2)}</div></div>
                <div><div className="text-xs text-muted-foreground">Approved Amt</div><div className="font-semibold text-emerald-600">{data.insuranceApprovedAmt.toFixed(2)}</div></div>
              </div>
            </Card>
          </div>
        </>
      )}
    </HospitalShell>
  );
}
