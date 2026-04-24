import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useEffect } from 'react';

export function useRestaurantBranches() {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['rest-branches', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('rest_branches' as any).select('*, rest_brands(brand_name)')
        .eq('company_id', activeCompanyId!).order('branch_name'));
      if (error) throw error;
      return data as any[];
    },
    enabled: !!activeCompanyId,
  });
}

export function useRestaurantMenuCategories() {
  const { activeCompanyId } = useActiveCompany();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['rest-menu-categories', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('rest_menu_categories' as any).select('*')
        .eq('company_id', activeCompanyId!).order('display_order'));
      if (error) throw error;
      return data as any[];
    },
    enabled: !!activeCompanyId,
  });

  const create = useMutation({
    mutationFn: async (cat: any) => {
      const { error } = await (supabase.from('rest_menu_categories' as any).insert({ company_id: activeCompanyId, ...cat }));
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['rest-menu-categories'] }); toast({ title: 'Category created' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { ...query, create };
}

export function useRestaurantMenuItems() {
  const { activeCompanyId } = useActiveCompany();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['rest-menu-items', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('rest_menu_items' as any).select('*, rest_menu_categories(category_name)')
        .eq('company_id', activeCompanyId!).order('display_order'));
      if (error) throw error;
      return data as any[];
    },
    enabled: !!activeCompanyId,
  });

  const create = useMutation({
    mutationFn: async (item: any) => {
      const { error } = await (supabase.from('rest_menu_items' as any).insert({ company_id: activeCompanyId, ...item }));
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['rest-menu-items'] }); toast({ title: 'Menu item created' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { error } = await (supabase.from('rest_menu_items' as any).update(updates).eq('id', id));
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['rest-menu-items'] }); toast({ title: 'Item updated' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { ...query, create, update };
}

export function useRestaurantTables(branchId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['rest-tables', branchId],
    queryFn: async () => {
      let q = supabase.from('rest_tables' as any).select('*, rest_dining_areas(area_name)').order('table_number');
      if (branchId) q = q.eq('branch_id', branchId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
    enabled: !!branchId,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, current_order_id }: { id: string; status: string; current_order_id?: string | null }) => {
      const { error } = await (supabase.from('rest_tables' as any).update({ status, current_order_id }).eq('id', id));
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rest-tables'] }),
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Realtime
  useEffect(() => {
    if (!branchId) return;
    const ch = supabase.channel('rest-tables-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rest_tables' }, () => {
        queryClient.invalidateQueries({ queryKey: ['rest-tables'] });
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [branchId]);

  return { ...query, updateStatus };
}

export function useRestaurantOrders(branchId?: string) {
  const { activeCompanyId } = useActiveCompany();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['rest-orders', activeCompanyId, branchId],
    queryFn: async () => {
      let q = supabase.from('rest_orders' as any).select('*')
        .eq('company_id', activeCompanyId!).order('created_at', { ascending: false }).limit(200);
      if (branchId) q = q.eq('branch_id', branchId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
    enabled: !!activeCompanyId,
    refetchInterval: 15000,
  });

  const createOrder = useMutation({
    mutationFn: async (order: any) => {
      const { data, error } = await (supabase.from('rest_orders' as any)
        .insert({ company_id: activeCompanyId, ...order }).select().single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['rest-orders'] }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateOrder = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { error } = await (supabase.from('rest_orders' as any).update(updates).eq('id', id));
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rest-orders'] }),
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const addOrderLine = useMutation({
    mutationFn: async (line: any) => {
      const { error } = await (supabase.from('rest_order_lines' as any).insert(line));
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rest-orders'] }),
  });

  const addPayment = useMutation({
    mutationFn: async (payment: any) => {
      const { error } = await (supabase.from('rest_order_payments' as any).insert(payment));
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rest-orders'] }),
  });

  // Realtime
  useEffect(() => {
    if (!activeCompanyId) return;
    const ch = supabase.channel('rest-orders-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rest_orders' }, () => {
        queryClient.invalidateQueries({ queryKey: ['rest-orders'] });
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [activeCompanyId]);

  return { ...query, createOrder, updateOrder, addOrderLine, addPayment };
}

export function useRestaurantShifts(branchId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['rest-shifts', branchId],
    queryFn: async () => {
      let q = supabase.from('rest_shifts' as any).select('*').order('opened_at', { ascending: false }).limit(50);
      if (branchId) q = q.eq('branch_id', branchId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const openShift = useMutation({
    mutationFn: async (shift: any) => {
      const { data, error } = await (supabase.from('rest_shifts' as any).insert(shift).select().single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['rest-shifts'] }); toast({ title: 'Shift opened' }); },
  });

  const closeShift = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const { error } = await (supabase.from('rest_shifts' as any).update({ status: 'closed', closed_at: new Date().toISOString(), ...data }).eq('id', id));
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['rest-shifts'] }); toast({ title: 'Shift closed' }); },
  });

  return { ...query, openShift, closeShift };
}

export function useRestaurantKitchenTickets(branchId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['rest-kitchen-tickets', branchId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('rest_kitchen_tickets' as any)
        .select('*, rest_orders(order_number, order_type, table_id), rest_kitchen_ticket_lines(*)')
        .in('status', ['pending', 'preparing', 'ready'])
        .order('sent_at', { ascending: true }));
      if (error) throw error;
      return data as any[];
    },
    refetchInterval: 5000,
  });

  const updateTicketStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status };
      if (status === 'preparing') updates.preparing_at = new Date().toISOString();
      if (status === 'ready') updates.ready_at = new Date().toISOString();
      if (status === 'served') updates.served_at = new Date().toISOString();
      const { error } = await (supabase.from('rest_kitchen_tickets' as any).update(updates).eq('id', id));
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rest-kitchen-tickets'] }),
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Realtime
  useEffect(() => {
    const ch = supabase.channel('rest-kitchen-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rest_kitchen_tickets' }, () => {
        queryClient.invalidateQueries({ queryKey: ['rest-kitchen-tickets'] });
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  return { ...query, updateTicketStatus };
}

export function useRestaurantReservations(branchId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['rest-reservations', branchId],
    queryFn: async () => {
      let q = supabase.from('rest_reservations' as any).select('*, rest_tables(table_number)')
        .order('reservation_date', { ascending: true });
      if (branchId) q = q.eq('branch_id', branchId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const create = useMutation({
    mutationFn: async (res: any) => {
      const { error } = await (supabase.from('rest_reservations' as any).insert(res));
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['rest-reservations'] }); toast({ title: 'Reservation created' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await (supabase.from('rest_reservations' as any).update({ status }).eq('id', id));
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rest-reservations'] }),
  });

  return { ...query, create, updateStatus };
}

export function useRestaurantDeliveryOrders() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['rest-delivery-orders'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('rest_delivery_orders' as any)
        .select('*, rest_orders(order_number, grand_total, customer_name)')
        .order('created_at', { ascending: false }).limit(100));
      if (error) throw error;
      return data as any[];
    },
    refetchInterval: 10000,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, ...rest }: any) => {
      const updates: any = { status, ...rest };
      if (status === 'dispatched') updates.dispatched_at = new Date().toISOString();
      if (status === 'delivered') updates.delivered_at = new Date().toISOString();
      const { error } = await (supabase.from('rest_delivery_orders' as any).update(updates).eq('id', id));
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['rest-delivery-orders'] }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { ...query, updateStatus };
}

export function useRestaurantDashboardKPIs() {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ['rest-dashboard-kpis', activeCompanyId],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data: orders } = await (supabase.from('rest_orders' as any).select('grand_total, order_type, status, discount_amount, tax_amount, tip_amount, created_at')
        .eq('company_id', activeCompanyId!).gte('created_at', today + 'T00:00:00'));

      const allOrders = (orders || []) as any[];
      const completed = allOrders.filter((o: any) => o.status === 'completed' || o.status === 'closed');
      const totalSales = completed.reduce((s: number, o: any) => s + Number(o.grand_total || 0), 0);
      const totalOrders = completed.length;
      const avgOrder = totalOrders ? totalSales / totalOrders : 0;
      const totalDiscount = completed.reduce((s: number, o: any) => s + Number(o.discount_amount || 0), 0);
      const totalTax = completed.reduce((s: number, o: any) => s + Number(o.tax_amount || 0), 0);
      const totalTips = completed.reduce((s: number, o: any) => s + Number(o.tip_amount || 0), 0);

      const byChannel: Record<string, number> = {};
      completed.forEach((o: any) => { byChannel[o.order_type] = (byChannel[o.order_type] || 0) + Number(o.grand_total || 0); });

      const byHour: Record<number, number> = {};
      completed.forEach((o: any) => {
        const h = new Date(o.created_at).getHours();
        byHour[h] = (byHour[h] || 0) + 1;
      });

      return { totalSales, totalOrders, avgOrder, totalDiscount, totalTax, totalTips, byChannel, byHour };
    },
    enabled: !!activeCompanyId,
    refetchInterval: 30000,
  });
}

export function useRestaurantWasteEntries(branchId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['rest-waste', branchId],
    queryFn: async () => {
      let q = supabase.from('rest_waste_entries' as any).select('*').order('created_at', { ascending: false }).limit(100);
      if (branchId) q = q.eq('branch_id', branchId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const create = useMutation({
    mutationFn: async (entry: any) => {
      const { error } = await (supabase.from('rest_waste_entries' as any).insert(entry));
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['rest-waste'] }); toast({ title: 'Waste entry recorded' }); },
  });

  return { ...query, create };
}

export function useRestaurantPromotions() {
  const { activeCompanyId } = useActiveCompany();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['rest-promotions', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('rest_promotions' as any).select('*')
        .eq('company_id', activeCompanyId!).order('created_at', { ascending: false }));
      if (error) throw error;
      return data as any[];
    },
    enabled: !!activeCompanyId,
  });

  const create = useMutation({
    mutationFn: async (promo: any) => {
      const { error } = await (supabase.from('rest_promotions' as any).insert({ company_id: activeCompanyId, ...promo }));
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['rest-promotions'] }); toast({ title: 'Promotion created' }); },
  });

  return { ...query, create };
}
