import { useState } from 'react';
import { useGLAdvancedRules } from '@/hooks/useGLAdvancedRules';
import { ACCOUNT_TYPE_LABELS, SAP_DOCUMENT_TYPES } from '@/services/sapPostingEngine';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { GripVertical, Check, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AdvancedCriteriaSetup() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { criteria, criteriaLoading, updateCriterion } = useGLAdvancedRules();

  const handleToggle = (id: string, current: boolean) => {
    updateCriterion.mutate({ id, is_active: !current });
  };

  const handlePriorityChange = (id: string, newOrder: number) => {
    updateCriterion.mutate({ id, priority_order: newOrder });
  };

  if (criteriaLoading) return <div className="text-center py-8 text-muted-foreground">Loading...</div>;

  const sortedCriteria = [...criteria].sort((a, b) => a.priority_order - b.priority_order);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">
          {isAr ? 'إعداد معايير التحديد المتقدم' : 'Advanced Determination Criteria'}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {isAr
            ? 'فعّل المعايير المستخدمة لمطابقة القواعد المتقدمة ورتبها حسب الأولوية'
            : 'Activate criteria used for advanced rule matching and arrange their evaluation priority'}
        </p>
      </CardHeader>
      <CardContent>
        <div className="bg-muted/50 rounded-lg p-3 mb-4 text-sm">
          <strong>{isAr ? 'قواعد التبعية:' : 'Dependency Rules:'}</strong>
          <ul className="mt-1 space-y-1 text-muted-foreground">
            <li>• {isAr ? 'كود الصنف يتطلب تفعيل مجموعة الصنف' : 'Item Code requires Item Group to be active'}</li>
            <li>• {isAr ? 'الولاية/المنطقة تتطلب تفعيل الدولة' : 'Ship-to State requires Ship-to Country to be active'}</li>
            <li>• {isAr ? 'كود شريك العمل يتطلب تفعيل مجموعة شريك العمل' : 'BP Code requires BP Group to be active'}</li>
          </ul>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">#</TableHead>
              <TableHead>{isAr ? 'المعيار' : 'Criterion'}</TableHead>
              <TableHead>{isAr ? 'المفتاح' : 'Key'}</TableHead>
              <TableHead>{isAr ? 'يعتمد على' : 'Depends On'}</TableHead>
              <TableHead>{isAr ? 'الأولوية' : 'Priority'}</TableHead>
              <TableHead>{isAr ? 'نشط' : 'Active'}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedCriteria.map((c, idx) => {
              const depMet = !c.depends_on || criteria.find(cr => cr.criterion_key === c.depends_on)?.is_active;
              return (
                <TableRow key={c.id} className={!depMet ? 'opacity-50' : ''}>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                      <span className="text-xs text-muted-foreground">{idx + 1}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{c.criterion_label}</TableCell>
                  <TableCell><Badge variant="outline" className="font-mono text-xs">{c.criterion_key}</Badge></TableCell>
                  <TableCell>
                    {c.depends_on ? (
                      <div className="flex items-center gap-1">
                        <Badge variant="secondary" className="text-xs">{c.depends_on}</Badge>
                        {depMet ? <Check className="h-3.5 w-3.5 text-green-600" /> : <X className="h-3.5 w-3.5 text-destructive" />}
                      </div>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{c.priority_order}</Badge>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={c.is_active}
                      onCheckedChange={() => handleToggle(c.id, c.is_active)}
                      disabled={!depMet && !c.is_active}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
