import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';

export interface Department {
  id: string;
  name: string;
  code?: string;
}

export function useDepartments() {
  return useQuery({
    queryKey: ['departments'],
    queryFn: async (): Promise<Department[]> => {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name, code')
        .order('name', { ascending: true });

      if (error) throw error;
      return (data || []) as Department[];
    },
    staleTime: 300000, // 5 minutes
  });
}

