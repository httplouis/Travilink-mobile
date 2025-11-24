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
  license_no?: string;
  license_expiry?: string;
  driver_rating?: number;
  phone?: string;
}

export function useDrivers(filters?: { status?: string }) {
  return useQuery({
    queryKey: ['drivers', filters],
    queryFn: async (): Promise<Driver[]> => {
      console.log('[useDrivers] 🔍 Fetching drivers with filters:', filters);
      
      // Try WITHOUT status filter first (most reliable), then with filter if needed
      let allDrivers: Driver[] = [];
      let attemptWithStatus = false;
      const wantsStatusFilter = filters?.status === 'active' || filters?.status === 'inactive';
      
      while (true) {
        // First, fetch users with driver role
        let query = supabase
          .from('users')
          .select('id, name, email, phone_number, profile_picture, status, position_title')
          .eq('role', 'driver')
          .order('name', { ascending: true });

        // Only apply status filter if user explicitly requested it AND we haven't tried without it yet
        // Start without status filter to avoid RLS issues
        if (wantsStatusFilter && attemptWithStatus && filters?.status) {
          if (filters.status === 'active') {
            query = query.eq('status', 'active');
            console.log('[useDrivers] 🔎 Filtering by status: active');
          } else if (filters.status === 'inactive') {
            query = query.eq('status', 'inactive');
            console.log('[useDrivers] 🔎 Filtering by status: inactive');
          }
        } else {
          console.log('[useDrivers] 📋 Fetching ALL drivers (no status filter)');
        }

        const { data: usersData, error: usersError } = await query;
        
        if (usersError) {
          console.error('[useDrivers] ❌ Users query error:', usersError);
          if (wantsStatusFilter && !attemptWithStatus) {
            attemptWithStatus = true;
            continue;
          }
          throw usersError;
        }
        
        if (!usersData || usersData.length === 0) {
          console.warn('[useDrivers] ⚠️ No users found with driver role');
          return [];
        }
        
        // Now fetch driver details from drivers table
        const userIds = usersData.map(u => u.id);
        const { data: driversData, error: driversError } = await supabase
          .from('drivers')
          .select('user_id, license_no, license_expiry, driver_rating, phone')
          .in('user_id', userIds);
        
        if (driversError) {
          console.warn('[useDrivers] ⚠️ Could not fetch driver details:', driversError);
          // Continue without driver details - return users only
        }
        
        // Create a map of driver details by user_id
        const driversMap = new Map();
        (driversData || []).forEach((d: any) => {
          driversMap.set(d.user_id, d);
        });
        
        // Combine user data with driver details
        const { data, error } = {
          data: usersData.map((user: any) => {
            const driverInfo = driversMap.get(user.id);
            return {
              ...user,
              license_no: driverInfo?.license_no || null,
              license_expiry: driverInfo?.license_expiry || null,
              driver_rating: driverInfo?.driver_rating || null,
              phone: driverInfo?.phone || user.phone_number || null,
            };
          }),
          error: null,
        };

        if (error) {
          console.error('[useDrivers] ❌ Query error:', error);
          console.error('[useDrivers] Error details:', JSON.stringify(error, null, 2));
          
          // If we got an error and haven't tried with status filter yet, try it
          if (wantsStatusFilter && !attemptWithStatus) {
            console.log('[useDrivers] 🔄 Retrying with status filter due to error...');
            attemptWithStatus = true;
            continue; // Retry with status filter
          }
          throw error;
        }
        
        allDrivers = (data || []) as Driver[];
        console.log('[useDrivers] ✅ Fetched drivers:', allDrivers.length);
        
        // If user wants status filter but we got results without it, try with filter
        if (wantsStatusFilter && !attemptWithStatus && allDrivers.length > 0) {
          console.log('[useDrivers] 🔄 Got drivers without filter, now trying with status filter as requested...');
          attemptWithStatus = true;
          continue; // Retry with status filter
        }
        
        // If we got no results and user wants status filter, try without it
        if (allDrivers.length === 0 && wantsStatusFilter && attemptWithStatus) {
          console.log('[useDrivers] ⚠️ No drivers found with status filter, trying without status filter...');
          attemptWithStatus = false;
          continue; // Retry without status filter
        }
        
        // We got results or already tried both ways, break
        break;
      }
      
      if (allDrivers.length > 0) {
        console.log('[useDrivers] Sample drivers:', allDrivers.slice(0, 3).map(d => d.name));
      } else {
        console.warn('[useDrivers] ⚠️ No drivers returned from query');
      }
      
      return allDrivers;
    },
    staleTime: 0, // Don't cache - always fetch fresh data
    gcTime: 0, // Don't keep in cache
    refetchInterval: 60000, // Refresh every minute
    refetchOnMount: true, // Always refetch when component mounts
  });
}

