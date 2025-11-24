import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';

export interface Driver {
  id: string; // Use user_id as id for component compatibility
  user_id: string;
  license_number: string | null;
  license_expiry: string | null;
  status: string;
  user?: {
    id: string;
    name: string;
    email: string;
    profile_picture: string | null;
    position_title: string | null;
    status: string;
  };
}

export function useDrivers(filters?: { status?: string; available?: boolean }) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['drivers', filters],
    queryFn: async (): Promise<Driver[]> => {
      let query = supabase
        .from('drivers')
        .select(`
          user_id,
          license_no,
          license_expiry,
          user:users!drivers_user_id_fkey(
            id,
            name,
            email,
            profile_picture,
            position_title,
            status,
            created_at
          )
        `)
        .order('user.created_at', { ascending: false });

      // Apply filters on user status (drivers table doesn't have status field)
      if (filters?.status) {
        query = query.eq('user.status', filters.status);
      }

      // If available filter is true, only get drivers with user status 'active'
      if (filters?.available) {
        query = query.eq('user.status', 'active');
      }

      const { data: drivers, error: driversError } = await query;

      if (driversError) {
        console.error('[useDrivers] Error fetching drivers:', driversError);
        throw driversError;
      }

      // Transform to match Driver interface (use user_id as id for component compatibility)
      return (drivers || []).map((d: any) => ({
        id: d.user_id, // Use user_id as id for component compatibility
        user_id: d.user_id,
        license_number: d.license_no || null, // Map license_no to license_number
        license_expiry: d.license_expiry || null,
        status: d.user?.status || 'active',
        user: d.user || null,
      })) as Driver[];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  return {
    drivers: data || [],
    isLoading,
    error,
    refetch,
  };
}
