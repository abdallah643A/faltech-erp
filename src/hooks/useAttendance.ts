import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  attendance_date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  check_in_location: string | null;
  check_out_location: string | null;
  check_in_latitude: number | null;
  check_in_longitude: number | null;
  check_out_latitude: number | null;
  check_out_longitude: number | null;
  status: string | null;
  work_hours: number | null;
  overtime_hours: number | null;
  notes: string | null;
  created_at: string;
  employee?: { id: string; first_name: string; last_name: string; employee_code: string } | null;
}

export function useAttendance(employeeId?: string, startDate?: string, endDate?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const { data: attendance = [], isLoading } = useQuery({
    queryKey: ['attendance', employeeId, startDate, endDate, activeCompanyId],
    queryFn: async () => {
      let query = supabase
        .from('attendance')
        .select(`
          *,
          employee:employees(id, first_name, last_name, employee_code)
        `)
        .order('attendance_date', { ascending: false });
      if (activeCompanyId) query = query.eq('company_id', activeCompanyId);
      
      if (employeeId) {
        query = query.eq('employee_id', employeeId);
      }
      
      if (startDate) {
        query = query.gte('attendance_date', startDate);
      }
      
      if (endDate) {
        query = query.lte('attendance_date', endDate);
      }
      
      const { data, error } = await query.limit(500);
      
      if (error) throw error;
      return data as AttendanceRecord[];
    },
  });

  const checkIn = useMutation({
    mutationFn: async ({ 
      employee_id, 
      latitude, 
      longitude, 
      location 
    }: { 
      employee_id: string; 
      latitude?: number; 
      longitude?: number; 
      location?: string;
    }) => {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('attendance')
        .upsert({
          employee_id,
          attendance_date: today,
          check_in_time: now.toISOString(),
          check_in_latitude: latitude,
          check_in_longitude: longitude,
          check_in_location: location,
          status: 'present',
        }, {
          onConflict: 'employee_id,attendance_date',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast({ title: 'Checked in successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error checking in', description: error.message, variant: 'destructive' });
    },
  });

  const checkOut = useMutation({
    mutationFn: async ({ 
      employee_id, 
      latitude, 
      longitude, 
      location 
    }: { 
      employee_id: string; 
      latitude?: number; 
      longitude?: number; 
      location?: string;
    }) => {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      
      // Get existing attendance record
      const { data: existing } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', employee_id)
        .eq('attendance_date', today)
        .single();
      
      let workHours = 0;
      if (existing?.check_in_time) {
        const checkInTime = new Date(existing.check_in_time);
        workHours = (now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
      }
      
      const overtimeHours = Math.max(0, workHours - 8);
      
      const { data, error } = await supabase
        .from('attendance')
        .update({
          check_out_time: now.toISOString(),
          check_out_latitude: latitude,
          check_out_longitude: longitude,
          check_out_location: location,
          work_hours: Math.round(workHours * 100) / 100,
          overtime_hours: Math.round(overtimeHours * 100) / 100,
        })
        .eq('employee_id', employee_id)
        .eq('attendance_date', today)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast({ title: 'Checked out successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error checking out', description: error.message, variant: 'destructive' });
    },
  });

  const updateAttendance = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AttendanceRecord> & { id: string }) => {
      const { data, error } = await supabase
        .from('attendance')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast({ title: 'Attendance updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating attendance', description: error.message, variant: 'destructive' });
    },
  });

  return { attendance, isLoading, checkIn, checkOut, updateAttendance };
}
