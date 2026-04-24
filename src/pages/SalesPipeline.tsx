import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  DollarSign, Building2, Calendar, MoreVertical, GripVertical, 
  FileText, TrendingUp, ArrowRight, Eye,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PIPELINE_STAGES = [
  { key: 'draft', label: 'Draft', labelAr: 'مسودة', color: 'bg-slate-500', bgColor: 'bg-slate-50 dark:bg-slate-900/30' },
  { key: 'open', label: 'Open', labelAr: 'مفتوح', color: 'bg-blue-500', bgColor: 'bg-blue-50 dark:bg-blue-900/20' },
  { key: 'approved', label: 'Approved', labelAr: 'معتمد', color: 'bg-emerald-500', bgColor: 'bg-emerald-50 dark:bg-emerald-900/20' },
  { key: 'delivered', label: 'Delivered', labelAr: 'تم التسليم', color: 'bg-purple-500', bgColor: 'bg-purple-50 dark:bg-purple-900/20' },
  { key: 'closed', label: 'Closed', labelAr: 'مغلق', color: 'bg-gray-500', bgColor: 'bg-gray-50 dark:bg-gray-900/20' },
];

export default function SalesPipeline() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['sales-pipeline'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('sales_orders').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-pipeline'] });
      toast({ title: 'Status updated' });
    },
    onError: () => {
      toast({ title: 'Failed to update', variant: 'destructive' });
    },
  });

  const ordersByStage = useMemo(() => {
    const map: Record<string, typeof orders> = {};
    PIPELINE_STAGES.forEach(s => { map[s.key] = []; });
    orders.forEach(o => {
      const st = o.status || 'draft';
      if (map[st]) map[st].push(o);
      else map['draft'].push(o);
    });
    return map;
  }, [orders]);

  const handleDragStart = (id: string) => setDraggedId(id);
  const handleDragEnd = () => setDraggedId(null);

  const handleDrop = (targetStage: string) => {
    if (draggedId) {
      updateStatus.mutate({ id: draggedId, status: targetStage });
      setDraggedId(null);
    }
  };

  const totalPipeline = orders.reduce((s, o) => s + (o.total || 0), 0);
  const openDeals = orders.filter(o => o.status === 'open' || o.status === 'approved').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sales Pipeline</h1>
          <p className="text-sm text-muted-foreground">Drag and drop deals between stages</p>
        </div>
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg">
            <DollarSign className="h-4 w-4 text-emerald-600" />
            <span className="text-muted-foreground">Pipeline:</span>
            <span className="font-bold">{totalPipeline.toLocaleString()} SAR</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            <span className="text-muted-foreground">Active:</span>
            <span className="font-bold">{openDeals}</span>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {PIPELINE_STAGES.map(stage => {
          const stageOrders = ordersByStage[stage.key] || [];
          const stageTotal = stageOrders.reduce((s, o) => s + (o.total || 0), 0);

          return (
            <div
              key={stage.key}
              className={`flex-shrink-0 w-72 rounded-xl border ${stage.bgColor} ${
                draggedId ? 'border-dashed border-primary/50' : 'border-border'
              }`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(stage.key)}
            >
              {/* Column Header */}
              <div className="p-3 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`h-3 w-3 rounded-full ${stage.color}`} />
                    <span className="font-semibold text-sm">
                      {language === 'ar' ? stage.labelAr : stage.label}
                    </span>
                    <Badge variant="secondary" className="text-xs h-5 px-1.5">
                      {stageOrders.length}
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stageTotal.toLocaleString()} SAR
                </p>
              </div>

              {/* Cards */}
              <ScrollArea className="h-[calc(100vh-320px)]">
                <div className="p-2 space-y-2">
                  {stageOrders.map(order => (
                    <DealCard
                      key={order.id}
                      order={order}
                      onDragStart={() => handleDragStart(order.id)}
                      onDragEnd={handleDragEnd}
                      isDragging={draggedId === order.id}
                      onView={() => navigate(`/sales-orders`)}
                      onViewCustomer={() => {
                        if (order.customer_id) navigate(`/customer-360?id=${order.customer_id}`);
                      }}
                    />
                  ))}
                  {stageOrders.length === 0 && (
                    <div className="text-center py-8 text-xs text-muted-foreground">
                      No deals
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DealCard({
  order,
  onDragStart,
  onDragEnd,
  isDragging,
  onView,
  onViewCustomer,
}: {
  order: any;
  onDragStart: () => void;
  onDragEnd: () => void;
  isDragging: boolean;
  onView: () => void;
  onViewCustomer: () => void;
}) {
  return (
    <Card
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`cursor-grab active:cursor-grabbing transition-all ${
        isDragging ? 'opacity-50 scale-95 rotate-2' : 'hover:shadow-md'
      }`}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-1.5">
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">SO-{order.doc_num}</span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onView}>
                <FileText className="h-4 w-4 mr-2" />View Order
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onViewCustomer}>
                <Eye className="h-4 w-4 mr-2" />Customer 360°
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <p className="font-semibold text-sm mt-1.5 truncate">{order.customer_name}</p>

        {order.contract_number && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{order.contract_number}</p>
        )}

        <div className="flex items-center justify-between mt-3">
          <span className="text-sm font-bold text-primary">
            {(order.total || 0).toLocaleString()} <span className="text-xs font-normal">{order.currency || 'SAR'}</span>
          </span>
          {order.workflow_status && order.workflow_status !== 'draft' && (
            <Badge variant="outline" className="text-xs h-5">
              {order.workflow_status.replace(/_/g, ' ')}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {new Date(order.doc_date).toLocaleDateString()}
          </span>
          {order.customer_code && (
            <span className="flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {order.customer_code}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
