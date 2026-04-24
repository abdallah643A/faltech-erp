import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, RotateCcw, ChevronRight, ChevronDown, GripVertical, Eye, EyeOff, Plus, Search, Layers, Star } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface MenuItem {
  id: string;
  label: string;
  labelAr: string;
  icon: string;
  href?: string;
  visible: boolean;
  pinned: boolean;
  parent?: string;
  order: number;
  children?: MenuItem[];
  expanded?: boolean;
  roles: string[];
}

const MOCK_MENU: MenuItem[] = [
  { id: '1', label: 'Dashboard', labelAr: 'لوحة التحكم', icon: 'LayoutDashboard', href: '/', visible: true, pinned: false, order: 1, roles: ['all'] },
  { id: '2', label: 'Sales', labelAr: 'المبيعات', icon: 'ShoppingCart', visible: true, pinned: false, order: 2, roles: ['all'], children: [
    { id: '2.1', label: 'Sales Orders', labelAr: 'أوامر البيع', icon: 'FileText', href: '/sales-orders', visible: true, pinned: false, order: 1, roles: ['all'] },
    { id: '2.2', label: 'AR Invoices', labelAr: 'فواتير العملاء', icon: 'FileText', href: '/ar-invoices', visible: true, pinned: false, order: 2, roles: ['all'] },
    { id: '2.3', label: 'Quotations', labelAr: 'عروض الأسعار', icon: 'FileText', href: '/quotes', visible: true, pinned: false, order: 3, roles: ['all'] },
  ]},
  { id: '3', label: 'Purchasing', labelAr: 'المشتريات', icon: 'Package', visible: true, pinned: false, order: 3, roles: ['all'], children: [
    { id: '3.1', label: 'Purchase Orders', labelAr: 'أوامر الشراء', icon: 'FileText', href: '/purchase-orders', visible: true, pinned: false, order: 1, roles: ['all'] },
    { id: '3.2', label: 'AP Invoices', labelAr: 'فواتير الموردين', icon: 'FileText', href: '/ap-invoices', visible: true, pinned: false, order: 2, roles: ['all'] },
  ]},
  { id: '4', label: 'Finance', labelAr: 'المالية', icon: 'Landmark', visible: true, pinned: false, order: 4, roles: ['all'], children: [
    { id: '4.1', label: 'Journal Entries', labelAr: 'القيود اليومية', icon: 'BookOpen', href: '/journal-entries', visible: true, pinned: false, order: 1, roles: ['all'] },
    { id: '4.2', label: 'Chart of Accounts', labelAr: 'دليل الحسابات', icon: 'List', href: '/chart-of-accounts', visible: true, pinned: false, order: 2, roles: ['all'] },
  ]},
  { id: '5', label: 'HR', labelAr: 'الموارد البشرية', icon: 'Users', visible: true, pinned: false, order: 5, roles: ['all'] },
  { id: '6', label: 'Inventory', labelAr: 'المخزون', icon: 'Warehouse', visible: true, pinned: false, order: 6, roles: ['all'] },
  { id: '7', label: 'Administration', labelAr: 'الإدارة', icon: 'Settings', visible: true, pinned: false, order: 7, roles: ['admin'] },
];

const ROLES = ['All Users', 'Admin', 'Manager', 'Sales Rep', 'Accountant', 'HR Manager', 'Warehouse Manager'];

function MenuTreeItem({ item, depth = 0 }: { item: MenuItem; depth?: number }) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = item.children && item.children.length > 0;

  return (
    <div>
      <div className={cn('flex items-center gap-2 py-1.5 px-2 hover:bg-muted/50 rounded group', !item.visible && 'opacity-50')} style={{ paddingLeft: `${depth * 24 + 8}px` }}>
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground cursor-grab opacity-0 group-hover:opacity-100" />
        {hasChildren ? (
          <button onClick={() => setExpanded(!expanded)} className="p-0.5">
            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        ) : <span className="w-5" />}
        <span className={cn('text-sm flex-1', !item.visible && 'line-through text-muted-foreground')}>{item.label}</span>
        <span className="text-xs text-muted-foreground">{item.labelAr}</span>
        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => toast.info('Toggle visibility')}>
          {item.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
          <Star className={cn('h-3 w-3', item.pinned && 'fill-yellow-400 text-yellow-400')} />
        </Button>
      </div>
      {expanded && hasChildren && item.children!.map(child => (
        <MenuTreeItem key={child.id} item={child} depth={depth + 1} />
      ))}
    </div>
  );
}

export default function MenuStructure() {
  const { language } = useLanguage();
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('All Users');

  return (
    <div className="space-y-4 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{language === 'ar' ? 'هيكل القوائم' : 'Menu Structure'}</h1>
          <p className="text-muted-foreground text-sm">{language === 'ar' ? 'إدارة تنظيم قوائم التنقل' : 'Manage navigation menu organization, visibility, and ordering'}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><RotateCcw className="h-3.5 w-3.5 mr-1.5" />{language === 'ar' ? 'استعادة الافتراضي' : 'Reset to Default'}</Button>
          <Button size="sm"><Save className="h-3.5 w-3.5 mr-1.5" />{language === 'ar' ? 'حفظ' : 'Save'}</Button>
        </div>
      </div>

      <Tabs defaultValue="tree">
        <TabsList><TabsTrigger value="tree"><Layers className="h-3.5 w-3.5 mr-1.5" />Tree View</TabsTrigger><TabsTrigger value="table">Table View</TabsTrigger><TabsTrigger value="roles">By Role</TabsTrigger></TabsList>

        <TabsContent value="tree" className="mt-4">
          <div className="grid grid-cols-[1fr_320px] gap-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1"><Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" /><Input placeholder="Search menu items..." className="pl-8 h-8 text-sm" value={search} onChange={e => setSearch(e.target.value)} /></div>
                  <Button variant="outline" size="sm"><Plus className="h-3.5 w-3.5 mr-1" />Add Group</Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="border rounded-md divide-y">
                  {MOCK_MENU.filter(m => !search || m.label.toLowerCase().includes(search.toLowerCase())).map(item => (
                    <MenuTreeItem key={item.id} item={item} />
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Item Properties</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div><label className="text-xs text-muted-foreground">Display Name (EN)</label><Input className="h-8 text-sm" defaultValue="Dashboard" /></div>
                <div><label className="text-xs text-muted-foreground">Display Name (AR)</label><Input className="h-8 text-sm" defaultValue="لوحة التحكم" dir="rtl" /></div>
                <div><label className="text-xs text-muted-foreground">Icon</label><Input className="h-8 text-sm" defaultValue="LayoutDashboard" /></div>
                <div><label className="text-xs text-muted-foreground">Link / Route</label><Input className="h-8 text-sm" defaultValue="/" /></div>
                <div><label className="text-xs text-muted-foreground">Parent Menu</label>
                  <Select defaultValue="root"><SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="root">Root</SelectItem><SelectItem value="sales">Sales</SelectItem><SelectItem value="finance">Finance</SelectItem></SelectContent></Select>
                </div>
                <div className="flex items-center justify-between"><span>Visible</span><Switch defaultChecked /></div>
                <div className="flex items-center justify-between"><span>Pinnable</span><Switch defaultChecked /></div>
                <div><label className="text-xs text-muted-foreground">Visible to Roles</label>
                  <div className="flex flex-wrap gap-1 mt-1">{ROLES.map(r => <Badge key={r} variant="outline" className="text-xs cursor-pointer">{r}</Badge>)}</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="table" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader><TableRow><TableHead>Menu Item</TableHead><TableHead>Route</TableHead><TableHead>Parent</TableHead><TableHead>Visible</TableHead><TableHead>Roles</TableHead><TableHead>Order</TableHead></TableRow></TableHeader>
                <TableBody>
                  {MOCK_MENU.map(item => (
                    <TableRow key={item.id}><TableCell className="font-medium">{item.label}</TableCell><TableCell className="text-muted-foreground">{item.href || '—'}</TableCell><TableCell>Root</TableCell><TableCell>{item.visible ? <Badge variant="outline" className="text-xs text-green-600">Yes</Badge> : <Badge variant="outline" className="text-xs text-red-600">No</Badge>}</TableCell><TableCell><Badge variant="secondary" className="text-xs">{item.roles.join(', ')}</Badge></TableCell><TableCell>{item.order}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <label className="text-sm">Filter by Role:</label>
                <Select value={selectedRole} onValueChange={setSelectedRole}><SelectTrigger className="w-48 h-8 text-sm"><SelectValue /></SelectTrigger><SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md p-2 space-y-1">
                {MOCK_MENU.map(item => <div key={item.id} className="flex items-center gap-2 py-1 px-2 text-sm"><Switch defaultChecked /><span>{item.label}</span></div>)}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
