import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { MapPin } from 'lucide-react';
import { format } from 'date-fns';

const AssetGeoMap = () => {
  const { activeCompanyId } = useActiveCompany();
  const [locations, setLocations] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const [eq, loc] = await Promise.all([
        supabase.from('cpms_equipment' as any).select('*').order('name'),
        supabase.from('asset_locations' as any).select('*').order('recorded_at', { ascending: false }).limit(500),
      ]);
      setEquipment((eq.data || []) as any[]);
      setLocations((loc.data || []) as any[]);
    };
    fetch();
  }, [activeCompanyId]);

  const eqName = (id: string) => equipment.find(e => e.id === id)?.name || id;
  const uniqueEquipmentLocations = equipment.map(eq => {
    const latest = locations.find(l => l.equipment_id === eq.id);
    return { ...eq, latestLocation: latest };
  }).filter(e => e.latestLocation);

  return (
    <div className="p-6 space-y-6">
      <div><h1 className="text-2xl font-bold" style={{ fontFamily: 'IBM Plex Sans' }}>Geolocation & Site Mapping</h1><p className="text-sm text-muted-foreground">Asset locations, zones, movement history</p></div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-4"><MapPin className="h-5 w-5 text-blue-600 mb-1" /><div className="text-2xl font-bold">{uniqueEquipmentLocations.length}</div><div className="text-xs text-muted-foreground">Located Assets</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{locations.length}</div><div className="text-xs text-muted-foreground">Total Readings</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{new Set(locations.map(l => l.zone).filter(Boolean)).size}</div><div className="text-xs text-muted-foreground">Zones</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Latest Locations</CardTitle></CardHeader>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Asset</TableHead><TableHead>Site</TableHead><TableHead>Zone</TableHead><TableHead>Coordinates</TableHead><TableHead>Last Updated</TableHead><TableHead>Source</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {uniqueEquipmentLocations.map(e => (
              <TableRow key={e.id}>
                <TableCell className="font-medium">{e.name}</TableCell>
                <TableCell>{e.latestLocation.site_name || '-'}</TableCell>
                <TableCell>{e.latestLocation.zone || '-'}</TableCell>
                <TableCell className="text-xs">{e.latestLocation.latitude ? `${e.latestLocation.latitude}, ${e.latestLocation.longitude}` : '-'}</TableCell>
                <TableCell>{format(new Date(e.latestLocation.recorded_at), 'yyyy-MM-dd HH:mm')}</TableCell>
                <TableCell><Badge variant="outline">{e.latestLocation.source}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Movement History</CardTitle></CardHeader>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Asset</TableHead><TableHead>Site</TableHead><TableHead>Zone</TableHead><TableHead>Date</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {locations.slice(0, 50).map(l => (
              <TableRow key={l.id}>
                <TableCell>{eqName(l.equipment_id)}</TableCell>
                <TableCell>{l.site_name || '-'}</TableCell>
                <TableCell>{l.zone || '-'}</TableCell>
                <TableCell>{format(new Date(l.recorded_at), 'yyyy-MM-dd HH:mm')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default AssetGeoMap;
