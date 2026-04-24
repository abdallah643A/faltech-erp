import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export interface PayrollPeriod {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  pay_date?: string | null;
  status?: string | null;
  total_gross?: number | null;
  total_deductions?: number | null;
  total_net?: number | null;
  processed_by?: string | null;
  processed_at?: string | null;
  created_at?: string;
}

export interface Payslip {
  id: string;
  payroll_period_id: string;
  employee_id: string;
  basic_salary: number | null;
  housing_allowance: number | null;
  transport_allowance: number | null;
  other_allowances: number | null;
  overtime_pay: number | null;
  bonus: number | null;
  gross_salary: number | null;
  gosi_deduction: number | null;
  tax_deduction: number | null;
  loan_deduction: number | null;
  other_deductions: number | null;
  total_deductions: number | null;
  net_salary: number | null;
  work_days: number | null;
  absent_days: number | null;
  overtime_hours: number | null;
  status: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  employee?: { id: string; first_name: string; last_name: string; employee_code: string } | null;
  payroll_period?: PayrollPeriod | null;
}

export function usePayrollPeriods() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const { data: payrollPeriods = [], isLoading } = useQuery({
    queryKey: ['payroll-periods', activeCompanyId],
    queryFn: async () => {
      let query = supabase.from('payroll_periods').select('*').order('start_date', { ascending: false });
      if (activeCompanyId) query = query.eq('company_id', activeCompanyId);
      const { data, error } = await query;
      if (error) throw error;
      return data as PayrollPeriod[];
    },
  });

  const createPayrollPeriod = useMutation({
    mutationFn: async (period: { name: string; start_date: string; end_date: string; pay_date?: string }) => {
      const { data, error } = await supabase
        .from('payroll_periods')
        .insert({ ...period, ...(activeCompanyId ? { company_id: activeCompanyId } : {}) })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-periods'] });
      toast({ title: 'Payroll period created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating payroll period', description: error.message, variant: 'destructive' });
    },
  });

  const processPayroll = useMutation({
    mutationFn: async (periodId: string) => {
      // Get all active employees with nationality for GOSI calculation
      let empQuery = supabase
        .from('employees')
        .select('*')
        .eq('employment_status', 'active');
      if (activeCompanyId) empQuery = empQuery.eq('company_id', activeCompanyId);
      const { data: employees, error: empError } = await empQuery;
      
      if (empError) throw empError;
      
      // Get period info
      const { data: period } = await supabase
        .from('payroll_periods')
        .select('*')
        .eq('id', periodId)
        .single();

      // Create payslips with KSA-compliant GOSI
      const payslips = employees.map(emp => {
        const basic = emp.basic_salary || 0;
        const housing = emp.housing_allowance || 0;
        const transport = emp.transport_allowance || 0;
        const other = emp.other_allowances || 0;
        
        // Overtime calculation: 1.5x for regular, 2x for holidays
        const overtimeHours = 0; // Will be filled from attendance
        const hourlyRate = basic / (30 * 8);
        const overtimePay = overtimeHours * hourlyRate * 1.5;
        
        const gross = basic + housing + transport + other + overtimePay;
        
        // KSA GOSI rates:
        // Saudi: Employee 10%, Employer 12% on basic+housing
        // Non-Saudi: Employee 0%, Employer 2% (GOSI Annuities only)
        const isSaudi = emp.nationality?.toLowerCase() === 'saudi' || 
                        emp.nationality?.toLowerCase() === 'سعودي' ||
                        emp.nationality === 'SA';
        
        const gosiBase = basic + housing; // GOSI calculated on basic + housing
        const gosiEmployeeRate = isSaudi ? 0.10 : 0; // 10% for Saudi, 0% for non-Saudi
        const gosiEmployerRate = isSaudi ? 0.12 : 0.02; // 12% Saudi, 2% non-Saudi
        const gosiDeduction = gosiBase * gosiEmployeeRate;
        const gosiEmployer = gosiBase * gosiEmployerRate; // For records/reporting
        
        const totalDeductions = gosiDeduction;
        const net = gross - totalDeductions;
        
        return {
          payroll_period_id: periodId,
          employee_id: emp.id,
          basic_salary: basic,
          housing_allowance: housing,
          transport_allowance: transport,
          other_allowances: other,
          overtime_pay: overtimePay,
          overtime_hours: overtimeHours,
          gross_salary: gross,
          gosi_deduction: gosiDeduction,
          total_deductions: totalDeductions,
          net_salary: net,
          work_days: 30,
          absent_days: 0,
          status: 'draft',
        };
      });
      
      const { error: slipError } = await supabase
        .from('payslips')
        .insert(payslips);
      
      if (slipError) throw slipError;
      
      // Calculate totals
      const totalGross = payslips.reduce((sum, p) => sum + (p.gross_salary || 0), 0);
      const totalDeductions = payslips.reduce((sum, p) => sum + (p.total_deductions || 0), 0);
      const totalNet = payslips.reduce((sum, p) => sum + (p.net_salary || 0), 0);
      
      // Update payroll period
      const { data, error: updateError } = await supabase
        .from('payroll_periods')
        .update({
          status: 'processed',
          total_gross: totalGross,
          total_deductions: totalDeductions,
          total_net: totalNet,
          processed_at: new Date().toISOString(),
        })
        .eq('id', periodId)
        .select()
        .single();
      
      if (updateError) throw updateError;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-periods'] });
      queryClient.invalidateQueries({ queryKey: ['payslips'] });
      toast({ title: 'Payroll processed successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error processing payroll', description: error.message, variant: 'destructive' });
    },
  });

  return { payrollPeriods, isLoading, createPayrollPeriod, processPayroll };
}

export function usePayslips(periodId?: string, employeeId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: payslips = [], isLoading } = useQuery({
    queryKey: ['payslips', periodId, employeeId],
    queryFn: async () => {
      let query = supabase
        .from('payslips')
        .select(`
          *,
          employee:employees(id, first_name, last_name, employee_code),
          payroll_period:payroll_periods(id, name, start_date, end_date, pay_date)
        `)
        .order('created_at', { ascending: false });
      
      if (periodId) {
        query = query.eq('payroll_period_id', periodId);
      }
      
      if (employeeId) {
        query = query.eq('employee_id', employeeId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as Payslip[];
    },
  });

  const updatePayslip = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Payslip> & { id: string }) => {
      const { data, error } = await supabase
        .from('payslips')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payslips'] });
      toast({ title: 'Payslip updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating payslip', description: error.message, variant: 'destructive' });
    },
  });

  return { payslips, isLoading, updatePayslip };
}
