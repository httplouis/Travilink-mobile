import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { Request } from '@/lib/types';

export interface CompletedTrip extends Request {
  assigned_vehicle?: {
    vehicle_name: string;
    plate_number: string;
    type: string;
  } | null;
  assigned_driver?: {
    name: string;
  } | null;
  department?: {
    name: string;
  } | null;
  has_feedback?: boolean;
}

export function useCompletedTrips(userId: string) {
  return useQuery({
    queryKey: ['completed-trips', userId],
    queryFn: async (): Promise<CompletedTrip[]> => {
      if (!userId || userId.trim() === '') {
        return [];
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Fetch approved requests where travel has ended
      const { data, error } = await supabase
        .from('requests')
        .select('*')
        .eq('requester_id', userId)
        .eq('status', 'approved')
        .lte('travel_end_date', today.toISOString().split('T')[0])
        .order('travel_end_date', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Check for existing feedback (assuming feedback table exists)
      // For now, we'll fetch related data
      const tripsWithDetails = await Promise.all(
        (data || []).map(async (trip) => {
          const [vehicle, driver, department, feedback] = await Promise.all([
            trip.assigned_vehicle_id
              ? supabase
                  .from('vehicles')
                  .select('vehicle_name, plate_number, type')
                  .eq('id', trip.assigned_vehicle_id)
                  .single()
                  .then(({ data }) => data)
                  .catch(() => null)
              : Promise.resolve(null),
            trip.assigned_driver_id
              ? supabase
                  .from('users')
                  .select('name')
                  .eq('id', trip.assigned_driver_id)
                  .single()
                  .then(({ data }) => data)
                  .catch(() => null)
              : Promise.resolve(null),
            trip.department_id
              ? supabase
                  .from('departments')
                  .select('name')
                  .eq('id', trip.department_id)
                  .single()
                  .then(({ data }) => data)
                  .catch(() => null)
              : Promise.resolve(null),
            // Check if feedback exists (feedback table uses trip_id)
            // First check if there's a related trip
            trip.id
              ? supabase
                  .from('trips')
                  .select('id')
                  .eq('request_id', trip.id)
                  .single()
                  .then(({ data: tripData }) => {
                    if (!tripData) return false;
                    // Check if feedback exists for this trip
                    return supabase
                      .from('feedback')
                      .select('id')
                      .eq('trip_id', tripData.id)
                      .eq('user_id', userId)
                      .single()
                      .then(({ data }) => !!data)
                      .catch(() => false);
                  })
                  .catch(() => false)
              : Promise.resolve(false),
          ]);

          return {
            ...trip,
            assigned_vehicle: vehicle,
            assigned_driver: driver,
            department: department,
            has_feedback: feedback,
          } as CompletedTrip;
        })
      );

      return tripsWithDetails;
    },
    enabled: !!userId && userId.trim() !== '',
    refetchInterval: 60000, // Refresh every minute
  });
}

