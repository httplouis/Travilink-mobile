import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';

export interface PresidentStats {
  pending: number;
  approvedThisWeek: number;
  totalBudgetYTD: number;
  activeDepartments: number;
  highPriority: number;
  overrideCount: number;
}

export function usePresidentStats() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['president-stats'],
    queryFn: async (): Promise<PresidentStats> => {
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay()); // Start of week
      weekStart.setHours(0, 0, 0, 0);
      const yearStart = new Date(now.getFullYear(), 0, 1);

      // Get pending final reviews
      const { count: pendingCount } = await supabase
        .from('requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending_exec')
        .is('exec_approved_at', null);

      // Get approved this week
      const { count: approvedThisWeekCount } = await supabase
        .from('requests')
        .select('id', { count: 'exact', head: true })
        .not('exec_approved_at', 'is', null)
        .gte('exec_approved_at', weekStart.toISOString());

      // Get total budget YTD
      const { data: budgetData } = await supabase
        .from('requests')
        .select('total_budget')
        .not('exec_approved_at', 'is', null)
        .gte('exec_approved_at', yearStart.toISOString());

      const totalBudgetYTD = budgetData?.reduce((sum, req) => sum + (Number(req.total_budget) || 0), 0) || 0;

      // Get active departments (departments with requests this month)
      const { data: deptData } = await supabase
        .from('requests')
        .select('department_id')
        .gte('created_at', new Date(now.getFullYear(), now.getMonth(), 1).toISOString());

      const uniqueDepartments = new Set(deptData?.map(r => r.department_id).filter(Boolean) || []);
      const activeDepartments = uniqueDepartments.size;

      // High priority and override count (would need additional fields)
      const highPriority = 0;
      const overrideCount = 0;

      return {
        pending: pendingCount || 0,
        approvedThisWeek: approvedThisWeekCount || 0,
        totalBudgetYTD,
        activeDepartments,
        highPriority,
        overrideCount,
      };
    },
    refetchInterval: 30000,
  });

  return {
    stats: data || {
      pending: 0,
      approvedThisWeek: 0,
      totalBudgetYTD: 0,
      activeDepartments: 0,
      highPriority: 0,
      overrideCount: 0,
    },
    isLoading,
    error,
    refetch,
  };
}


