import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';

// Simple Moving Average
function calculateSMA(data: number[], periods: number): number {
  if (data.length < periods) return data.reduce((a, b) => a + b, 0) / data.length;
  const slice = data.slice(-periods);
  return slice.reduce((a, b) => a + b, 0) / periods;
}

// Exponential Moving Average
function calculateEMA(data: number[], periods: number): number {
  const k = 2 / (periods + 1);
  let ema = data[0];
  for (let i = 1; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k);
  }
  return ema;
}

export function useSalesForecasts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();

  const { data: forecasts = [], isLoading } = useQuery({
    queryKey: ['sales-forecasts', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('sales_forecasts' as any).select('*').order('forecast_date', { ascending: false }) as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const generateForecast = useMutation({
    mutationFn: async ({ itemCode, method = 'sma', periods = 3 }: { itemCode: string; method?: 'sma' | 'ema'; periods?: number }) => {
      // Fetch historical AR invoice lines for this item
      const { data: lines = [] } = await supabase
        .from('ar_invoice_lines')
        .select('quantity, created_at, description')
        .eq('item_code', itemCode)
        .order('created_at', { ascending: true });

      if (lines.length === 0) throw new Error('No historical data for this item');

      // Group by month
      const monthlyQty: Record<string, number> = {};
      lines.forEach((l: any) => {
        const month = l.created_at.substring(0, 7);
        monthlyQty[month] = (monthlyQty[month] || 0) + (l.quantity || 0);
      });

      const sortedMonths = Object.keys(monthlyQty).sort();
      const quantities = sortedMonths.map(m => monthlyQty[m]);

      const forecast = method === 'ema' ? calculateEMA(quantities, periods) : calculateSMA(quantities, periods);

      // Generate next month forecast
      const now = new Date();
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const forecastDate = nextMonth.toISOString().split('T')[0];

      const { error } = await (supabase.from('sales_forecasts' as any).insert({
        item_code: itemCode,
        item_description: lines[0]?.description || itemCode,
        forecast_method: method,
        period_type: 'monthly',
        forecast_date: forecastDate,
        forecasted_qty: Math.round(forecast * 100) / 100,
        confidence_level: Math.min(95, 50 + quantities.length * 5),
        parameters: { periods, historical_months: sortedMonths.length, data_points: quantities },
        created_by: user?.id,
        ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
      }) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-forecasts'] });
      toast({ title: 'Forecast generated' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { forecasts, isLoading, generateForecast };
}

export function useItemReorderConfig() {
  const { activeCompanyId } = useActiveCompany();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['item-reorder-config', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('item_reorder_config' as any).select('*').order('item_code') as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const upsertConfig = useMutation({
    mutationFn: async (data: { item_code: string; item_description?: string; warehouse?: string; avg_daily_usage: number; max_daily_usage: number; avg_lead_time_days: number; max_lead_time_days: number; economic_order_qty?: number }) => {
      // Check if exists
      const { data: existing } = await (supabase.from('item_reorder_config' as any).select('id').eq('item_code', data.item_code).maybeSingle() as any);
      
      const record = { ...data, last_calculated_at: new Date().toISOString(), ...(activeCompanyId ? { company_id: activeCompanyId } : {}) };

      if (existing) {
        const { error } = await (supabase.from('item_reorder_config' as any).update(record).eq('id', existing.id) as any);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from('item_reorder_config' as any).insert(record) as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['item-reorder-config'] });
      toast({ title: 'Reorder config saved' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { configs, isLoading, upsertConfig };
}
