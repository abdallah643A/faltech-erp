import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ClipboardCheck } from 'lucide-react';
import { useInspectionTemplates } from '@/hooks/useAssetEnhanced';

export default function InspectionTemplates() {
  const { data: templates = [] } = useInspectionTemplates();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><ClipboardCheck className="h-6 w-6 text-primary" />Inspection Templates</h1>
        <p className="text-muted-foreground">Reusable safety, regulatory, and calibration checklists</p>
      </div>

      <div className="grid gap-4">
        {templates.map((t: any) => (
          <Card key={t.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{t.template_name}</CardTitle>
                  <p className="text-xs text-muted-foreground" dir="rtl">{t.template_name_ar}</p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline">{t.category}</Badge>
                  <Badge variant="secondary">{t.frequency}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead className="w-12">#</TableHead><TableHead>Item</TableHead><TableHead>Type</TableHead><TableHead>Required</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {(t.asset_inspection_checklist_items || []).sort((a: any, b: any) => a.item_order - b.item_order).map((it: any) => (
                    <TableRow key={it.id}>
                      <TableCell>{it.item_order}</TableCell>
                      <TableCell><div>{it.item_text}</div><div className="text-xs text-muted-foreground" dir="rtl">{it.item_text_ar}</div></TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{it.response_type}</Badge></TableCell>
                      <TableCell>{it.is_required ? '✓' : ''}</TableCell>
                    </TableRow>
                  ))}
                  {(t.asset_inspection_checklist_items || []).length === 0 && <TableRow><TableCell colSpan={4} className="text-muted-foreground text-center py-4">No items</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
        {templates.length === 0 && <Card><CardContent className="py-12 text-center text-muted-foreground">No templates</CardContent></Card>}
      </div>
    </div>
  );
}
