import { useParams, useNavigate } from 'react-router-dom';
import { useFleetAsset, useFleetTrips, useFleetFuelLogs, useFleetMaintenanceJobs, useFleetComplianceDocs, useFleetIncidents, useFleetCostEntries } from '@/hooks/useFleetData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Truck, Calendar, Fuel, Wrench, Shield, AlertTriangle, DollarSign, FileText, BarChart3 } from 'lucide-react';
import { formatSAR } from '@/lib/currency';

export default function FleetAssetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: asset, isLoading } = useFleetAsset(id);
  const { data: trips = [] } = useFleetTrips({ asset_id: id });
  const { data: fuel = [] } = useFleetFuelLogs(id);
  const { data: jobs = [] } = useFleetMaintenanceJobs({ asset_id: id });
  const { data: compliance = [] } = useFleetComplianceDocs(id);
  const { data: incidents = [] } = useFleetIncidents(id);
  const { data: costs = [] } = useFleetCostEntries(id);

  if (isLoading) return <div className="p-6 text-center text-muted-foreground">Loading...</div>;
  if (!asset) return <div className="p-6 text-center text-muted-foreground">Vehicle not found</div>;

  const totalCost = costs.reduce((s, c) => s + (c.amount || 0), 0);
  const totalFuel = fuel.reduce((s, f) => s + (f.total_cost || 0), 0);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/fleet/assets')}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold">{asset.asset_name}</h1>
            <Badge className="text-xs">{asset.status?.replace(/_/g, ' ')}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">{asset.asset_code} • {asset.plate_number} • {[asset.make, asset.model, asset.year].filter(Boolean).join(' ')}</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Odometer</p><p className="text-lg font-bold">{asset.current_odometer?.toLocaleString() ?? 0} {asset.odometer_unit}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Engine Hours</p><p className="text-lg font-bold">{asset.current_engine_hours?.toLocaleString() ?? 0}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Trips</p><p className="text-lg font-bold">{trips.length}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Fuel Cost</p><p className="text-lg font-bold">{formatSAR(totalFuel)}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Total Cost</p><p className="text-lg font-bold">{formatSAR(totalCost)}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="overview"><Truck className="h-3 w-3 mr-1" />Overview</TabsTrigger>
          <TabsTrigger value="trips"><Calendar className="h-3 w-3 mr-1" />Trips</TabsTrigger>
          <TabsTrigger value="fuel"><Fuel className="h-3 w-3 mr-1" />Fuel</TabsTrigger>
          <TabsTrigger value="maintenance"><Wrench className="h-3 w-3 mr-1" />Maintenance</TabsTrigger>
          <TabsTrigger value="compliance"><Shield className="h-3 w-3 mr-1" />Compliance</TabsTrigger>
          <TabsTrigger value="incidents"><AlertTriangle className="h-3 w-3 mr-1" />Incidents</TabsTrigger>
          <TabsTrigger value="costs"><DollarSign className="h-3 w-3 mr-1" />Costs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Vehicle Details</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {[
                  ['Ownership', asset.ownership_type],
                  ['Fuel Type', asset.fuel_type],
                  ['VIN/Chassis', asset.vin_chassis],
                  ['Engine No.', asset.engine_number],
                  ['Color', asset.color],
                  ['Tank Capacity', asset.tank_capacity_liters ? `${asset.tank_capacity_liters}L` : '—'],
                  ['Department', asset.department],
                  ['Cost Center', asset.cost_center],
                  ['Site', asset.site_location],
                ].map(([label, val]) => (
                  <div key={label as string} className="flex justify-between">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium capitalize">{val || '—'}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Dates & Warranty</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {[
                  ['Purchase Date', asset.purchase_date],
                  ['In-Service Date', asset.in_service_date],
                  ['Warranty Start', asset.warranty_start],
                  ['Warranty End', asset.warranty_end],
                  ['Lease Start', asset.lease_start],
                  ['Lease End', asset.lease_end],
                  ['Insurance Expiry', asset.insurance_expiry],
                  ['Registration Expiry', asset.registration_expiry],
                  ['Next Service Date', asset.next_service_date],
                ].map(([label, val]) => (
                  <div key={label as string} className="flex justify-between">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium">{val || '—'}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trips">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Trip #</TableHead><TableHead>Type</TableHead><TableHead>Origin → Dest</TableHead><TableHead>Driver</TableHead><TableHead>Distance</TableHead><TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {trips.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-4 text-muted-foreground">No trips</TableCell></TableRow> : trips.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="text-xs font-mono">{t.trip_number}</TableCell>
                    <TableCell className="text-xs capitalize">{t.trip_type}</TableCell>
                    <TableCell className="text-xs">{t.origin} → {t.destination}</TableCell>
                    <TableCell className="text-xs">{(t as any).fleet_drivers?.full_name || '—'}</TableCell>
                    <TableCell className="text-xs">{t.distance_km ? `${t.distance_km} km` : '—'}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{t.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="fuel">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Date</TableHead><TableHead>Station</TableHead><TableHead>Qty (L)</TableHead><TableHead>Cost</TableHead><TableHead>Odometer</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {fuel.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-4 text-muted-foreground">No fuel logs</TableCell></TableRow> : fuel.map(f => (
                  <TableRow key={f.id}>
                    <TableCell className="text-xs">{f.fill_date}</TableCell>
                    <TableCell className="text-xs">{f.station_name || '—'}</TableCell>
                    <TableCell className="text-xs">{f.quantity_liters}</TableCell>
                    <TableCell className="text-xs">{formatSAR(f.total_cost)}</TableCell>
                    <TableCell className="text-xs">{f.odometer_at_fill?.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="maintenance">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Job #</TableHead><TableHead>Type</TableHead><TableHead>Description</TableHead><TableHead>Cost</TableHead><TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {jobs.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-4 text-muted-foreground">No jobs</TableCell></TableRow> : jobs.map(j => (
                  <TableRow key={j.id}>
                    <TableCell className="text-xs font-mono">{j.job_number}</TableCell>
                    <TableCell className="text-xs capitalize">{j.job_type}</TableCell>
                    <TableCell className="text-xs truncate max-w-[200px]">{j.description}</TableCell>
                    <TableCell className="text-xs">{formatSAR(j.total_cost)}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{j.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="compliance">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Document</TableHead><TableHead>Type</TableHead><TableHead>Expiry</TableHead><TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {compliance.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center py-4 text-muted-foreground">No documents</TableCell></TableRow> : compliance.map(d => (
                  <TableRow key={d.id}>
                    <TableCell className="text-xs">{d.doc_name}</TableCell>
                    <TableCell className="text-xs capitalize">{d.doc_type}</TableCell>
                    <TableCell className="text-xs">{d.expiry_date || '—'}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{d.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="incidents">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Incident #</TableHead><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Severity</TableHead><TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {incidents.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-4 text-muted-foreground">No incidents</TableCell></TableRow> : incidents.map(inc => (
                  <TableRow key={inc.id}>
                    <TableCell className="text-xs font-mono">{inc.incident_number}</TableCell>
                    <TableCell className="text-xs">{inc.incident_date?.slice(0, 10)}</TableCell>
                    <TableCell className="text-xs capitalize">{inc.incident_type}</TableCell>
                    <TableCell><Badge variant={inc.severity === 'major' || inc.severity === 'total_loss' ? 'destructive' : 'outline'} className="text-[10px]">{inc.severity}</Badge></TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{inc.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="costs">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Description</TableHead><TableHead>Amount</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {costs.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center py-4 text-muted-foreground">No cost entries</TableCell></TableRow> : costs.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="text-xs">{c.cost_date}</TableCell>
                    <TableCell className="text-xs capitalize">{c.cost_type?.replace(/_/g, ' ')}</TableCell>
                    <TableCell className="text-xs truncate max-w-[200px]">{c.description}</TableCell>
                    <TableCell className="text-xs font-medium">{formatSAR(c.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
