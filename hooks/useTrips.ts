import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Trip {
  id: string;
  request_id: string;
  driver_id: string | null;
  vehicle_id: string | null;
  departure_date: string;
  return_date: string;
  actual_departure: string | null;
  actual_return: string | null;
  destination: string;
  purpose: string;
  department_id: string | null;
  passengers: any;
  passenger_count: number | null;
  trip_status: string;
  distance_km: number | null;
  fuel_used: number | null;
  trip_notes: string | null;
  created_at: string;
  updated_at: string;
  request?: {
    id: string;
    request_number: string;
    requester_name: string;
    status: string;
  };
  vehicle?: {
    id: string;
    vehicle_name: string;
    plate_number: string;
  };
  driver?: {
    id: string;
    name: string;
  };
}

export function useTrips(userId?: string) {
  const { profile } = useAuth();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['trips', userId || profile?.id],
    queryFn: async (): Promise<Trip[]> => {
      if (!userId && !profile?.id) {
        return [];
      }

      const targetUserId = userId || profile?.id;

      // Fetch trips linked to requests where user is requester
      const { data: trips, error: tripsError } = await supabase
        .from('trips')
        .select(`
          *,
          request:requests!trips_request_id_fkey(
            id,
            request_number,
            requester_name,
            status
          ),
          vehicle:vehicles!trips_vehicle_id_fkey(
            id,
            vehicle_name,
            plate_number
          ),
          driver:users!trips_driver_id_fkey(
            id,
            name
          )
        `)
        .order('departure_date', { ascending: false })
        .limit(100);

      if (tripsError) {
        console.error('[useTrips] Error fetching trips:', tripsError);
        throw tripsError;
      }

      // Filter trips where the request's requester_id matches the user
      // We need to check the request relation
      const { data: userRequests } = await supabase
        .from('requests')
        .select('id')
        .eq('requester_id', targetUserId);

      const requestIds = userRequests?.map(r => r.id) || [];

      const filteredTrips = (trips || []).filter((trip: any) => 
        requestIds.includes(trip.request_id)
      ) as Trip[];

      return filteredTrips;
    },
    enabled: !!userId || !!profile?.id,
    refetchInterval: 10000, // Auto-refresh every 10 seconds
  });

  return {
    trips: data || [],
    isLoading,
    error,
    refetch,
  };
}

