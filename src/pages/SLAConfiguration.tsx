import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Save, Clock, AlertTriangle, Shield } from 'lucide-react';

interface SLAConfig {
  id: string;
  phase: string;
  phase_label: string;
  max_days: number;
  escalation_1_days: number;
  escalation_2_days: number;
  escalation_3_days: number;
  is_active: boolean;
}

export default function SLAConfiguration() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [editedRows, setEditedRows] = useState<Record<string, Partial<SLAConfig>>>({});

  const { data: configs, isLoading } = useQuery({
    queryKey: ['phase-sla-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('phase_sla_config')
        .select('*')
        .order('phase');
      if (error) throw error;
      return data as SLAConfig[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (config: SLAConfig) => {
      const { error } = await supabase
        .from('phase_sla_config')
        .update({
          max_days: config.max_days,
          escalation_1_days: config.escalation_1_days,
          escalation_2_days: config.escalation_2_days,
          escalation_3_days: config.escalation_3_days,
          is_active: config.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', config.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phase-sla-config'] });
    },
  });

  const handleFieldChange = (id: string, field: keyof SLAConfig, value: number | boolean) => {
    setEditedRows(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const getEffective = (config: SLAConfig): SLAConfig => {
    const edits = editedRows[config.id];
    if (!edits) return config;
    return { ...config, ...edits };
  };

  const hasChanges = Object.keys(editedRows).length > 0;

  const handleSaveAll = async () => {
    if (!configs) return;
    try {
      for (const config of configs) {
        const edits = editedRows[config.id];
        if (edits) {
          await updateMutation.mutateAsync({ ...config, ...edits });
        }
      }
      setEditedRows({});
      toast({ title: 'SLA Configuration saved successfully' });
    } catch {
      toast({ title: 'Error saving configuration', variant: 'destructive' });
    }
  };

  const phaseOrder = [
    'sales_initiation', 'finance_verification', 'operations_verification',
    'design_costing', 'finance_gate_2', 'procurement', 'production',
    'final_payment', 'logistics', 'completed',
  ];

  const sortedConfigs = configs?.sort((a, b) => {
    return phaseOrder.indexOf(a.phase) - phaseOrder.indexOf(b.phase);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">SLA Configuration</h1>
          <p className="text-muted-foreground">Max days start counting after the previous stage is completed. Notifications are sent automatically when thresholds are exceeded.</p>
        </div>
        <Button onClick={handleSaveAll} disabled={!hasChanges || updateMutation.isPending}>
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Level 1 - Region Manager
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Notified when phase exceeds SLA max days + escalation 1 offset
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Level 2 - General Manager
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Notified after additional days past Level 1
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4 text-destructive" />
              Level 3 - CEO
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Notified after additional days past Level 2
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Phase SLA Settings</CardTitle>
          <CardDescription>
            Set maximum days for each phase. Escalation days are offsets added after the max days threshold.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead>Phase</TableHead>
                  <TableHead className="text-center w-[100px]">Max Days</TableHead>
                  <TableHead className="text-center w-[140px]">Esc. 1 (Region Mgr)</TableHead>
                  <TableHead className="text-center w-[140px]">Esc. 2 (Gen. Mgr)</TableHead>
                  <TableHead className="text-center w-[120px]">Esc. 3 (CEO)</TableHead>
                  <TableHead className="text-center w-[80px]">Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedConfigs?.map((config, idx) => {
                  const eff = getEffective(config);
                  const isEdited = !!editedRows[config.id];
                  return (
                    <TableRow key={config.id} className={isEdited ? 'bg-accent/30' : ''}>
                      <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{config.phase_label}</span>
                          {isEdited && <Badge variant="outline" className="text-xs">Modified</Badge>}
                        </div>
                        <span className="text-xs text-muted-foreground">{config.phase}</span>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={1}
                          className="w-20 text-center mx-auto"
                          value={eff.max_days}
                          onChange={(e) => handleFieldChange(config.id, 'max_days', parseInt(e.target.value) || 1)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          className="w-20 text-center mx-auto"
                          value={eff.escalation_1_days}
                          onChange={(e) => handleFieldChange(config.id, 'escalation_1_days', parseInt(e.target.value) || 0)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          className="w-20 text-center mx-auto"
                          value={eff.escalation_2_days}
                          onChange={(e) => handleFieldChange(config.id, 'escalation_2_days', parseInt(e.target.value) || 0)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          className="w-20 text-center mx-auto"
                          value={eff.escalation_3_days}
                          onChange={(e) => handleFieldChange(config.id, 'escalation_3_days', parseInt(e.target.value) || 0)}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={eff.is_active}
                          onCheckedChange={(v) => handleFieldChange(config.id, 'is_active', v)}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
