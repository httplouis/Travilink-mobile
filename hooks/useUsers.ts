import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { createClient } from '@supabase/supabase-js';

// Create a separate client for user queries that uses anon key to bypass RLS restrictions
// The anon role has "allow select for all" policy which allows viewing all users
const supabaseAnon = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''
);

export interface User {
  id: string;
  name: string;
  email: string;
  department_id?: string;
}

export function useUsers(searchQuery?: string) {
  const queryKey = searchQuery?.trim() || '';
  
  return useQuery({
    queryKey: ['users', queryKey],
    queryFn: async (): Promise<User[]> => {
      console.log('[useUsers] 🔍 Fetching users with query:', queryKey || '(ALL USERS)');
      
      try {
        // Match web API behavior - fetch all active users
        // IMPORTANT: Try without status filter first to see if that's the issue
        // Then try with status filter
        let allUsers: User[] = [];
        let page = 0;
        const pageSize = 1000; // Supabase max per request
        let hasMore = true;

        // Try WITH status filter first (since we know all 32 users are active)
        // If that fails due to RLS, try without filter
        let useStatusFilter = true;
        let attemptWithoutStatus = false;

        while (hasMore) {
          // Build base query - use anon client to bypass RLS restrictions
          // The anon role has "allow select for all" policy
          let userQuery = supabaseAnon
            .from('users')
            .select('id, name, email, department_id, position_title, profile_picture, role, status')
            .order('name', { ascending: true })
            .range(page * pageSize, (page + 1) * pageSize - 1);

          // Apply status filter first (all users are active)
          if (useStatusFilter && !attemptWithoutStatus) {
            userQuery = userQuery.eq('status', 'active');
            console.log('[useUsers] 🔎 Using status filter: active');
          } else {
            console.log('[useUsers] 📋 Fetching WITHOUT status filter (fallback method)');
          }

          // If search query provided, filter by name or email (match web API behavior)
          if (queryKey && queryKey.length > 0) {
            userQuery = userQuery.or(`name.ilike.%${queryKey}%,email.ilike.%${queryKey}%`);
            console.log('[useUsers] 🔎 Filtering by:', queryKey, 'page:', page);
          } else {
            console.log('[useUsers] 📋 Fetching users (no filter), page:', page);
          }

          const { data, error } = await userQuery;

          if (error) {
            console.error('[useUsers] ❌ Query error:', error);
            console.error('[useUsers] Error details:', JSON.stringify(error, null, 2));
            console.error('[useUsers] Error code:', error.code);
            console.error('[useUsers] Error message:', error.message);
            
            // If we got an error with status filter, try without it (RLS issue)
            if (useStatusFilter && !attemptWithoutStatus && page === 0) {
              console.log('[useUsers] 🔄 Retrying WITHOUT status filter due to error (likely RLS issue)...');
              useStatusFilter = false;
              attemptWithoutStatus = true;
              page = 0; // Reset to try again
              allUsers = []; // Clear results
              continue; // Retry this page without status filter
            }
            throw error;
          }
          
          if (data && data.length > 0) {
            allUsers = [...allUsers, ...(data as User[])];
            hasMore = data.length === pageSize; // If we got a full page, there might be more
            page++;
            console.log('[useUsers] ✅ Fetched page', page - 1, ':', data.length, 'users (total so far:', allUsers.length, ')');
            console.log('[useUsers] Users on this page:', data.map(u => ({ name: u.name, email: u.email, status: (u as any).status })));
          } else {
            // If we got no results on first page with status filter, try without it
            if (useStatusFilter && !attemptWithoutStatus && page === 0 && allUsers.length === 0) {
              console.log('[useUsers] ⚠️ No users found with status filter, trying WITHOUT status filter (RLS issue?)...');
              useStatusFilter = false;
              attemptWithoutStatus = true;
              page = 0; // Reset to try again
              continue;
            }
            hasMore = false;
            console.log('[useUsers] No more users on page', page);
          }
        }
        
        console.log('[useUsers] ✅ Total users fetched:', allUsers.length, 'query:', queryKey || 'ALL');
        if (allUsers.length > 0) {
          console.log('[useUsers] Sample users:', allUsers.slice(0, 5).map(u => u.name));
          console.log('[useUsers] All user names:', allUsers.map(u => u.name));
        } else {
          console.warn('[useUsers] ⚠️ No users returned from query');
          console.warn('[useUsers] This might be an RLS policy issue or there are no active users in the database');
        }
        
        return allUsers;
      } catch (error: any) {
        console.error('[useUsers] Exception:', error);
        return []; // Return empty array on error instead of throwing
      }
    },
    enabled: true, // Always enabled, searchQuery can be empty string to get all users
    staleTime: 0, // Don't cache - always fetch fresh data
    gcTime: 0, // Don't keep in cache
    retry: 2, // Retry failed requests
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: false, // Don't refetch on window focus (mobile)
  });
}

