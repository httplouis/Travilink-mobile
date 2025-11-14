import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { UserProfile } from '@/lib/types';
import { router } from 'expo-router';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user profile from users table
  const fetchProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      if (!userId || userId.trim() === '') {
        console.warn('[AuthContext] No userId provided to fetchProfile');
        return null;
      }

      console.log('[AuthContext] Fetching profile for auth_user_id:', userId);

      // First, fetch user profile without department join (to avoid FK relationship issues)
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          auth_user_id,
          email,
          name,
          role,
          department_id,
          is_head,
          is_hr,
          is_exec,
          is_vp,
          is_president,
          profile_picture,
          phone_number,
          position_title,
          status
        `)
        .eq('auth_user_id', userId)
        .single();

      if (error) {
        console.error('[AuthContext] Error fetching profile:', error);
        console.error('[AuthContext] Error details:', JSON.stringify(error, null, 2));
        return null;
      }

      if (!data) {
        console.warn('[AuthContext] No profile data returned for userId:', userId);
        return null;
      }

      if (!data.id) {
        console.error('[AuthContext] Profile data missing id field:', data);
        return null;
      }

      // Fetch department separately if department_id exists
      let department = null;
      if (data.department_id) {
        try {
          const { data: deptData } = await supabase
            .from('departments')
            .select('id, name, code')
            .eq('id', data.department_id)
            .single();
          
          if (deptData) {
            department = deptData;
          }
        } catch (deptError) {
          console.warn('[AuthContext] Could not fetch department:', deptError);
          // Continue without department - not critical
        }
      }

      console.log('[AuthContext] Profile fetched successfully:', { id: data.id, name: data.name, email: data.email });

      return {
        id: data.id,
        auth_user_id: data.auth_user_id,
        email: data.email,
        name: data.name,
        role: data.role,
        department_id: data.department_id,
        department: department,
        is_head: data.is_head || false,
        is_hr: data.is_hr || false,
        is_exec: data.is_exec || false,
        is_vp: data.is_vp || false,
        is_president: data.is_president || false,
        profile_picture: data.profile_picture,
        phone_number: data.phone_number,
        position_title: data.position_title,
        status: data.status || 'active',
      };
    } catch (error) {
      console.error('[AuthContext] Exception in fetchProfile:', error);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const userProfile = await fetchProfile(user.id);
      setProfile(userProfile);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        const userProfile = await fetchProfile(data.user.id);
        setProfile(userProfile);
      }

      // Navigate to tabs after successful login
      router.replace('/(tabs)/submissions');
    } catch (error: any) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setProfile(null);
      router.replace('/(auth)/sign-in');
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  useEffect(() => {
    let mounted = true;

    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;

        if (error) {
          console.error('[AuthContext] Session error:', error);
          setLoading(false);
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          const userProfile = await fetchProfile(session.user.id);
          if (mounted) {
            setProfile(userProfile);
          }
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error('[AuthContext] Initialization error:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;

      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        const userProfile = await fetchProfile(session.user.id);
        if (mounted) {
          setProfile(userProfile);
        }
      } else {
        setProfile(null);
      }
      
      if (mounted) {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

