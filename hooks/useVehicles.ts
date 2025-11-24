import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';

export interface Vehicle {
  id: string;
  vehicle_name: string;
  plate_number: string;
  vehicle_type: string; // Alias for 'type' field for component compatibility
  capacity: number;
  status: string;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
}

export function useVehicles(filters?: { status?: string; available?: boolean }) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['vehicles', filters],
    queryFn: async (): Promise<Vehicle[]> => {
      let query = supabase
        .from('vehicles')
        .select('*')
        .order('vehicle_name', { ascending: true });

      // Apply filters
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      // If available filter is true, only get vehicles with status 'available'
      if (filters?.available) {
        query = query.eq('status', 'available');
      }

      const { data: vehicles, error: vehiclesError } = await query;

      if (vehiclesError) {
        console.error('[useVehicles] Error fetching vehicles:', vehiclesError);
        throw vehiclesError;
      }

      // Transform to match Vehicle interface (map 'type' to 'vehicle_type' for component compatibility)
      return (vehicles || []).map((v: any) => ({
        ...v,
        vehicle_type: v.type || v.vehicle_type || 'car', // Map 'type' to 'vehicle_type'
      })) as Vehicle[];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  return {
    vehicles: data || [],
    isLoading,
    error,
    refetch,
  };
}
