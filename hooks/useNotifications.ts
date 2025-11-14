import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Notification } from '@/lib/types';

export function useNotifications(userId: string) {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['notifications', userId],
    queryFn: async () => {
      // Don't query if userId is empty or invalid
      if (!userId || userId.trim() === '') {
        return [];
      }

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!userId && userId.trim() !== '', // Only run query if userId is valid
  });

  // Set up real-time subscription
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('user-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('New notification:', payload);
          queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  return {
    notifications: data || [],
    isLoading,
    error,
    refetch,
  };
}

export function useMarkNotificationAsRead() {
  return async (notificationId: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId);

    if (error) throw error;
  };
}

export function useMarkAllNotificationsAsRead() {
  return async (notificationIds: string[]) => {
    if (notificationIds.length === 0) return;

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .in('id', notificationIds);

    if (error) throw error;
  };
}

