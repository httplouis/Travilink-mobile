import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { Request } from '@/lib/types';

export function useHeadInbox(headId: string, departmentId: string | null) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['head-inbox', headId, departmentId],
    queryFn: async (): Promise<Request[]> => {
      if (!headId || !departmentId) {
        if (__DEV__) {
          console.log('[useHeadInbox] Missing headId or departmentId:', { headId, departmentId });
        }
        return [];
      }

      // Validate departmentId is a valid UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(departmentId)) {
        if (__DEV__) {
          console.warn('[useHeadInbox] Invalid departmentId format (not a UUID):', departmentId);
        }
        return [];
      }

      if (__DEV__) {
        console.log('[useHeadInbox] Fetching inbox for head:', headId, 'department:', departmentId);
      }

      // Verify authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (__DEV__) {
          console.error('[useHeadInbox] No active session - user not authenticated');
        }
        throw new Error('User not authenticated');
      }
      if (__DEV__) {
        console.log('[useHeadInbox] User authenticated:', session.user.email);
      }

      // Create AbortController for request cancellation
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), 15000); // 15 second timeout

      try {

      // Fetch requests with status = pending_head or pending_parent_head
      // For pending_head: Filter by requester's department matching head's department
      // For pending_parent_head: Filter by request's parent_department_id matching head's department
      // Exclude requests where the head is the requester (heads don't approve their own requests)
      
        // First, get requests with pending_head status from head's department
        const { data: pendingHeadRequests, error: headError } = await supabase
          .from('requests')
          .select(`
            *,
            department:departments!department_id(id, name, code)
          `)
          .eq('status', 'pending_head')
          .eq('department_id', departmentId)
          .neq('requester_id', headId) // Exclude head's own requests
          .is('head_approved_at', null)
          .order('created_at', { ascending: false })
          .limit(50)
          .abortSignal(abortController.signal);

        if (headError) {
          // Don't throw on abort errors - just return empty array
          if (headError.message?.includes('Aborted') || headError.message?.includes('abort')) {
            if (__DEV__) {
              console.log('[useHeadInbox] Request aborted (likely component unmounted)');
            }
            return [];
          }
          // Log detailed error information only if meaningful
          if (__DEV__ && (headError.code || headError.message)) {
            console.error('[useHeadInbox] Error fetching pending_head requests:', {
              code: headError.code,
              message: headError.message,
              details: headError.details,
              hint: headError.hint,
            });
          }
          // Don't throw - return empty array to prevent UI crashes
          // The error will still be available in the hook's error state
          return [];
        }

        if (__DEV__) {
          console.log('[useHeadInbox] Found', pendingHeadRequests?.length || 0, 'pending_head requests');
        }

        // Then, get requests with pending_parent_head status where parent_department_id matches head's department
        const { data: pendingParentHeadRequests, error: parentHeadError } = await supabase
          .from('requests')
          .select(`
            *,
            department:departments!department_id(id, name, code)
          `)
          .eq('status', 'pending_parent_head')
          .eq('parent_department_id', departmentId)
          .is('parent_head_approved_at', null)
          .order('created_at', { ascending: false })
          .limit(50)
          .abortSignal(abortController.signal);

        if (parentHeadError) {
          // Don't throw on abort errors - just return empty array
          if (parentHeadError.message?.includes('Aborted') || parentHeadError.message?.includes('abort')) {
            if (__DEV__) {
              console.log('[useHeadInbox] Request aborted (likely component unmounted)');
            }
            return [];
          }
          // Log detailed error information
          if (__DEV__) {
            console.error('[useHeadInbox] Error fetching pending_parent_head requests:', {
              code: parentHeadError.code,
              message: parentHeadError.message,
              details: parentHeadError.details,
              hint: parentHeadError.hint,
            });
          }
          // Don't throw - return empty array to prevent UI crashes
          return [];
        }

        if (__DEV__) {
          console.log('[useHeadInbox] Found', pendingParentHeadRequests?.length || 0, 'pending_parent_head requests');
        }

        // Combine both results
        const requests = [
          ...(pendingHeadRequests || []),
          ...(pendingParentHeadRequests || []),
        ].sort((a, b) => {
          // Sort by created_at descending
          const dateA = new Date(a.created_at).getTime();
          const dateB = new Date(b.created_at).getTime();
          return dateB - dateA;
        }).slice(0, 50); // Limit to 50 total

        if (__DEV__) {
          console.log('[useHeadInbox] Returning', requests.length, 'total requests');
          if (requests.length > 0) {
            console.log('[useHeadInbox] Sample request numbers:', requests.slice(0, 3).map(r => r.request_number));
          }
        }

        clearTimeout(timeoutId);
        return (requests || []) as Request[];
      } catch (err: any) {
        clearTimeout(timeoutId);
        // Handle abort errors gracefully
        if (err?.message?.includes('Aborted') || err?.message?.includes('abort') || err?.name === 'AbortError') {
          if (__DEV__) {
            console.log('[useHeadInbox] Request was aborted');
          }
          return [];
        }
        // Log error but don't throw - return empty array to prevent UI crashes
        if (__DEV__) {
          console.error('[useHeadInbox] Unexpected error:', err);
        }
        return [];
      }
    },
    enabled: !!headId && !!departmentId,
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

