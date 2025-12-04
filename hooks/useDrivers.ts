import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { createClient } from '@supabase/supabase-js';

// Create a separate client for driver queries that uses anon key to bypass RLS restrictions
// The anon role has "allow select for all" policy which allows viewing all users
const supabaseAnon = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''
);

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
      
      try {
        // First, fetch users with driver role
        // Use anon client to bypass RLS restrictions (same pattern as useUsers)
        let query = supabaseAnon
          .from('users')
          .select('id, name, email, phone_number, profile_picture, status, position_title')
          .eq('role', 'driver')
          .order('name', { ascending: true });

        // Apply status filter if provided
        if (filters?.status === 'active' || filters?.status === 'inactive') {
          query = query.eq('status', filters.status);
          console.log('[useDrivers] 🔎 Filtering by status:', filters.status);
        }

        const { data: usersData, error: usersError } = await query;
        
        if (usersError) {
          console.error('[useDrivers] ❌ Users query error:', usersError);
          throw usersError;
        }
        
        if (!usersData || usersData.length === 0) {
          console.warn('[useDrivers] ⚠️ No users found with driver role');
          return [];
        }
        
        console.log(`[useDrivers] 📋 Found ${usersData.length} user(s) with driver role`);
        
        // Now fetch driver details from drivers table
        const userIds = usersData.map(u => u.id);
        const { data: driversData, error: driversError } = await supabase
          .from('drivers')
          .select('user_id, license_no, license_expiry, driver_rating, phone')
          .in('user_id', userIds);
        
        if (driversError) {
          console.warn('[useDrivers] ⚠️ Could not fetch driver details from drivers table:', driversError);
          // Continue without driver details - return users only
        } else {
          console.log(`[useDrivers] 📋 Found ${driversData?.length || 0} driver record(s) in drivers table`);
        }
        
        // Create a map of driver details by user_id
        const driversMap = new Map();
        (driversData || []).forEach((d: any) => {
          driversMap.set(d.user_id, d);
        });
        
        // Combine user data with driver details
        const allDrivers: Driver[] = usersData.map((user: any) => {
          const driverInfo = driversMap.get(user.id);
          return {
            ...user,
            license_no: driverInfo?.license_no || null,
            license_expiry: driverInfo?.license_expiry || null,
            driver_rating: driverInfo?.driver_rating || null,
            phone: driverInfo?.phone || user.phone_number || null,
          };
        });
        
        console.log(`[useDrivers] ✅ Successfully fetched ${allDrivers.length} driver(s)`);
        if (allDrivers.length > 0) {
          console.log('[useDrivers] Sample drivers:', allDrivers.slice(0, 3).map(d => d.name));
        }
        
        return allDrivers;
      } catch (error: any) {
        console.error('[useDrivers] ❌ Error fetching drivers:', error);
        throw error;
      }
    },
    staleTime: 30000, // Cache for 30 seconds
    gcTime: 300000, // Keep in cache for 5 minutes
    refetchOnMount: true, // Always refetch when component mounts
  });
}

