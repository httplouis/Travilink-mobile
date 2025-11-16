import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';

export interface Driver {
  id: string;
  name: string;
  email: string;
  phone_number?: string;
  profile_picture?: string;
  status?: string;
  position_title?: string;
}

export function useDrivers(filters?: { status?: string }) {
  return useQuery({
    queryKey: ['drivers', filters],
    queryFn: async (): Promise<Driver[]> => {
      let query = supabase
        .from('users')
        .select('id, name, email, phone_number, profile_picture, status, position_title')
        .eq('role', 'driver')
        .order('name', { ascending: true });

      if (filters?.status) {
        if (filters.status === 'active') {
          query = query.eq('status', 'active');
        } else if (filters.status === 'inactive') {
          query = query.eq('status', 'inactive');
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as Driver[];
    },
    refetchInterval: 60000, // Refresh every minute
  });
}

