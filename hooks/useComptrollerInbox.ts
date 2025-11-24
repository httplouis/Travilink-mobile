import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { Request } from '@/lib/types';

export function useComptrollerInbox(comptrollerId: string) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['comptroller-inbox', comptrollerId],
    queryFn: async (): Promise<Request[]> => {
      if (!comptrollerId) {
        return [];
      }

      // Create AbortController for request cancellation
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), 15000); // 15 second timeout

      try {
        // Fetch requests with status = pending_comptroller where comptroller_approved_at IS NULL
        // Also check comptroller_rejected_at to ensure we only get truly pending requests
        const { data: requests, error: requestsError } = await supabase
          .from('requests')
          .select(`
            *,
            department:departments!department_id(id, name, code)
          `)
          .eq('status', 'pending_comptroller')
          .is('comptroller_approved_at', null)
          .is('comptroller_rejected_at', null)
          .order('created_at', { ascending: false })
          .limit(50)
          .abortSignal(abortController.signal);

        clearTimeout(timeoutId);

        if (requestsError) {
          // Don't throw on abort errors - just return empty array
          if (requestsError.message?.includes('Aborted') || requestsError.message?.includes('abort')) {
            return [];
          }
          // Only log error if there's meaningful error info
          if (requestsError.code || requestsError.message) {
            console.error('[useComptrollerInbox] Error fetching requests:', {
              code: requestsError.code,
              message: requestsError.message,
            });
          }
          // Return empty array instead of throwing to prevent UI crashes
          return [];
        }

        return (requests || []) as Request[];
      } catch (err: any) {
        clearTimeout(timeoutId);
        // Handle abort errors gracefully
        if (err?.message?.includes('Aborted') || err?.message?.includes('abort') || err?.name === 'AbortError') {
          return [];
        }
        throw err;
      }
    },
    enabled: !!comptrollerId,
    refetchInterval: 10000, // Auto-refresh every 10 seconds (less aggressive)
    retry: 2, // Retry failed requests up to 2 times
    retryDelay: 1000, // Wait 1 second between retries
  });

  return {
    requests: data || [],
    isLoading,
    error,
    refetch,
  };
}

