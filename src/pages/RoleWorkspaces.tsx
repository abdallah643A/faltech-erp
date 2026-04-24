import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  LayoutDashboard, Settings, Plus, Save, Trash2, Edit, Star, Clock,
  Bookmark, Zap, BarChart3, Users, Shield, Briefcase, Monitor, Smartphone,
  Loader2, Eye, Grid3X3, List,
} from 'lucide-react';
import { toast } from 'sonner';

interface WorkspaceConfig {
  id: string;
  role_key: string;
  display_name: string;
  layout: string;
  widgets: any[];
  shortcuts: any[];
  default_module: string | null;
  kpi_config: any[];
  is_active: boolean;
}

interface UserPreferences {
  id: string;
  user_id: string;
  pinned_shortcuts: any[];
  hidden_widgets: string[];
  custom_widgets: any[];
  theme_mode: string;
  compact_mode: boolean;
  default_page: string | null;
  recent_items: any[];
  favorite_items: any[];
}

const WIDGET_TYPES = [
  { type: 'kpi_card', label: 'KPI Card', icon: BarChart3 },
  { type: 'recent_items', label: 'Recent Items', icon: Clock },
  { type: 'favorites', label: 'Favorites', icon: Star },
  { type: 'approval_inbox', label: 'Approval Inbox', icon: Shield },
  { type: 'tasks', label: 'My Tasks', icon: Briefcase },
  { type: 'notifications', label: 'Notifications', icon: Zap },
  { type: 'shortcuts', label: 'Quick Shortcuts', icon: Bookmark },
  { type: 'chart', label: 'Chart Widget', icon: BarChart3 },
];

const ROLE_PRESETS = [
  { key: 'admin', name: 'Administrator', modules: ['all'] },
  { key: 'sales_manager', name: 'Sales Manager', modules: ['crm', 'sales', 'reports'] },
  { key: 'sales_rep', name: 'Sales Representative', modules: ['crm', 'sales'] },
  { key: 'accountant', name: 'Accountant', modules: ['finance', 'reports'] },
  { key: 'finance_manager', name: 'Finance Manager', modules: ['finance', 'reports', 'approvals'] },
  { key: 'warehouse_manager', name: 'Warehouse Manager', modules: ['inventory', 'procurement'] },
  { key: 'hr_manager', name: 'HR Manager', modules: ['hr'] },
  { key: 'project_manager', name: 'Project Manager', modules: ['projects', 'cpms'] },
  { key: 'executive', name: 'Executive', modules: ['dashboards', 'reports'] },
  { key: 'data_entry', name: 'Data Entry', modules: ['sales', 'procurement'] },
];

export default function RoleWorkspaces() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('configs');
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Partial<WorkspaceConfig>>({});

  // Role workspace configs
  const { data: configs = [], isLoading: loadingConfigs } = useQuery({
    queryKey: ['role-workspace-configs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('role_workspace_configs' as any).select('*').order('role_key');
      if (error) throw error;
      return (data || []) as unknown as WorkspaceConfig[];
    },
  });

  // User preferences
  const { data: userPrefs } = useQuery({
    queryKey: ['user-workspace-prefs', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from('user_workspace_preferences' as any).select('*').eq('user_id', user.id).maybeSingle();
      return data as unknown as UserPreferences | null;
    },
    enabled: !!user?.id,
  });

  const saveConfig = useMutation({
    mutationFn: async (config: Partial<WorkspaceConfig>) => {
      if (config.id) {
        const { error } = await supabase.from('role_workspace_configs' as any).update(config as any).eq('id', config.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('role_workspace_configs' as any).insert(config as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-workspace-configs'] });
      setShowDialog(false);
      toast.success('Workspace config saved');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const savePrefs = useMutation({
    mutationFn: async (prefs: Partial<UserPreferences>) => {
      if (!user?.id) throw new Error('Not authenticated');
      const payload = { ...prefs, user_id: user.id };
      const { error } = await supabase.from('user_workspace_preferences' as any).upsert(payload as any, { onConflict: 'user_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-workspace-prefs'] });
      toast.success('Preferences saved');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteConfig = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('role_workspace_configs' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-workspace-configs'] });
      toast.success('Config deleted');
    },
  });

  const openNew = (preset?: typeof ROLE_PRESETS[0]) => {
    setEditing({
      role_key: preset?.key || '',
      display_name: preset?.name || '',
      layout: 'dashboard',
      widgets: WIDGET_TYPES.slice(0, 4).map((w, i) => ({ type: w.type, label: w.label, position: i, size: 'md' })),
      shortcuts: [],
      kpi_config: [],
      is_active: true,
    });
    setShowDialog(true);
  };

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-bold">{isAr ? 'مساحات العمل حسب الدور' : 'Role Workspaces'}</h1>
        <p className="text-muted-foreground">{isAr ? 'تخصيص لوحات المعلومات والاختصارات لكل دور' : 'Customize dashboards, shortcuts & widgets per role'}</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="configs" className="gap-1.5 text-xs"><Settings className="h-3.5 w-3.5" />Role Configs</TabsTrigger>
          <TabsTrigger value="my-workspace" className="gap-1.5 text-xs"><Monitor className="h-3.5 w-3.5" />My Workspace</TabsTrigger>
          <TabsTrigger value="presets" className="gap-1.5 text-xs"><Grid3X3 className="h-3.5 w-3.5" />Presets</TabsTrigger>
        </TabsList>

        {/* Role Configs Tab */}
        <TabsContent value="configs" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => openNew()}><Plus className="h-4 w-4 mr-1" />New Config</Button>
          </div>

          {loadingConfigs ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : configs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <LayoutDashboard className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No workspace configurations yet</p>
                <p className="text-sm mt-1">Create role-based dashboards from presets or from scratch</p>
                <Button size="sm" className="mt-4" onClick={() => setActiveTab('presets')}>Browse Presets</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {configs.map(cfg => (
                <Card key={cfg.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">{cfg.display_name}</CardTitle>
                      <Badge variant={cfg.is_active ? 'default' : 'secondary'}>{cfg.is_active ? 'Active' : 'Inactive'}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-[10px]">{cfg.role_key}</Badge>
                        <span>•</span>
                        <span>{cfg.layout} layout</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {(cfg.widgets || []).slice(0, 4).map((w: any, i: number) => (
                          <Badge key={i} variant="outline" className="text-[10px]">{w.label || w.type}</Badge>
                        ))}
                        {(cfg.widgets || []).length > 4 && <Badge variant="outline" className="text-[10px]">+{cfg.widgets.length - 4}</Badge>}
                      </div>
                      <div className="flex gap-1 pt-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => { setEditing(cfg); setShowDialog(true); }}>
                          <Edit className="h-3.5 w-3.5 mr-1" />Edit
                        </Button>
                        <Button variant="outline" size="sm" className="text-destructive" onClick={() => { if (confirm('Delete?')) deleteConfig.mutate(cfg.id); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* My Workspace Tab */}
        <TabsContent value="my-workspace" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Personal Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Theme Mode</Label>
                  <Select
                    value={userPrefs?.theme_mode || 'system'}
                    onValueChange={v => savePrefs.mutate({ ...userPrefs, theme_mode: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="system">System</SelectItem>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Default Page</Label>
                  <Select
                    value={userPrefs?.default_page || '/'}
                    onValueChange={v => savePrefs.mutate({ ...userPrefs, default_page: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="/">Dashboard</SelectItem>
                      <SelectItem value="/sales-dashboard">Sales Dashboard</SelectItem>
                      <SelectItem value="/finance-dashboard">Finance Dashboard</SelectItem>
                      <SelectItem value="/inventory-dashboard">Inventory Dashboard</SelectItem>
                      <SelectItem value="/approval-inbox">Approval Inbox</SelectItem>
                      <SelectItem value="/social-inbox">Social Inbox</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={userPrefs?.compact_mode || false}
                  onCheckedChange={v => savePrefs.mutate({ ...userPrefs, compact_mode: v })}
                />
                <div>
                  <Label className="text-xs">Compact Mode</Label>
                  <p className="text-[10px] text-muted-foreground">Denser layout for data-entry users</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Star className="h-4 w-4 text-yellow-500" />Favorites</CardTitle>
              </CardHeader>
              <CardContent>
                {(userPrefs?.favorite_items || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No favorites yet. Star items from any page to add them here.</p>
                ) : (
                  <div className="space-y-1">
                    {(userPrefs?.favorite_items || []).map((item: any, i: number) => (
                      <div key={i} className="flex items-center justify-between py-1 text-xs">
                        <span>{item.title || item.label}</span>
                        <Badge variant="outline" className="text-[10px]">{item.type || 'page'}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4 text-blue-500" />Recent Items</CardTitle>
              </CardHeader>
              <CardContent>
                {(userPrefs?.recent_items || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">Recent items will appear here as you navigate the ERP.</p>
                ) : (
                  <div className="space-y-1">
                    {(userPrefs?.recent_items || []).slice(0, 10).map((item: any, i: number) => (
                      <div key={i} className="flex items-center justify-between py-1 text-xs">
                        <span>{item.title || item.label}</span>
                        <span className="text-muted-foreground">{item.timestamp ? new Date(item.timestamp).toLocaleDateString() : ''}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Presets Tab */}
        <TabsContent value="presets" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ROLE_PRESETS.map(preset => {
              const exists = configs.some(c => c.role_key === preset.key);
              return (
                <Card key={preset.key} className={`hover:shadow-md transition-shadow ${exists ? 'border-primary/30' : ''}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">{preset.name}</CardTitle>
                      {exists && <Badge variant="default" className="text-[10px]">Configured</Badge>}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {preset.modules.map(m => <Badge key={m} variant="outline" className="text-[10px]">{m}</Badge>)}
                    </div>
                    <Button size="sm" variant={exists ? 'outline' : 'default'} className="w-full" onClick={() => openNew(preset)} disabled={exists}>
                      {exists ? 'Already Configured' : 'Create Workspace'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Config Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing.id ? 'Edit' : 'Create'} Workspace Config</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Role Key</Label>
                <Input value={editing.role_key || ''} onChange={e => setEditing(p => ({ ...p, role_key: e.target.value }))} placeholder="e.g. sales_manager" />
              </div>
              <div>
                <Label className="text-xs">Display Name</Label>
                <Input value={editing.display_name || ''} onChange={e => setEditing(p => ({ ...p, display_name: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Layout</Label>
              <Select value={editing.layout || 'dashboard'} onValueChange={v => setEditing(p => ({ ...p, layout: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dashboard">Dashboard (Widgets Grid)</SelectItem>
                  <SelectItem value="compact">Compact (Data Entry)</SelectItem>
                  <SelectItem value="executive">Executive (KPI Focus)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Widgets</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {WIDGET_TYPES.map(w => {
                  const active = (editing.widgets || []).some((ew: any) => ew.type === w.type);
                  return (
                    <Badge
                      key={w.type}
                      variant={active ? 'default' : 'outline'}
                      className="cursor-pointer text-[10px]"
                      onClick={() => {
                        const widgets = editing.widgets || [];
                        if (active) {
                          setEditing(p => ({ ...p, widgets: widgets.filter((ew: any) => ew.type !== w.type) }));
                        } else {
                          setEditing(p => ({ ...p, widgets: [...widgets, { type: w.type, label: w.label, position: widgets.length, size: 'md' }] }));
                        }
                      }}
                    >
                      {w.label}
                    </Badge>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={editing.is_active ?? true} onCheckedChange={v => setEditing(p => ({ ...p, is_active: v }))} />
              <Label className="text-xs">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={() => saveConfig.mutate(editing)} disabled={!editing.role_key || !editing.display_name}>
              <Save className="h-4 w-4 mr-1" />Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
