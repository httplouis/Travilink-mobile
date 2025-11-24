import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Request } from '@/lib/types';

export interface PendingEvaluation extends Request {
  daysSinceCompletion: number;
  needsFeedback: boolean;
}

/**
 * Hook to check for completed trips that need feedback
 * Shows alert when trips are completed and feedback is pending
 */
export function usePendingEvaluations(userId: string) {
  const { data: pendingTrips = [], isLoading, refetch } = useQuery({
    queryKey: ['pending-evaluations', userId],
    queryFn: async (): Promise<PendingEvaluation[]> => {
      if (!userId || userId.trim() === '') {
        return [];
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Fetch approved requests where travel has ended
      const { data: completedRequests, error } = await supabase
        .from('requests')
        .select('*')
        .eq('requester_id', userId)
        .eq('status', 'approved')
        .lte('travel_end_date', today.toISOString().split('T')[0])
        .order('travel_end_date', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Check which ones need feedback
      const pendingEvaluations = await Promise.all(
        (completedRequests || []).map(async (request) => {
          const endDate = new Date(request.travel_end_date);
          const daysSince = Math.floor(
            (today.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24)
          );

          // Check if feedback exists (simplified - adjust based on your feedback table structure)
          let hasFeedback = false;
          try {
            // Check if there's a feedback entry for this request
            const { data: feedbackData } = await supabase
              .from('feedback')
              .select('id')
              .eq('request_id', request.id)
              .eq('user_id', userId)
              .limit(1);

            hasFeedback = (feedbackData?.length || 0) > 0;
          } catch {
            // If feedback table doesn't exist or query fails, assume no feedback
            hasFeedback = false;
          }

          return {
            ...request,
            daysSinceCompletion: daysSince,
            needsFeedback: !hasFeedback,
          } as PendingEvaluation;
        })
      );

      // Filter to only those that need feedback
      return pendingEvaluations.filter((trip) => trip.needsFeedback);
    },
    enabled: !!userId && userId.trim() !== '',
    refetchInterval: 300000, // Check every 5 minutes
  });

  return {
    pendingTrips,
    isLoading,
    refetch,
    count: pendingTrips.length,
  };
}

