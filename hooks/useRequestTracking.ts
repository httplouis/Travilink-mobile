import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';

export interface RequestTrackingData {
  request: any;
  department: { id: string; name: string; code: string } | null;
  assignedVehicle: { id: string; vehicle_name: string; plate_number: string; type: string } | null;
  assignedDriver: { id: string; name: string } | null;
  
  // Approval data with names
  headApprover: { id: string; name: string } | null;
  parentHeadApprover: { id: string; name: string } | null;
  adminApprover: { id: string; name: string } | null;
  comptrollerApprover: { id: string; name: string } | null;
  hrApprover: { id: string; name: string } | null;
  vpApprover: { id: string; name: string } | null;
  presidentApprover: { id: string; name: string } | null;
  execApprover: { id: string; name: string } | null;
}

export function useRequestTracking(requestId: string) {
  return useQuery({
    queryKey: ['request-tracking', requestId],
    queryFn: async (): Promise<RequestTrackingData> => {
      if (!requestId || requestId.trim() === '') {
        throw new Error('Request ID is required');
      }

      // Fetch request
      const { data: request, error: requestError } = await supabase
        .from('requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (requestError) throw requestError;
      if (!request) throw new Error('Request not found');

      // Fetch all related data in parallel
      const [
        department,
        assignedVehicle,
        assignedDriver,
        headApprover,
        parentHeadApprover,
        adminApprover,
        comptrollerApprover,
        hrApprover,
        vpApprover,
        presidentApprover,
        execApprover,
      ] = await Promise.all([
        // Department
        request.department_id
          ? supabase
              .from('departments')
              .select('id, name, code')
              .eq('id', request.department_id)
              .single()
              .then(({ data }) => data)
              .catch(() => null)
          : Promise.resolve(null),

        // Assigned Vehicle
        request.assigned_vehicle_id
          ? supabase
              .from('vehicles')
              .select('id, vehicle_name, plate_number, type')
              .eq('id', request.assigned_vehicle_id)
              .single()
              .then(({ data }) => data)
              .catch(() => null)
          : Promise.resolve(null),

        // Assigned Driver
        request.assigned_driver_id
          ? supabase
              .from('users')
              .select('id, name')
              .eq('id', request.assigned_driver_id)
              .single()
              .then(({ data }) => data)
              .catch(() => null)
          : Promise.resolve(null),

        // Head Approver
        request.head_approved_by
          ? supabase
              .from('users')
              .select('id, name')
              .eq('id', request.head_approved_by)
              .single()
              .then(({ data }) => data)
              .catch(() => null)
          : Promise.resolve(null),

        // Parent Head Approver
        request.parent_head_approved_by
          ? supabase
              .from('users')
              .select('id, name')
              .eq('id', request.parent_head_approved_by)
              .single()
              .then(({ data }) => data)
              .catch(() => null)
          : Promise.resolve(null),

        // Admin Approver
        request.admin_processed_by
          ? supabase
              .from('users')
              .select('id, name')
              .eq('id', request.admin_processed_by)
              .single()
              .then(({ data }) => data)
              .catch(() => null)
          : Promise.resolve(null),

        // Comptroller Approver
        request.comptroller_approved_by
          ? supabase
              .from('users')
              .select('id, name')
              .eq('id', request.comptroller_approved_by)
              .single()
              .then(({ data }) => data)
              .catch(() => null)
          : Promise.resolve(null),

        // HR Approver
        request.hr_approved_by
          ? supabase
              .from('users')
              .select('id, name')
              .eq('id', request.hr_approved_by)
              .single()
              .then(({ data }) => data)
              .catch(() => null)
          : Promise.resolve(null),

        // VP Approver
        request.vp_approved_by
          ? supabase
              .from('users')
              .select('id, name')
              .eq('id', request.vp_approved_by)
              .single()
              .then(({ data }) => data)
              .catch(() => null)
          : Promise.resolve(null),

        // President Approver
        request.president_approved_by
          ? supabase
              .from('users')
              .select('id, name')
              .eq('id', request.president_approved_by)
              .single()
              .then(({ data }) => data)
              .catch(() => null)
          : Promise.resolve(null),

        // Exec Approver
        request.exec_approved_by
          ? supabase
              .from('users')
              .select('id, name')
              .eq('id', request.exec_approved_by)
              .single()
              .then(({ data }) => data)
              .catch(() => null)
          : Promise.resolve(null),
      ]);

      return {
        request,
        department,
        assignedVehicle,
        assignedDriver,
        headApprover,
        parentHeadApprover,
        adminApprover,
        comptrollerApprover,
        hrApprover,
        vpApprover,
        presidentApprover,
        execApprover,
      };
    },
    enabled: !!requestId && requestId.trim() !== '',
  });
}

