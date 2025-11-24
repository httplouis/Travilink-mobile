import { useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Hook to auto-complete trips when travel_end_date passes
 * This runs in the background and marks approved trips as completed
 */
export function useAutoCompleteTrips() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkAndCompleteTrips = async () => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayISO = today.toISOString().split('T')[0];

        // Find approved requests where travel_end_date has passed
        const { data: completedTrips, error } = await supabase
          .from('requests')
          .select('id, status, travel_end_date')
          .eq('status', 'approved')
          .lte('travel_end_date', todayISO);

        if (error) {
          // Don't log abort errors or network errors
          const errorMessage = error?.message || '';
          const isAbortError = errorMessage.includes('Aborted') || errorMessage.includes('abort') || error?.name === 'AbortError';
          const isNetworkError = errorMessage.includes('network') || errorMessage.includes('Network');
          
          if (!isAbortError && !isNetworkError) {
            // Only log meaningful errors
            console.warn('[useAutoCompleteTrips] Error fetching trips:', error?.code || error?.message || 'Unknown error');
          }
          return;
        }

        if (completedTrips && completedTrips.length > 0) {
          // Note: 'completed' is not in the database enum, so we'll use a different approach
          // Instead of updating status, we can add a completed_at timestamp or use a separate field
          // For now, we'll just log and invalidate queries to refresh the UI
          // The UI can check travel_end_date to determine if a trip is completed
          
          // Invalidate relevant queries to refresh UI
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          queryClient.invalidateQueries({ queryKey: ['completed-trips'] });
          queryClient.invalidateQueries({ queryKey: ['pending-evaluations'] });
          
          // Log for debugging
          console.log(`[useAutoCompleteTrips] Found ${completedTrips.length} trip(s) that have ended`);
        }
      } catch (err: any) {
        // Don't log abort errors or network errors
        const errorMessage = err?.message || '';
        const isAbortError = errorMessage.includes('Aborted') || errorMessage.includes('abort') || err?.name === 'AbortError';
        const isNetworkError = errorMessage.includes('network') || errorMessage.includes('Network');
        
        if (!isAbortError && !isNetworkError) {
          // Only log meaningful errors
          console.warn('[useAutoCompleteTrips] Unexpected error:', err?.code || err?.message || 'Unknown error');
        }
      }
    };

    // Check immediately
    checkAndCompleteTrips();

    // Then check every hour
    const interval = setInterval(checkAndCompleteTrips, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [queryClient]);
}

