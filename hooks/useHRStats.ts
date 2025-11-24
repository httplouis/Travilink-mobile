import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';

export interface HRStats {
  pending: number;
  approvedToday: number;
  totalBudget: number;
}

export function useHRStats() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['hr-stats'],
    queryFn: async (): Promise<HRStats> => {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

      // Get pending HR reviews
      const { count: pendingCount } = await supabase
        .from('requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending_hr')
        .is('hr_approved_at', null);

      // Get approved today
      const { count: approvedTodayCount } = await supabase
        .from('requests')
        .select('id', { count: 'exact', head: true })
        .not('hr_approved_at', 'is', null)
        .gte('hr_approved_at', todayStart.toISOString())
        .lte('hr_approved_at', todayEnd.toISOString());

      // Get total budget (simplified)
      const totalBudget = 0; // Would calculate from approved requests

      return {
        pending: pendingCount || 0,
        approvedToday: approvedTodayCount || 0,
        totalBudget,
      };
    },
    refetchInterval: 30000,
  });

  return {
    stats: data || { pending: 0, approvedToday: 0, totalBudget: 0 },
    isLoading,
    error,
    refetch,
  };
}


