import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertTriangle, Clock, ArrowRight, BarChart3, Users, Database, Shield, Landmark, Package, Settings, Layers, Rocket, Flag, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SetupItem {
  label: string;
  href: string;
  status: 'complete' | 'partial' | 'pending' | 'critical';
  progress: number;
  icon: any;
}

const SETUP_SECTIONS: { title: string; items: SetupItem[] }[] = [
  { title: 'Core Setup', items: [
    { label: 'Company Details', href: '/company-details', status: 'complete', progress: 100, icon: Settings },
    { label: 'General Settings', href: '/admin/general-settings', status: 'partial', progress: 65, icon: Settings },
    { label: 'Chart of Accounts', href: '/chart-of-accounts', status: 'complete', progress: 100, icon: Landmark },
    { label: 'Posting Periods', href: '/financial-periods', status: 'complete', progress: 100, icon: Clock },
    { label: 'Document Numbering', href: '/admin/document-numbering', status: 'partial', progress: 40, icon: Layers },
  ]},
  { title: 'Security & Users', items: [
    { label: 'User Accounts', href: '/users', status: 'partial', progress: 70, icon: Users },
    { label: 'Authorizations', href: '/admin/authorizations', status: 'pending', progress: 0, icon: Shield },
    { label: 'Data Access Rules', href: '/row-level-permissions', status: 'pending', progress: 0, icon: Shield },
  ]},
  { title: 'Master Data', items: [
    { label: 'Business Partners', href: '/business-partners', status: 'partial', progress: 30, icon: Users },
    { label: 'Items', href: '/items', status: 'pending', progress: 0, icon: Package },
    { label: 'Warehouses', href: '/warehouses', status: 'complete', progress: 100, icon: Database },
    { label: 'Tax Codes', href: '/admin/tax-groups', status: 'complete', progress: 100, icon: Landmark },
  ]},
  { title: 'Financial Setup', items: [
    { label: 'Opening Balances', href: '/admin/opening-balances', status: 'critical', progress: 0, icon: Landmark },
    { label: 'Payment Terms', href: '/admin/payment-terms', status: 'complete', progress: 100, icon: Landmark },
    { label: 'Banks', href: '/admin/banks', status: 'partial', progress: 50, icon: Landmark },
  ]},
  { title: 'Integration & Sync', items: [
    { label: 'SAP Sync Control Center', href: '/sap-sync-center', status: 'pending', progress: 0, icon: RefreshCw },
    { label: 'SAP Integration', href: '/sap-integration', status: 'pending', progress: 0, icon: Database },
    { label: 'Company & Database Setup', href: '/company-settings', status: 'partial', progress: 50, icon: Database },
  ]},
];

const STATUS_CONFIG = {
  complete: { color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle, label: 'Complete' },
  partial: { color: 'text-blue-600', bg: 'bg-blue-50', icon: Clock, label: 'In Progress' },
  pending: { color: 'text-muted-foreground', bg: 'bg-muted/50', icon: Clock, label: 'Not Started' },
  critical: { color: 'text-red-600', bg: 'bg-red-50', icon: AlertTriangle, label: 'Critical' },
};

export default function ImplementationCenter() {
  const { language } = useLanguage();
  const allItems = SETUP_SECTIONS.flatMap(s => s.items);
  const overallProgress = Math.round(allItems.reduce((s, i) => s + i.progress, 0) / allItems.length);
  const completed = allItems.filter(i => i.status === 'complete').length;
  const critical = allItems.filter(i => i.status === 'critical').length;

  return (
    <div className="space-y-4 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{language === 'ar' ? 'مركز التنفيذ' : 'Implementation Center'}</h1>
          <p className="text-muted-foreground text-sm">{language === 'ar' ? 'مركز التوجيه الرئيسي لتنفيذ النظام' : 'Central launchpad for system go-live readiness and setup completion'}</p>
        </div>
        <Button size="sm"><Rocket className="h-3.5 w-3.5 mr-1.5" />Go-Live Checklist</Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-5 gap-3">
        <Card className="p-3"><div className="text-xs text-muted-foreground">Overall Progress</div><div className="text-2xl font-bold">{overallProgress}%</div><Progress value={overallProgress} className="h-1.5 mt-1" /></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Completed</div><div className="text-2xl font-bold text-green-600">{completed}/{allItems.length}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Critical Missing</div><div className="text-2xl font-bold text-red-600">{critical}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">In Progress</div><div className="text-2xl font-bold text-blue-600">{allItems.filter(i => i.status === 'partial').length}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Not Started</div><div className="text-2xl font-bold text-muted-foreground">{allItems.filter(i => i.status === 'pending').length}</div></Card>
      </div>

      {/* Critical Warnings */}
      {critical > 0 && (
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-600" /><span className="text-sm font-medium text-red-700">Critical items require attention before go-live</span></div>
            <div className="mt-2 space-y-1">
              {allItems.filter(i => i.status === 'critical').map(item => (
                <div key={item.label} className="flex items-center gap-2 text-sm text-red-600"><ArrowRight className="h-3 w-3" />{item.label}</div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Setup Sections */}
      <div className="grid grid-cols-2 gap-4">
        {SETUP_SECTIONS.map(section => (
          <Card key={section.title}>
            <CardHeader className="pb-2"><CardTitle className="text-sm">{section.title}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {section.items.map(item => {
                const cfg = STATUS_CONFIG[item.status];
                return (
                  <a key={item.label} href={item.href} className={cn('flex items-center gap-3 p-2 rounded hover:bg-muted/50 transition-colors')}>
                    <item.icon className={cn('h-4 w-4', cfg.color)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{item.label}</span>
                        <Badge variant="outline" className={cn('text-xs', cfg.color)}>{cfg.label}</Badge>
                      </div>
                      <Progress value={item.progress} className="h-1 mt-1" />
                    </div>
                  </a>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recommended Setup Order */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm"><Flag className="h-4 w-4 inline mr-1.5" />Recommended Setup Order</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm flex-wrap">
            {['Company Details', 'Chart of Accounts', 'Posting Periods', 'Tax Codes', 'Document Numbering', 'Warehouses', 'Users & Roles', 'Business Partners', 'Items', 'Opening Balances', 'Go-Live'].map((step, i) => (
              <span key={step} className="flex items-center gap-1">
                <Badge variant={i < 4 ? 'default' : 'outline'} className="text-xs">{i + 1}. {step}</Badge>
                {i < 10 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
