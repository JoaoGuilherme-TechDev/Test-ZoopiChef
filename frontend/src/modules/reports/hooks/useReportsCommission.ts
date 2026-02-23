import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { useToast } from '@/hooks/use-toast';

interface DateFilters {
  startDate: string;
  endDate: string;
}

export interface CommissionProfile {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  commission_percent: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmployeeWithCommission {
  id: string;
  name: string;
  role: string;
  department: string | null;
  commission_profile_id: string | null;
  commission_profile?: CommissionProfile;
  total_sales: number;
  total_orders: number;
  commission_amount: number;
}

export interface CommissionProfileSummary {
  profile_id: string;
  profile_name: string;
  commission_rate: number;
  employee_count: number;
  total_sales: number;
  total_commission: number;
}

export interface CommissionReportData {
  summaryByProfile: CommissionProfileSummary[];
  employeeDetails: EmployeeWithCommission[];
  totalSales: number;
  totalCommissions: number;
  periodStart: string;
  periodEnd: string;
}

export function useCommissionProfiles() {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ['commission-profiles', company?.id],
    queryFn: async (): Promise<CommissionProfile[]> => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from('commission_profiles')
        .select('*')
        .eq('company_id', company.id)
        .order('name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!company?.id,
  });
}

export function useSaveCommissionProfile() {
  const { company } = useCompanyContext();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (profile: Partial<CommissionProfile> & { name: string; commission_percent: number }) => {
      if (!company?.id) throw new Error('Empresa não encontrada');

      const payload = { ...profile, company_id: company.id };

      if (profile.id) {
        const { data, error } = await supabase
          .from('commission_profiles')
          .update(payload)
          .eq('id', profile.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('commission_profiles')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-profiles'] });
      toast({ title: 'Perfil de comissão salvo!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteCommissionProfile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (profileId: string) => {
      const { error } = await supabase.from('commission_profiles').delete().eq('id', profileId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-profiles'] });
      toast({ title: 'Perfil deletado!' });
    },
  });
}

export function useAssignCommissionProfile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ employeeId, profileId }: { employeeId: string; profileId: string | null }) => {
      const { error } = await supabase
        .from('employees')
        .update({ commission_profile_id: profileId })
        .eq('id', employeeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['commission-report'] });
      toast({ title: 'Perfil atribuído!' });
    },
  });
}

export function useCommissionReport(filters: DateFilters, selectedProfileId?: string) {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ['commission-report', company?.id, filters, selectedProfileId],
    queryFn: async (): Promise<CommissionReportData> => {
      if (!company?.id) {
        return { summaryByProfile: [], employeeDetails: [], totalSales: 0, totalCommissions: 0, periodStart: filters.startDate, periodEnd: filters.endDate };
      }

      const { data: profiles } = await supabase
        .from('commission_profiles')
        .select('*')
        .eq('company_id', company.id)
        .eq('is_active', true);

      let employeesQuery = supabase
        .from('employees')
        .select('id, name, role, department, commission_profile_id')
        .eq('company_id', company.id)
        .eq('is_active', true);

      if (selectedProfileId) {
        employeesQuery = employeesQuery.eq('commission_profile_id', selectedProfileId);
      }

      const { data: employees } = await employeesQuery;

      const { data: orders } = await supabase
        .from('orders')
        .select('id, total')
        .eq('company_id', company.id)
        .gte('created_at', filters.startDate)
        .lte('created_at', `${filters.endDate}T23:59:59`)
        .in('status', ['entregue', 'pronto']);

      const totalOrdersValue = (orders || []).reduce((sum, o) => sum + Number(o.total || 0), 0);
      const totalOrdersCount = orders?.length || 0;

      const employeeDetails: EmployeeWithCommission[] = (employees || []).map(emp => {
        const profile = profiles?.find(p => p.id === emp.commission_profile_id);
        
        let employeeTotalSales = 0;
        let employeeTotalOrders = 0;
        
        if (profile) {
          const employeesWithProfile = (employees || []).filter(e => e.commission_profile_id);
          if (employeesWithProfile.length > 0) {
            employeeTotalSales = totalOrdersValue / employeesWithProfile.length;
            employeeTotalOrders = Math.round(totalOrdersCount / employeesWithProfile.length);
          }
        }

        const commissionRate = profile?.commission_percent || 0;
        const commissionAmount = (employeeTotalSales * Number(commissionRate)) / 100;

        return {
          id: emp.id,
          name: emp.name,
          role: emp.role,
          department: emp.department,
          commission_profile_id: emp.commission_profile_id,
          commission_profile: profile ? { ...profile, commission_percent: Number(profile.commission_percent) } : undefined,
          total_sales: employeeTotalSales,
          total_orders: employeeTotalOrders,
          commission_amount: commissionAmount,
        };
      });

      const profileSummaryMap: Record<string, CommissionProfileSummary> = {};
      
      (profiles || []).forEach(profile => {
        profileSummaryMap[profile.id] = {
          profile_id: profile.id,
          profile_name: profile.name,
          commission_rate: Number(profile.commission_percent),
          employee_count: 0,
          total_sales: 0,
          total_commission: 0,
        };
      });

      profileSummaryMap['none'] = { profile_id: 'none', profile_name: 'Sem Perfil', commission_rate: 0, employee_count: 0, total_sales: 0, total_commission: 0 };

      employeeDetails.forEach(emp => {
        const profileId = emp.commission_profile_id || 'none';
        if (profileSummaryMap[profileId]) {
          profileSummaryMap[profileId].employee_count += 1;
          profileSummaryMap[profileId].total_sales += emp.total_sales;
          profileSummaryMap[profileId].total_commission += emp.commission_amount;
        }
      });

      const summaryByProfile = Object.values(profileSummaryMap).filter(p => p.employee_count > 0).sort((a, b) => b.total_commission - a.total_commission);
      const totalSales = employeeDetails.reduce((sum, e) => sum + e.total_sales, 0);
      const totalCommissions = employeeDetails.reduce((sum, e) => sum + e.commission_amount, 0);

      return { summaryByProfile, employeeDetails: employeeDetails.filter(e => e.commission_profile_id || e.total_sales > 0), totalSales, totalCommissions, periodStart: filters.startDate, periodEnd: filters.endDate };
    },
    enabled: !!company?.id,
  });
}

export function usePayCommission() {
  const { company } = useCompanyContext();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ employeeId, periodStart, periodEnd, commissionAmount, profileId, totalSales, totalOrders }: { employeeId: string; periodStart: string; periodEnd: string; commissionAmount: number; profileId?: string; totalSales: number; totalOrders: number }) => {
      if (!company?.id) throw new Error('Empresa não encontrada');
      const { data: { user } } = await supabase.auth.getUser();
      const commissionRate = totalSales > 0 ? (commissionAmount / totalSales) * 100 : 0;

      const { data, error } = await supabase
        .from('commission_calculations')
        .insert({
          company_id: company.id,
          employee_id: employeeId,
          commission_profile_id: profileId || null,
          period_start: periodStart,
          period_end: periodEnd,
          total_sales_cents: Math.round(totalSales * 100),
          total_orders: totalOrders,
          commission_rate: commissionRate,
          commission_amount_cents: Math.round(commissionAmount * 100),
          status: 'paid',
          paid_at: new Date().toISOString(),
          paid_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-report'] });
      toast({ title: 'Comissão paga!' });
    },
  });
}

export function useCommissionPaymentHistory(filters: DateFilters) {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ['commission-calculations', company?.id, filters],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('commission_calculations')
        .select('*, employee:employees(id, name, role), profile:commission_profiles(id, name)')
        .eq('company_id', company.id)
        .gte('period_start', filters.startDate)
        .lte('period_end', filters.endDate)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!company?.id,
  });
}
