import { useState } from 'react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Wrench, AlertTriangle, Gauge } from 'lucide-react';
import { useEquipmentRates, useEquipmentUsage } from '@/hooks/useEquipmentUtilization';
import { useCPMS } from '@/hooks/useCPMS';
import { useLanguage } from '@/contexts/LanguageContext';

export default function EquipmentUtilizationPage() {
  const { t } = useLanguage();
  const { projects } = useCPMS();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const { rates, create: createRate, update: updateRate, checkMaintenance } = useEquipmentRates();
  const { usage, logUsage, getUtilizationSummary } = useEquipmentUsage(selectedProjectId);
  const [showRateDialog, setShowRateDialog] = useState(false);
  const [showUsageDialog, setShowUsageDialog] = useState(false);
  const [rateForm, setRateForm] = useState({ equipment_code: '', equipment_name: '', category: '', hourly_rate: 0, daily_rate: 0, fuel_cost_per_hour: 0, operator_cost_per_hour: 0, maintenance_interval_hours: 250 });
  const [usageForm, setUsageForm] = useState({ equipment_rate_id: '', usage_date: new Date().toISOString().split('T')[0], hours_used: 0, idle_hours: 0, fuel_consumed: 0, operator_name: '', charge_type: 'hourly', engine_hours_start: 0, engine_hours_end: 0 });

  const ratesData = rates.data || [];
  const usageData = usage.data || [];
  const utilSummary = getUtilizationSummary(usageData);
  const maintenanceDue = ratesData.filter((r: any) => checkMaintenance(r).due).length;

  const handleCreateRate = () => {
    createRate.mutate(rateForm);
    setShowRateDialog(false);
    setRateForm({ equipment_code: '', equipment_name: '', category: '', hourly_rate: 0, daily_rate: 0, fuel_cost_per_hour: 0, operator_cost_per_hour: 0, maintenance_interval_hours: 250 });
  };

  const handleLogUsage = () => {
    if (!selectedProjectId) return;
    const equip = ratesData.find((r: any) => r.id === usageForm.equipment_rate_id);
    const chargeAmt = usageForm.charge_type === 'hourly' 
      ? usageForm.hours_used * (equip?.hourly_rate || 0) 
      : equip?.daily_rate || 0;
    logUsage.mutate({ ...usageForm, project_id: selectedProjectId, charge_amount: chargeAmt });
    setShowUsageDialog(false);
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Equipment Utilization</h1>
            <p className="text-muted-foreground">Internal rental rates, usage tracking & maintenance alerts</p>
          </div>
          <Select value={selectedProjectId || ''} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-[280px]"><SelectValue placeholder="Select Project" /></SelectTrigger>
            <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id!}>{p.code} - {p.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Equipment</p><p className="text-2xl font-bold">{ratesData.length}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Utilization</p><p className="text-2xl font-bold">{(utilSummary?.utilizationPct || 0).toFixed(0)}%</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Total Charges</p><p className="text-2xl font-bold">{(utilSummary?.totalCharge || 0).toLocaleString()}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Fuel Consumed</p><p className="text-2xl font-bold">{(utilSummary?.totalFuel || 0).toLocaleString()} L</p></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center gap-2"><Wrench className="h-4 w-4 text-yellow-500" /><p className="text-sm text-muted-foreground">Maintenance Due</p></div><p className="text-2xl font-bold text-yellow-600">{maintenanceDue}</p></CardContent></Card>
        </div>

        <Tabs defaultValue="equipment">
          <TabsList>
            <TabsTrigger value="equipment">Equipment & Rates</TabsTrigger>
            <TabsTrigger value="usage">Usage Log</TabsTrigger>
          </TabsList>

          <TabsContent value="equipment" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={showRateDialog} onOpenChange={setShowRateDialog}>
                <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add Equipment</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Equipment</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>Code</Label><Input value={rateForm.equipment_code} onChange={e => setRateForm({ ...rateForm, equipment_code: e.target.value })} /></div>
                      <div><Label>{t('common.name')}</Label><Input value={rateForm.equipment_name} onChange={e => setRateForm({ ...rateForm, equipment_name: e.target.value })} /></div>
                    </div>
                    <div><Label>Category</Label><Input value={rateForm.category} onChange={e => setRateForm({ ...rateForm, category: e.target.value })} placeholder="Excavator, Crane..." /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>Hourly Rate</Label><Input type="number" value={rateForm.hourly_rate} onChange={e => setRateForm({ ...rateForm, hourly_rate: Number(e.target.value) })} /></div>
                      <div><Label>Daily Rate</Label><Input type="number" value={rateForm.daily_rate} onChange={e => setRateForm({ ...rateForm, daily_rate: Number(e.target.value) })} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>Fuel Cost/Hr</Label><Input type="number" value={rateForm.fuel_cost_per_hour} onChange={e => setRateForm({ ...rateForm, fuel_cost_per_hour: Number(e.target.value) })} /></div>
                      <div><Label>Maintenance Interval (hrs)</Label><Input type="number" value={rateForm.maintenance_interval_hours} onChange={e => setRateForm({ ...rateForm, maintenance_interval_hours: Number(e.target.value) })} /></div>
                    </div>
                    <Button onClick={handleCreateRate} className="w-full">Add</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <Card>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Code</TableHead><TableHead>{t('common.name')}</TableHead><TableHead>Category</TableHead>
                  <TableHead className="text-right">Hourly</TableHead><TableHead className="text-right">Daily</TableHead>
                  <TableHead className="text-right">Engine Hrs</TableHead><TableHead className="text-right">Next Service</TableHead><TableHead>{t('common.status')}</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {ratesData.map((r: any) => {
                    const maint = checkMaintenance(r);
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono">{r.equipment_code}</TableCell>
                        <TableCell>{r.equipment_name}</TableCell>
                        <TableCell>{r.category}</TableCell>
                        <TableCell className="text-right">{(r.hourly_rate || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right">{(r.daily_rate || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right">{r.current_engine_hours || 0}</TableCell>
                        <TableCell className="text-right">
                          {maint.due ? (
                            <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Overdue</Badge>
                          ) : (
                            <span>{maint.hoursUntil.toFixed(0)} hrs</span>
                          )}
                        </TableCell>
                        <TableCell><Badge variant={r.status === 'available' ? 'secondary' : r.status === 'maintenance' ? 'destructive' : 'outline'}>{r.status}</Badge></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="usage" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={showUsageDialog} onOpenChange={setShowUsageDialog}>
                <DialogTrigger asChild><Button disabled={!selectedProjectId}><Plus className="h-4 w-4 mr-2" />Log Usage</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Log Equipment Usage</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div><Label>Equipment</Label>
                      <Select value={usageForm.equipment_rate_id} onValueChange={v => setUsageForm({ ...usageForm, equipment_rate_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>{ratesData.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.equipment_code} - {r.equipment_name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>{t('common.date')}</Label><Input type="date" value={usageForm.usage_date} onChange={e => setUsageForm({ ...usageForm, usage_date: e.target.value })} /></div>
                      <div><Label>Charge Type</Label>
                        <Select value={usageForm.charge_type} onValueChange={v => setUsageForm({ ...usageForm, charge_type: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="hourly">Hourly</SelectItem><SelectItem value="daily">Daily</SelectItem></SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div><Label>Hours Used</Label><Input type="number" value={usageForm.hours_used} onChange={e => setUsageForm({ ...usageForm, hours_used: Number(e.target.value) })} /></div>
                      <div><Label>Idle Hours</Label><Input type="number" value={usageForm.idle_hours} onChange={e => setUsageForm({ ...usageForm, idle_hours: Number(e.target.value) })} /></div>
                      <div><Label>Fuel (L)</Label><Input type="number" value={usageForm.fuel_consumed} onChange={e => setUsageForm({ ...usageForm, fuel_consumed: Number(e.target.value) })} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>Engine Hrs Start</Label><Input type="number" value={usageForm.engine_hours_start} onChange={e => setUsageForm({ ...usageForm, engine_hours_start: Number(e.target.value) })} /></div>
                      <div><Label>Engine Hrs End</Label><Input type="number" value={usageForm.engine_hours_end} onChange={e => setUsageForm({ ...usageForm, engine_hours_end: Number(e.target.value) })} /></div>
                    </div>
                    <div><Label>Operator</Label><Input value={usageForm.operator_name} onChange={e => setUsageForm({ ...usageForm, operator_name: e.target.value })} /></div>
                    <Button onClick={handleLogUsage} className="w-full">Log Usage</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <Card>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>{t('common.date')}</TableHead><TableHead>Operator</TableHead>
                  <TableHead className="text-right">Hours</TableHead><TableHead className="text-right">Idle</TableHead>
                  <TableHead className="text-right">Fuel</TableHead><TableHead className="text-right">Charge</TableHead>
                  <TableHead className="text-right">Engine Hrs</TableHead><TableHead>Maint.</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {usageData.map((u: any) => (
                    <TableRow key={u.id}>
                      <TableCell>{u.usage_date}</TableCell>
                      <TableCell>{u.operator_name}</TableCell>
                      <TableCell className="text-right">{u.hours_used}</TableCell>
                      <TableCell className="text-right">{u.idle_hours}</TableCell>
                      <TableCell className="text-right">{u.fuel_consumed} L</TableCell>
                      <TableCell className="text-right">{(u.charge_amount || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right">{u.engine_hours_end || '-'}</TableCell>
                      <TableCell>{u.maintenance_triggered ? <Badge variant="destructive">Triggered</Badge> : '-'}</TableCell>
                    </TableRow>
                  ))}
                  {usageData.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No usage records</TableCell></TableRow>}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
