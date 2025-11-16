import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';

export interface User {
  id: string;
  name: string;
  email: string;
  department_id?: string;
}

export function useUsers(searchQuery?: string) {
  return useQuery({
    queryKey: ['users', searchQuery],
    queryFn: async (): Promise<User[]> => {
      let userQuery = supabase
        .from('users')
        .select('id, name, email, department_id, position_title, profile_picture, role')
        .eq('status', 'active')
        .order('name', { ascending: true })
        .limit(100); // Match web limit

      // If search query provided, filter by name or email (match web API behavior)
      if (searchQuery && searchQuery.trim().length > 0) {
        const trimmed = searchQuery.trim();
        userQuery = userQuery.or(`name.ilike.%${trimmed}%,email.ilike.%${trimmed}%`);
      }

      const { data, error } = await userQuery;

      if (error) throw error;
      return (data || []) as User[];
    },
    enabled: true, // Always enabled, searchQuery can be empty to get all users
    staleTime: 30000,
  });
}

