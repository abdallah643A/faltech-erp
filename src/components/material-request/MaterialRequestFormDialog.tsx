import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Trash2 } from 'lucide-react';
import { MaterialRequest, MaterialRequestLine } from '@/hooks/useMaterialRequests';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface MaterialRequestFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  materialRequest: MaterialRequest | null;
  onSubmit: (data: { request: Partial<MaterialRequest>; lines: MaterialRequestLine[] }) => void;
  defaultProjectName?: string;
}

const emptyLine: MaterialRequestLine = {
  line_num: 1,
  part_no: '',
  description: '',
  unit_of_measurement: '',
  quantity: 0,
  remark: '',
};

const SECTORS = ['Construction', 'Infrastructure', 'Maintenance', 'Projects'];
const CATEGORIES = ['Equipment', 'Materials', 'Tools', 'Safety', 'Office Supplies'];
const DEPARTMENTS = ['Engineering', 'Operations', 'Procurement', 'Finance', 'HR', 'IT'];
const UNITS = ['EA', 'PCS', 'KG', 'MT', 'LTR', 'M', 'M2', 'M3', 'SET', 'BOX', 'ROLL'];

export function MaterialRequestFormDialog({
  open,
  onOpenChange,
  materialRequest,
  onSubmit,
  defaultProjectName,
}: MaterialRequestFormDialogProps) {
  const { language } = useLanguage();

  // Fetch unique customer names from sales orders
  const { data: projectNames = [] } = useQuery({
    queryKey: ['sales-orders-customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_orders')
        .select('customer_name')
        .order('customer_name');
      
      if (error) throw error;
      
      // Get unique customer names
      const uniqueNames = [...new Set(data?.map(order => order.customer_name).filter(Boolean))];
      return uniqueNames as string[];
    },
  });
  const isEdit = !!materialRequest?.id;

  const [formData, setFormData] = useState({
    request_date: new Date().toISOString().split('T')[0],
    project_name: '',
    sector: '',
    department: '',
    delivery_location: '',
    store_availability: '',
    spec: '',
    due_out_date: '',
    sole_source_adjustment: '',
    reference: '',
    category: '',
  });

  const [lines, setLines] = useState<MaterialRequestLine[]>([{ ...emptyLine }]);

  useEffect(() => {
    if (materialRequest) {
      setFormData({
        request_date: materialRequest.request_date || new Date().toISOString().split('T')[0],
        project_name: materialRequest.project_name || '',
        sector: materialRequest.sector || '',
        department: materialRequest.department || '',
        delivery_location: materialRequest.delivery_location || '',
        store_availability: materialRequest.store_availability || '',
        spec: materialRequest.spec || '',
        due_out_date: materialRequest.due_out_date || '',
        sole_source_adjustment: materialRequest.sole_source_adjustment || '',
        reference: materialRequest.reference || '',
        category: materialRequest.category || '',
      });
      if (materialRequest.lines && materialRequest.lines.length > 0) {
        setLines(materialRequest.lines);
      }
    } else {
      setFormData({
        request_date: new Date().toISOString().split('T')[0],
        project_name: defaultProjectName || '',
        sector: '',
        department: '',
        delivery_location: '',
        store_availability: '',
        spec: '',
        due_out_date: '',
        sole_source_adjustment: '',
        reference: '',
        category: '',
      });
      setLines([{ ...emptyLine }]);
    }
  }, [materialRequest, open]);

  const handleAddLine = () => {
    setLines([...lines, { ...emptyLine, line_num: lines.length + 1 }]);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length > 1) {
      const newLines = lines.filter((_, i) => i !== index);
      setLines(newLines.map((line, i) => ({ ...line, line_num: i + 1 })));
    }
  };

  const handleLineChange = (index: number, field: keyof MaterialRequestLine, value: string | number) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setLines(newLines);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      request: formData,
      lines,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? (language === 'ar' ? 'تعديل طلب مواد' : 'Edit Material Request')
              : (language === 'ar' ? 'طلب مواد جديد' : 'New Material Request')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header Fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>{language === 'ar' ? 'التاريخ' : 'Date'}</Label>
              <Input
                type="date"
                value={formData.request_date}
                onChange={(e) => setFormData({ ...formData, request_date: e.target.value })}
              />
            </div>
            <div>
              <Label>{language === 'ar' ? 'اسم المشروع' : 'Project Name'}</Label>
              <Select
                value={formData.project_name || 'none'}
                onValueChange={(v) => setFormData({ ...formData, project_name: v === 'none' ? '' : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={language === 'ar' ? 'اختر المشروع' : 'Select project'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{language === 'ar' ? 'اختر...' : 'Select...'}</SelectItem>
                  {projectNames.map((name) => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{language === 'ar' ? 'القطاع' : 'Sector'}</Label>
              <Select
                value={formData.sector || 'none'}
                onValueChange={(v) => setFormData({ ...formData, sector: v === 'none' ? '' : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={language === 'ar' ? 'اختر القطاع' : 'Select sector'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{language === 'ar' ? 'اختر...' : 'Select...'}</SelectItem>
                  {SECTORS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>{language === 'ar' ? 'القسم' : 'Department'}</Label>
              <Select
                value={formData.department || 'none'}
                onValueChange={(v) => setFormData({ ...formData, department: v === 'none' ? '' : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={language === 'ar' ? 'اختر القسم' : 'Select department'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{language === 'ar' ? 'اختر...' : 'Select...'}</SelectItem>
                  {DEPARTMENTS.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{language === 'ar' ? 'الفئة' : 'Category'}</Label>
              <Select
                value={formData.category || 'none'}
                onValueChange={(v) => setFormData({ ...formData, category: v === 'none' ? '' : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={language === 'ar' ? 'اختر الفئة' : 'Select category'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{language === 'ar' ? 'اختر...' : 'Select...'}</SelectItem>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{language === 'ar' ? 'المرجع' : 'Reference'}</Label>
              <Input
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                placeholder={language === 'ar' ? 'المرجع' : 'Reference'}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>{language === 'ar' ? 'موقع التسليم' : 'Delivery Location'}</Label>
              <Input
                value={formData.delivery_location}
                onChange={(e) => setFormData({ ...formData, delivery_location: e.target.value })}
                placeholder={language === 'ar' ? 'موقع التسليم' : 'Delivery location'}
              />
            </div>
            <div>
              <Label>{language === 'ar' ? 'توفر المخزون' : 'Store Availability'}</Label>
              <Input
                value={formData.store_availability}
                onChange={(e) => setFormData({ ...formData, store_availability: e.target.value })}
                placeholder={language === 'ar' ? 'توفر المخزون' : 'Store availability'}
              />
            </div>
            <div>
              <Label>{language === 'ar' ? 'تاريخ الاستحقاق' : 'Due Out (Delivery Before)'}</Label>
              <Input
                type="date"
                value={formData.due_out_date}
                onChange={(e) => setFormData({ ...formData, due_out_date: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>{language === 'ar' ? 'تعديل المصدر الوحيد' : 'Sole Source Adjustment'}</Label>
              <Input
                value={formData.sole_source_adjustment}
                onChange={(e) => setFormData({ ...formData, sole_source_adjustment: e.target.value })}
              />
            </div>
            <div>
              <Label>{language === 'ar' ? 'المواصفات' : 'SPEC'}</Label>
              <Textarea
                value={formData.spec}
                onChange={(e) => setFormData({ ...formData, spec: e.target.value })}
                rows={2}
              />
            </div>
          </div>

          {/* Lines Table */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label className="text-lg font-semibold">
                {language === 'ar' ? 'بنود الطلب' : 'Request Lines'}
              </Label>
              <Button type="button" variant="outline" size="sm" onClick={handleAddLine}>
                <Plus className="h-4 w-4 mr-1" />
                {language === 'ar' ? 'إضافة بند' : 'Add Line'}
              </Button>
            </div>
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>{language === 'ar' ? 'رقم القطعة' : 'Part No.'}</TableHead>
                    <TableHead className="min-w-[200px]">{language === 'ar' ? 'الوصف' : 'Description'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الوحدة' : 'UoM'}</TableHead>
                    <TableHead className="w-24">{language === 'ar' ? 'الكمية' : 'Qty'}</TableHead>
                    <TableHead>{language === 'ar' ? 'ملاحظات' : 'Remark/Purpose'}</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line, index) => (
                    <TableRow key={index}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <Input
                          value={line.part_no}
                          onChange={(e) => handleLineChange(index, 'part_no', e.target.value)}
                          placeholder="Part No."
                          className="min-w-[100px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={line.description}
                          onChange={(e) => handleLineChange(index, 'description', e.target.value)}
                          placeholder="Description"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={line.unit_of_measurement || 'none'}
                          onValueChange={(v) => handleLineChange(index, 'unit_of_measurement', v === 'none' ? '' : v)}
                        >
                          <SelectTrigger className="min-w-[80px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">-</SelectItem>
                            {UNITS.map((u) => (
                              <SelectItem key={u} value={u}>{u}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={line.quantity}
                          onChange={(e) => handleLineChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                          min="0"
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={line.remark}
                          onChange={(e) => handleLineChange(index, 'remark', e.target.value)}
                          placeholder="Purpose of use"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveLine(index)}
                          disabled={lines.length === 1}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit">
              {isEdit
                ? (language === 'ar' ? 'تحديث' : 'Update')
                : (language === 'ar' ? 'إنشاء' : 'Create')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
