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
  fetchProfileByUserId: (userId: string) => Promise<UserProfile | null>;
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
          status,
          availability_status
        `)
        .eq('auth_user_id', userId)
        .single();

      if (error) {
        // Don't log HTML error pages or abort errors
        const errorMessage = error.message || '';
        const isHtmlError = errorMessage.includes('<!DOCTYPE html>') || errorMessage.includes('<html');
        const isAbortError = errorMessage.includes('Aborted') || errorMessage.includes('abort') || error.name === 'AbortError';
        const isTimeoutError = errorMessage.includes('timeout') || errorMessage.includes('Timeout');
        
        if (!isHtmlError && !isAbortError && !isTimeoutError) {
          // Only log meaningful errors
          console.warn('[AuthContext] Error fetching profile:', error.code || error.message || 'Unknown error');
        }
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
        availability_status: (data.availability_status as 'online' | 'busy' | 'off_work' | 'on_leave') || 'online',
      };
    } catch (error: any) {
      // Don't log HTML error pages, abort errors, or timeouts
      const errorMessage = error?.message || '';
      const isHtmlError = errorMessage.includes('<!DOCTYPE html>') || errorMessage.includes('<html');
      const isAbortError = errorMessage.includes('Aborted') || errorMessage.includes('abort') || error?.name === 'AbortError';
      const isTimeoutError = errorMessage.includes('timeout') || errorMessage.includes('Timeout');
      
      if (!isHtmlError && !isAbortError && !isTimeoutError) {
        // Only log meaningful errors
        console.warn('[AuthContext] Exception in fetchProfile:', error?.code || error?.message || 'Unknown error');
      }
      return null;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const userProfile = await fetchProfile(user.id);
      setProfile(userProfile);
    }
  };
  
  // Expose fetchProfile for direct use in callbacks (bypassing user dependency)
  const fetchProfileByUserId = async (userId: string) => {
    try {
      // Add timeout to prevent hanging - max 2 seconds
      const profilePromise = fetchProfile(userId);
      const timeoutPromise = new Promise<UserProfile | null>((_, reject) => 
        setTimeout(() => {
          console.warn('[AuthContext] fetchProfileByUserId timeout after 2 seconds');
          reject(new Error('Profile fetch timeout'));
        }, 2000)
      );
      
      const userProfile = await Promise.race([profilePromise, timeoutPromise]);
      if (userProfile) {
        setProfile(userProfile);
      }
      return userProfile;
    } catch (error: any) {
      // Don't log HTML error pages, abort errors, or timeouts
      const errorMessage = error?.message || '';
      const isHtmlError = errorMessage.includes('<!DOCTYPE html>') || errorMessage.includes('<html');
      const isAbortError = errorMessage.includes('Aborted') || errorMessage.includes('abort') || error?.name === 'AbortError';
      const isTimeoutError = errorMessage.includes('timeout') || errorMessage.includes('Timeout');
      
      if (!isHtmlError && !isAbortError && !isTimeoutError) {
        // Only log meaningful errors
        console.warn('[AuthContext] fetchProfileByUserId error:', error?.code || error?.message || 'Unknown error');
      }
      // Return null on error/timeout - don't block login
      return null;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      // Validate email format (support both @mseuf.edu.ph and @student.mseuf.edu.ph)
      const emailLower = email.toLowerCase().trim();
      const isValidEmail = 
        emailLower.endsWith('@mseuf.edu.ph') || 
        emailLower.endsWith('@student.mseuf.edu.ph');
      
      if (!isValidEmail) {
        throw new Error('Please use your institutional email (@mseuf.edu.ph or @student.mseuf.edu.ph)');
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailLower,
        password,
      });

      if (error) throw error;

      if (data.user) {
        const userProfile = await fetchProfile(data.user.id);
        setProfile(userProfile);
      }

      // Navigate to dashboard after successful login
      router.replace('/(tabs)/dashboard');
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
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    // Get initial session with timeout
    const initializeAuth = async () => {
      try {
        // Set a timeout to prevent infinite loading
        timeoutId = setTimeout(() => {
          if (mounted) {
            console.warn('[AuthContext] Initialization timeout, setting loading to false');
            setLoading(false);
          }
        }, 10000); // 10 second timeout

        // Get session - don't timeout, let Supabase handle it
        // If there's a network issue, we'll retry later rather than signing out
        const { data: { session }, error } = await supabase.auth.getSession();
        
        // Only handle refresh token errors - don't sign out on network timeouts
        if (error) {
          const errorMessage = error.message || '';
          const isRefreshTokenError = errorMessage.includes('refresh_token') || 
                                     errorMessage.includes('Refresh Token') ||
                                     error.code === 'invalid_refresh_token';
          
          if (isRefreshTokenError) {
            console.warn('[AuthContext] Refresh token error, clearing session:', error.message);
            // Clear invalid session only for actual token errors
            try {
              await supabase.auth.signOut();
            } catch (signOutError) {
              // Ignore sign out errors
            }
            if (mounted) {
              setSession(null);
              setUser(null);
              setProfile(null);
              setLoading(false);
            }
            return;
          } else {
            // Network or other errors - log but don't sign out
            console.warn('[AuthContext] Session fetch error (non-critical):', error.message || error.code);
            // Continue with existing session if available, or null if not
          }
        }
        
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }

        if (!mounted) return;

        // Set session even if there was an error (might be network issue, not auth issue)
        // Only skip if it was a refresh token error (already handled above)
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch profile with timeout
          try {
            const profilePromise = fetchProfile(session.user.id);
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Profile fetch timeout')), 8000)
            );
            
            const userProfile = await Promise.race([profilePromise, timeoutPromise]) as UserProfile | null;
            if (mounted) {
              setProfile(userProfile);
            }
          } catch (profileError: any) {
            // Don't log HTML error pages, abort errors, or timeouts
            const errorMessage = profileError?.message || '';
            const isHtmlError = errorMessage.includes('<!DOCTYPE html>') || errorMessage.includes('<html');
            const isAbortError = errorMessage.includes('Aborted') || errorMessage.includes('abort') || profileError?.name === 'AbortError';
            const isTimeoutError = errorMessage.includes('timeout') || errorMessage.includes('Timeout');
            
            if (!isHtmlError && !isAbortError && !isTimeoutError) {
              // Only log meaningful errors
              console.warn('[AuthContext] Profile fetch error:', profileError?.code || profileError?.message || 'Unknown error');
            }
            if (mounted) {
              setProfile(null);
            }
          }
        } else {
          setProfile(null);
        }
      } catch (error: any) {
        // Don't log HTML error pages, abort errors, or timeouts
        const errorMessage = error?.message || '';
        const isHtmlError = errorMessage.includes('<!DOCTYPE html>') || errorMessage.includes('<html');
        const isAbortError = errorMessage.includes('Aborted') || errorMessage.includes('abort') || error?.name === 'AbortError';
        const isTimeoutError = errorMessage.includes('timeout') || errorMessage.includes('Timeout');
        
        if (!isHtmlError && !isAbortError && !isTimeoutError) {
          // Only log meaningful errors
          console.warn('[AuthContext] Initialization error:', error?.code || error?.message || 'Unknown error');
        }
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      console.log('[AuthContext] Auth state changed:', event, session?.user?.email || 'no user');
      
      // Handle SIGNED_OUT events
      if (event === 'SIGNED_OUT' && !session) {
        // Only clear state on explicit sign out, not on network errors
        // Supabase will emit SIGNED_OUT for actual logout or expired tokens
        console.log('[AuthContext] User signed out event received');
        setSession(null);
        setUser(null);
        setProfile(null);
        if (mounted) {
          setLoading(false);
        }
        // Don't navigate away automatically - let the app handle routing
        // This prevents accidental redirects on network issues
        return;
      }
      
      // Don't clear state on TOKEN_REFRESHED errors - these are recoverable
      if (event === 'TOKEN_REFRESHED' && !session) {
        console.warn('[AuthContext] Token refresh failed, but keeping existing session if available');
        // Keep existing session state, don't clear it
        if (mounted) {
          setLoading(false);
        }
        return;
      }
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // For SIGNED_IN events (like OAuth), fetch profile but don't block
        if (event === 'SIGNED_IN') {
          console.log('[AuthContext] User signed in, fetching profile in background...');
          // Fetch profile without blocking (allow navigation to proceed)
          fetchProfile(session.user.id).then((userProfile) => {
            if (mounted) {
              setProfile(userProfile);
            }
          }).catch((error: any) => {
            // Don't log HTML error pages, abort errors, or timeouts
            const errorMessage = error?.message || '';
            const isHtmlError = errorMessage.includes('<!DOCTYPE html>') || errorMessage.includes('<html');
            const isAbortError = errorMessage.includes('Aborted') || errorMessage.includes('abort') || error?.name === 'AbortError';
            const isTimeoutError = errorMessage.includes('timeout') || errorMessage.includes('Timeout');
            
            if (!isHtmlError && !isAbortError && !isTimeoutError) {
              // Only log meaningful errors
              console.warn('[AuthContext] Profile fetch error after sign in:', error?.code || error?.message || 'Unknown error');
            }
            // Don't block - continue without profile
          });
        } else {
          // For other events (like TOKEN_REFRESHED), fetch normally
          try {
            const userProfile = await fetchProfile(session.user.id);
            if (mounted) {
              setProfile(userProfile);
            }
          } catch (error: any) {
            // Don't log HTML error pages, abort errors, or timeouts
            const errorMessage = error?.message || '';
            const isHtmlError = errorMessage.includes('<!DOCTYPE html>') || errorMessage.includes('<html');
            const isAbortError = errorMessage.includes('Aborted') || errorMessage.includes('abort') || error?.name === 'AbortError';
            const isTimeoutError = errorMessage.includes('timeout') || errorMessage.includes('Timeout');
            
            if (!isHtmlError && !isAbortError && !isTimeoutError) {
              // Only log meaningful errors
              console.warn('[AuthContext] Profile fetch error:', error?.code || error?.message || 'Unknown error');
            }
            // Continue without profile update
          }
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
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
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
        fetchProfileByUserId,
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

