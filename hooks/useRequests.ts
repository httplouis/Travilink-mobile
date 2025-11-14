import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Request } from '@/lib/types';

export function useRequests(userId: string) {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['requests', userId],
    queryFn: async () => {
      // Don't query if userId is empty or invalid
      if (!userId || userId.trim() === '') {
        return [];
      }

      const { data, error } = await supabase
        .from('requests')
        .select('*')
        .eq('requester_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Fetch departments separately for each request to avoid FK join issues
      const requestsWithDepartments = await Promise.all(
        (data || []).map(async (req) => {
          if (req.department_id) {
            try {
              const { data: deptData } = await supabase
                .from('departments')
                .select('id, code, name')
                .eq('id', req.department_id)
                .single();
              
              return {
                ...req,
                department: deptData || null,
              };
            } catch {
              return { ...req, department: null };
            }
          }
          return { ...req, department: null };
        })
      );

      return requestsWithDepartments as Request[];
    },
    enabled: !!userId && userId.trim() !== '', // Only run query if userId is valid
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  });

  // Set up real-time subscription
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('user-requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'requests',
          filter: `requester_id=eq.${userId}`,
        },
        (payload) => {
          console.log('Real-time update:', payload);
          
          // Invalidate and refetch
          queryClient.invalidateQueries({ queryKey: ['requests', userId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  return {
    requests: data || [],
    isLoading,
    error,
    refetch,
  };
}

