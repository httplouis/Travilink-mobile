import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { Request } from '@/lib/types';

export function usePresidentInbox(presidentId: string) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['president-inbox', presidentId],
    queryFn: async (): Promise<Request[]> => {
      if (!presidentId) {
        return [];
      }

      // Create AbortController for request cancellation
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), 15000); // 15 second timeout

      try {
        // Fetch requests with status = pending_president where president_approved_at IS NULL
        const { data: requests, error: requestsError } = await supabase
          .from('requests')
          .select(`
            *,
            department:departments!department_id(id, name, code)
          `)
          .eq('status', 'pending_president')
          .is('president_approved_at', null)
          .order('created_at', { ascending: false })
          .limit(50)
          .abortSignal(abortController.signal);

        clearTimeout(timeoutId);

        if (requestsError) {
          // Don't throw on abort errors - just return empty array
          if (requestsError.message?.includes('Aborted') || requestsError.message?.includes('abort')) {
            return [];
          }
          throw requestsError;
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
    enabled: !!presidentId,
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

