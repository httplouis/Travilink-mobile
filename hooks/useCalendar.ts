import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { Booking, RequestStatus } from '@/lib/types';
import { extractDate, extractTime, mapVehicleType } from '@/lib/utils';

export function useCalendar(userId: string, startDate: Date, endDate: Date) {
  const queryResult = useQuery({
    queryKey: ['calendar', userId, startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      // Don't query if userId is empty or invalid
      if (!userId || userId.trim() === '') {
        return [];
      }

      const { data, error } = await supabase
        .from('requests')
        .select(`
          id,
          request_number,
          destination,
          purpose,
          travel_start_date,
          travel_end_date,
          status,
          department_id,
          assigned_vehicle_id,
          assigned_driver_id
        `)
        .eq('requester_id', userId)
        .in('status', ['approved', 'pending_admin', 'pending_exec', 'pending_hr'] as RequestStatus[])
        .gte('travel_start_date', startDate.toISOString())
        .lte('travel_end_date', endDate.toISOString())
        .order('travel_start_date', { ascending: true });

      if (error) throw error;

      // Fetch related data separately
      const bookingsWithDetails = await Promise.all(
        (data || []).map(async (req) => {
          // Fetch vehicle
          let vehicle = null;
          if (req.assigned_vehicle_id) {
            try {
              const { data: vehicleData } = await supabase
                .from('vehicles')
                .select('vehicle_name, plate_number, type')
                .eq('id', req.assigned_vehicle_id)
                .single();
              vehicle = vehicleData;
            } catch {}
          }

          // Fetch driver
          let driver = null;
          if (req.assigned_driver_id) {
            try {
              const { data: driverData } = await supabase
                .from('users')
                .select('name')
                .eq('id', req.assigned_driver_id)
                .single();
              driver = driverData;
            } catch {}
          }

          // Fetch department
          let department = null;
          if (req.department_id) {
            try {
              const { data: deptData } = await supabase
                .from('departments')
                .select('name')
                .eq('id', req.department_id)
                .single();
              department = deptData;
            } catch {}
          }

          return {
            ...req,
            assigned_vehicle: vehicle,
            assigned_driver: driver,
            department: department,
          };
        })
      );

      // Transform to Booking format
      const bookings: Booking[] = bookingsWithDetails.map((req: any) => ({
        id: req.request_number || req.id,
        dateISO: extractDate(req.travel_start_date),
        vehicle: mapVehicleType(req.assigned_vehicle?.type || 'van'),
        vehicleName: req.assigned_vehicle
          ? `${req.assigned_vehicle.vehicle_name} (${req.assigned_vehicle.plate_number})`
          : 'TBD',
        driver: req.assigned_driver?.name || 'TBD',
        department: req.department?.name || 'N/A',
        destination: req.destination,
        purpose: req.purpose || req.destination,
        departAt: extractTime(req.travel_start_date),
        returnAt: extractTime(req.travel_end_date),
        status: req.status,
      }));

      return bookings;
    },
    enabled: !!userId && userId.trim() !== '', // Only run query if userId is valid
  });

  return {
    data: queryResult.data || [],
    isLoading: queryResult.isLoading,
    error: queryResult.error,
    refetch: queryResult.refetch,
  };
}

