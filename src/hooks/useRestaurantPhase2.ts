import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export function useRestaurantCustomers() {
  const { activeCompanyId } = useActiveCompany();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['rest-customers', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('rest_customer_profiles' as any).select('*')
        .eq('company_id', activeCompanyId!).order('customer_name'));
      if (error) throw error;
      return data as any[];
    },
    enabled: !!activeCompanyId,
  });

  const create = useMutation({
    mutationFn: async (c: any) => {
      const { error } = await (supabase.from('rest_customer_profiles' as any).insert({ company_id: activeCompanyId, ...c }));
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['rest-customers'] }); toast({ title: 'Customer created' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { error } = await (supabase.from('rest_customer_profiles' as any).update(updates).eq('id', id));
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['rest-customers'] }); toast({ title: 'Customer updated' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { ...query, create, update };
}

export function useRestaurantLoyalty() {
  const { activeCompanyId } = useActiveCompany();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const accounts = useQuery({
    queryKey: ['rest-loyalty-accounts', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('rest_loyalty_accounts' as any).select('*')
        .eq('company_id', activeCompanyId!).order('created_at', { ascending: false }));
      if (error) throw error;
      return data as any[];
    },
    enabled: !!activeCompanyId,
  });

  const transactions = useQuery({
    queryKey: ['rest-loyalty-transactions', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('rest_loyalty_transactions' as any).select('*')
        .order('created_at', { ascending: false }).limit(200));
      if (error) throw error;
      return data as any[];
    },
    enabled: !!activeCompanyId,
  });

  return { accounts, transactions };
}

export function useRestaurantRecipes() {
  const { activeCompanyId } = useActiveCompany();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['rest-recipes', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('rest_recipes' as any).select('*, rest_recipe_lines(*), rest_menu_items(item_name)')
        .eq('company_id', activeCompanyId!).order('created_at', { ascending: false }));
      if (error) throw error;
      return data as any[];
    },
    enabled: !!activeCompanyId,
  });

  const create = useMutation({
    mutationFn: async (recipe: any) => {
      const { lines, ...header } = recipe;
      const { data, error } = await (supabase.from('rest_recipes' as any)
        .insert({ company_id: activeCompanyId, ...header }).select().single() as any);
      if (error) throw error;
      if (lines?.length && data?.id) {
        const { error: lineErr } = await (supabase.from('rest_recipe_lines' as any)
          .insert(lines.map((l: any) => ({ recipe_id: data.id, ...l }))));
        if (lineErr) throw lineErr;
      }
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['rest-recipes'] }); toast({ title: 'Recipe created' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { ...query, create };
}

export function useRestaurantMenuEngineering() {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ['rest-menu-engineering', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('rest_menu_engineering' as any).select('*, rest_menu_items(item_name, base_price, rest_menu_categories(category_name))')
        .eq('company_id', activeCompanyId!).order('computed_at', { ascending: false }).limit(200));
      if (error) throw error;
      return data as any[];
    },
    enabled: !!activeCompanyId,
  });
}

export function useRestaurantStockConsumption(branchId?: string) {
  return useQuery({
    queryKey: ['rest-stock-consumption', branchId],
    queryFn: async () => {
      let q = supabase.from('rest_stock_consumption_log' as any).select('*')
        .order('created_at', { ascending: false }).limit(200);
      if (branchId) q = q.eq('branch_id', branchId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useRestaurantProcurementSuggestions(branchId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['rest-procurement-suggestions', branchId],
    queryFn: async () => {
      let q = supabase.from('rest_procurement_suggestions' as any).select('*')
        .order('urgency', { ascending: true }).limit(100);
      if (branchId) q = q.eq('branch_id', branchId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await (supabase.from('rest_procurement_suggestions' as any).update({ status }).eq('id', id));
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['rest-procurement-suggestions'] }); toast({ title: 'Status updated' }); },
  });

  return { ...query, updateStatus };
}

export function useRestaurantAggregatorOrders() {
  const { activeCompanyId } = useActiveCompany();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['rest-aggregator-orders', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('rest_aggregator_orders' as any)
        .select('*, rest_orders(order_number, grand_total)')
        .eq('company_id', activeCompanyId!).order('received_at', { ascending: false }).limit(100));
      if (error) throw error;
      return data as any[];
    },
    enabled: !!activeCompanyId,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: any) => {
      const updates: any = { status };
      if (status === 'accepted') updates.accepted_at = new Date().toISOString();
      if (status === 'ready') updates.ready_at = new Date().toISOString();
      if (status === 'picked_up') updates.picked_up_at = new Date().toISOString();
      if (status === 'delivered') updates.delivered_at = new Date().toISOString();
      const { error } = await (supabase.from('rest_aggregator_orders' as any).update(updates).eq('id', id));
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['rest-aggregator-orders'] }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { ...query, updateStatus };
}

export function useRestaurantComboMeals() {
  const { activeCompanyId } = useActiveCompany();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['rest-combos', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('rest_combo_meals' as any).select('*, rest_combo_meal_items(*)')
        .eq('company_id', activeCompanyId!).order('combo_name'));
      if (error) throw error;
      return data as any[];
    },
    enabled: !!activeCompanyId,
  });

  const create = useMutation({
    mutationFn: async (combo: any) => {
      const { items, ...header } = combo;
      const { data, error } = await (supabase.from('rest_combo_meals' as any)
        .insert({ company_id: activeCompanyId, ...header }).select().single() as any);
      if (error) throw error;
      if (items?.length && data?.id) {
        const { error: itemErr } = await (supabase.from('rest_combo_meal_items' as any)
          .insert(items.map((i: any) => ({ combo_id: data.id, ...i }))));
        if (itemErr) throw itemErr;
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['rest-combos'] }); toast({ title: 'Combo created' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { ...query, create };
}
