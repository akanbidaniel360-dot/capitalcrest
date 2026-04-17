import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  country: string;
  primary_currency: string;
  account_number: string;
  pin_hash: string | null;
  kyc_status: "none" | "pending" | "verified" | "rejected";
  credit_score: number;
  is_frozen: boolean;
  referral_code: string | null;
  avatar_url: string | null;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  signUp: (email: string, password: string, metadata: Record<string, string>) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    isAdmin: false,
    isSuperAdmin: false,
    isLoading: true,
  });

  const fetchProfile = async (userId: string) => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const isSuperAdmin = roles?.some((r) => r.role === "super_admin") ?? false;
    const isAdmin = isSuperAdmin || (roles?.some((r) => r.role === "admin") ?? false);

    return { profile: profile as Profile | null, isAdmin, isSuperAdmin };
  };

  const refreshProfile = async () => {
    if (!state.user) return;
    const { profile, isAdmin, isSuperAdmin } = await fetchProfile(state.user.id);
    setState((s) => ({ ...s, profile, isAdmin, isSuperAdmin }));
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setTimeout(async () => {
            const { profile, isAdmin, isSuperAdmin } = await fetchProfile(session.user.id);
            setState({
              user: session.user,
              session,
              profile,
              isAdmin,
              isSuperAdmin,
              isLoading: false,
            });
          }, 0);
        } else {
          setState({
            user: null,
            session: null,
            profile: null,
            isAdmin: false,
            isSuperAdmin: false,
            isLoading: false,
          });
        }
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { profile, isAdmin, isSuperAdmin } = await fetchProfile(session.user.id);
        setState({
          user: session.user,
          session,
          profile,
          isAdmin,
          isSuperAdmin,
          isLoading: false,
        });
      } else {
        setState((s) => ({ ...s, isLoading: false }));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, metadata: Record<string, string>) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    });
    if (error) throw error;
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ ...state, signUp, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
