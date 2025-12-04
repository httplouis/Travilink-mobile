import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { Booking, RequestStatus } from '@/lib/types';
import { extractDate, extractTime, mapVehicleType } from '@/lib/utils';

export function useCalendar(userId: string, startDate: Date, endDate: Date) {
  const queryResult = useQuery({
    // Remove userId from query key - calendar shows ALL requests for everyone
    // This ensures all users see the same calendar data
    queryKey: ['calendar', 'all', startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      // Fetch all approved/pending requests within date range (not just user's requests)
      // This matches web version behavior - showing all bookings on the calendar
      // Include more statuses to show all relevant requests
      // NOTE: userId parameter is kept for backward compatibility but not used in query
      
      // Set proper date boundaries (start of day to end of day)
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      // Query for requests where travel dates overlap with the date range
      // A request overlaps if: travel_start_date <= endDate AND travel_end_date >= startDate
      // This means the trip starts before or on the end date, AND ends after or on the start date
      // Using both .lte() and .gte() creates an AND condition (both must be true)
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
          assigned_driver_id,
          requester_id,
          request_type
        `)
        .in('status', [
          'approved', 
          'pending_admin', 
          'pending_exec', 
          'pending_hr', 
          'pending_head',
          'pending_vp',
          'pending_president',
          'pending_comptroller'
        ] as RequestStatus[])
        // Overlap condition: travel_start_date <= endDate AND travel_end_date >= startDate
        // Both conditions must be true for overlap
        .lte('travel_start_date', `${endDateStr}T23:59:59.999Z`)
        .gte('travel_end_date', `${startDateStr}T00:00:00.000Z`)
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
      // IMPORTANT: For multi-day trips, we need to create a booking entry for EACH day
      // This ensures the calendar shows the trip on all days it spans
      const bookings: Booking[] = [];
      
      bookingsWithDetails.forEach((req: any) => {
        if (!req.travel_start_date) {
          console.warn('[useCalendar] Request missing travel_start_date:', req.request_number || req.id);
          return;
        }
        
        const startDateISO = extractDate(req.travel_start_date);
        const endDateISO = req.travel_end_date ? extractDate(req.travel_end_date) : startDateISO;
        
        // Parse dates - use UTC to avoid timezone issues
        const startDate = new Date(startDateISO + 'T00:00:00.000Z');
        const endDate = new Date(endDateISO + 'T23:59:59.999Z');
        
        // Ensure endDate is not before startDate
        if (endDate < startDate) {
          console.warn('[useCalendar] Invalid date range for request:', req.request_number || req.id, 'start:', startDateISO, 'end:', endDateISO);
          // Use startDate as endDate if invalid
          bookings.push({
            id: `${req.request_number || req.id}-${startDateISO}`,
            dateISO: startDateISO,
            endDateISO: startDateISO,
            vehicle: mapVehicleType(req.assigned_vehicle?.type || 'van'),
            vehicleName: req.assigned_vehicle
              ? `${req.assigned_vehicle.vehicle_name} (${req.assigned_vehicle.plate_number})`
              : 'TBD',
            driver: req.assigned_driver?.name || 'TBD',
            department: req.department?.name || 'N/A',
            destination: req.destination,
            purpose: req.purpose || req.destination,
            departAt: extractTime(req.travel_start_date),
            returnAt: extractTime(req.travel_end_date || req.travel_start_date),
            status: req.status,
          });
          return;
        }
        
        // Create a booking entry for each day in the date range
        // Use UTC dates to avoid timezone/DST issues
        let currentDate = new Date(startDate);
        while (currentDate <= endDate) {
          const dateISO = currentDate.toISOString().split('T')[0];
          
          bookings.push({
            id: `${req.request_number || req.id}-${dateISO}`, // Unique ID per day
            dateISO: dateISO,
            endDateISO: endDateISO,
            vehicle: mapVehicleType(req.assigned_vehicle?.type || 'van'),
            vehicleName: req.assigned_vehicle
              ? `${req.assigned_vehicle.vehicle_name} (${req.assigned_vehicle.plate_number})`
              : 'TBD',
            driver: req.assigned_driver?.name || 'TBD',
            department: req.department?.name || 'N/A',
            destination: req.destination,
            purpose: req.purpose || req.destination,
            departAt: extractTime(req.travel_start_date),
            returnAt: extractTime(req.travel_end_date || req.travel_start_date),
            status: req.status,
          });
          
          // Move to next day using UTC to avoid DST issues
          currentDate = new Date(currentDate);
          currentDate.setUTCDate(currentDate.getUTCDate() + 1);
        }
      });

      return bookings;
    },
    enabled: true, // Always enabled - calendar shows all requests regardless of user
  });

  return {
    data: queryResult.data || [],
    isLoading: queryResult.isLoading,
    error: queryResult.error,
    refetch: queryResult.refetch,
  };
}

