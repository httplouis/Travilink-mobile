import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';

export interface ComptrollerStats {
  pending: number;
  approved: number;
  rejected: number;
  totalBudget: number;
}

export function useComptrollerStats() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['comptroller-stats'],
    queryFn: async (): Promise<ComptrollerStats> => {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      // Get pending reviews count
      const { count: pendingCount } = await supabase
        .from('requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending_comptroller')
        .is('comptroller_approved_at', null);

      // Get approved this month
      const { count: approvedCount } = await supabase
        .from('requests')
        .select('id', { count: 'exact', head: true })
        .not('comptroller_approved_at', 'is', null)
        .gte('comptroller_approved_at', monthStart.toISOString())
        .lte('comptroller_approved_at', monthEnd.toISOString());

      // Get rejected this month
      const { count: rejectedCount } = await supabase
        .from('requests')
        .select('id', { count: 'exact', head: true })
        .not('comptroller_rejected_at', 'is', null)
        .gte('comptroller_rejected_at', monthStart.toISOString())
        .lte('comptroller_rejected_at', monthEnd.toISOString());

      // Get total budget reviewed this month
      const { data: budgetData } = await supabase
        .from('requests')
        .select('total_budget, comptroller_edited_budget')
        .or(
          `comptroller_approved_at.gte.${monthStart.toISOString()},comptroller_rejected_at.gte.${monthStart.toISOString()}`
        )
        .or(
          `comptroller_approved_at.lte.${monthEnd.toISOString()},comptroller_rejected_at.lte.${monthEnd.toISOString()}`
        );

      const totalBudget = budgetData?.reduce((sum, req) => {
        const budget = req.comptroller_edited_budget || req.total_budget || 0;
        return sum + Number(budget);
      }, 0) || 0;

      return {
        pending: pendingCount || 0,
        approved: approvedCount || 0,
        rejected: rejectedCount || 0,
        totalBudget,
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  return {
    stats: data || { pending: 0, approved: 0, rejected: 0, totalBudget: 0 },
    isLoading,
    error,
    refetch,
  };
}


