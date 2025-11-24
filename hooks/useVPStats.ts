import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';

export interface VPStats {
  pending: number;
  approvedToday: number;
  totalBudget: number;
  avgApprovalTime: string;
}

export function useVPStats() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['vp-stats'],
    queryFn: async (): Promise<VPStats> => {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      // Get pending review count
      const { count: pendingCount } = await supabase
        .from('requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending_exec')
        .or('exec_approved_at.is.null,exec_approved_at.is.null');

      // Get approved today
      const { count: approvedTodayCount } = await supabase
        .from('requests')
        .select('id', { count: 'exact', head: true })
        .not('exec_approved_at', 'is', null)
        .gte('exec_approved_at', todayStart.toISOString())
        .lte('exec_approved_at', todayEnd.toISOString());

      // Get total budget this month
      const { data: budgetData } = await supabase
        .from('requests')
        .select('total_budget')
        .not('exec_approved_at', 'is', null)
        .gte('exec_approved_at', monthStart.toISOString());

      const totalBudget = budgetData?.reduce((sum, req) => sum + (Number(req.total_budget) || 0), 0) || 0;

      // Calculate average approval time (simplified - would need approval timestamps)
      const avgApprovalTime = '2.5h'; // Placeholder - would calculate from approval history

      return {
        pending: pendingCount || 0,
        approvedToday: approvedTodayCount || 0,
        totalBudget,
        avgApprovalTime,
      };
    },
    refetchInterval: 30000,
  });

  return {
    stats: data || { pending: 0, approvedToday: 0, totalBudget: 0, avgApprovalTime: '0h' },
    isLoading,
    error,
    refetch,
  };
}


