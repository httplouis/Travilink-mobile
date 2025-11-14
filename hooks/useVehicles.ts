import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';

export interface Vehicle {
  id: string;
  vehicle_name: string;
  plate_number: string;
  type: 'van' | 'bus' | 'car' | 'motorcycle' | 'suv';
  capacity: number;
  photo_url?: string;
  status: 'available' | 'in_use' | 'maintenance' | 'inactive';
  notes?: string;
}

export function useVehicles(filters?: { status?: string; type?: string }) {
  return useQuery({
    queryKey: ['vehicles', filters],
    queryFn: async (): Promise<Vehicle[]> => {
      let query = supabase
        .from('vehicles')
        .select('*')
        .order('vehicle_name', { ascending: true });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.type) {
        query = query.eq('type', filters.type);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as Vehicle[];
    },
    refetchInterval: 60000, // Refresh every minute
  });
}

