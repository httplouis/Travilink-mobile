import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { RequestStatus } from '@/lib/types';

export interface DashboardKPIs {
  activeRequests: number;
  vehiclesOnline: number;
  pendingApprovals: number;
}

export interface DashboardVehicle {
  id: string;
  vehicle_name: string;
  plate_number: string;
  type: string;
  capacity: number;
  photo_url?: string;
  status: string;
}

export interface DashboardDriver {
  id: string;
  name: string;
  email?: string;
  phone_number?: string;
  profile_picture?: string;
  status?: string;
  position_title?: string;
}

export interface DashboardTrip {
  id: string;
  request_number: string;
  destination: string;
  purpose: string;
  travel_start_date: string;
  travel_end_date: string;
  status: RequestStatus;
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
}

export function useDashboard(userId: string) {
  // Fetch KPIs
  const kpisQuery = useQuery({
    queryKey: ['dashboard-kpis', userId],
    queryFn: async (): Promise<DashboardKPIs> => {
      if (!userId || userId.trim() === '') {
        return { activeRequests: 0, vehiclesOnline: 0, pendingApprovals: 0 };
      }

      // Get active requests count
      const { count: activeCount } = await supabase
        .from('requests')
        .select('*', { count: 'exact', head: true })
        .eq('requester_id', userId)
        .in('status', ['pending_head', 'pending_parent_head', 'pending_admin', 'pending_comptroller', 'pending_hr', 'pending_vp', 'pending_president', 'pending_exec', 'approved'] as RequestStatus[]);

      // Get pending approvals count
      const { count: pendingCount } = await supabase
        .from('requests')
        .select('*', { count: 'exact', head: true })
        .eq('requester_id', userId)
        .in('status', ['pending_head', 'pending_parent_head', 'pending_admin', 'pending_comptroller', 'pending_hr', 'pending_vp', 'pending_president', 'pending_exec'] as RequestStatus[]);

      // Get available vehicles count
      const { count: vehiclesCount } = await supabase
        .from('vehicles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'available');

      return {
        activeRequests: activeCount || 0,
        vehiclesOnline: vehiclesCount || 0,
        pendingApprovals: pendingCount || 0,
      };
    },
    enabled: !!userId && userId.trim() !== '',
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch available vehicles
  const vehiclesQuery = useQuery({
    queryKey: ['dashboard-vehicles'],
    queryFn: async (): Promise<DashboardVehicle[]> => {
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, vehicle_name, plate_number, type, capacity, photo_url, status')
        .eq('status', 'available')
        .order('vehicle_name', { ascending: true })
        .limit(6);

      if (error) throw error;
      return (data || []) as DashboardVehicle[];
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch available drivers
  const driversQuery = useQuery({
    queryKey: ['dashboard-drivers'],
    queryFn: async (): Promise<DashboardDriver[]> => {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, phone_number, profile_picture, status, position_title')
        .eq('role', 'driver')
        .eq('status', 'active')
        .order('name', { ascending: true })
        .limit(6);

      if (error) throw error;
      return (data || []) as DashboardDriver[];
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch upcoming trips
  const tripsQuery = useQuery({
    queryKey: ['dashboard-trips', userId],
    queryFn: async (): Promise<DashboardTrip[]> => {
      if (!userId || userId.trim() === '') {
        return [];
      }

      const now = new Date();
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
        .gte('travel_start_date', now.toISOString())
        .order('travel_start_date', { ascending: true })
        .limit(6);

      if (error) throw error;

      // Fetch related data separately
      const tripsWithDetails = await Promise.all(
        (data || []).map(async (trip) => {
          const [vehicle, driver, department] = await Promise.all([
            trip.assigned_vehicle_id
              ? supabase.from('vehicles').select('vehicle_name, plate_number, type').eq('id', trip.assigned_vehicle_id).single().then(({ data }) => data).catch(() => null)
              : Promise.resolve(null),
            trip.assigned_driver_id
              ? supabase.from('users').select('name').eq('id', trip.assigned_driver_id).single().then(({ data }) => data).catch(() => null)
              : Promise.resolve(null),
            trip.department_id
              ? supabase.from('departments').select('name').eq('id', trip.department_id).single().then(({ data }) => data).catch(() => null)
              : Promise.resolve(null),
          ]);

          return {
            ...trip,
            assigned_vehicle: vehicle,
            assigned_driver: driver,
            department: department,
          } as DashboardTrip;
        })
      );

      return tripsWithDetails;
    },
    enabled: !!userId && userId.trim() !== '',
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  return {
    kpis: kpisQuery.data || { activeRequests: 0, vehiclesOnline: 0, pendingApprovals: 0 },
    kpisLoading: kpisQuery.isLoading,
    vehicles: vehiclesQuery.data || [],
    vehiclesLoading: vehiclesQuery.isLoading,
    drivers: driversQuery.data || [],
    driversLoading: driversQuery.isLoading,
    trips: tripsQuery.data || [],
    tripsLoading: tripsQuery.isLoading,
    isLoading: kpisQuery.isLoading || vehiclesQuery.isLoading || driversQuery.isLoading || tripsQuery.isLoading,
    refetch: () => {
      kpisQuery.refetch();
      vehiclesQuery.refetch();
      driversQuery.refetch();
      tripsQuery.refetch();
    },
  };
}

