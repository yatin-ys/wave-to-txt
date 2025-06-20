import { createContext, useContext, useEffect, useState, useRef } from "react";
import type { ReactNode } from "react";
import type { User, Session, AuthError } from "@supabase/supabase-js";
import { supabase, getRedirectUrl, isGoogleAuthEnabled } from "@/lib/supabase";
import { toast } from "sonner";

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
}

interface AuthContextType extends AuthState {
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const initialState: AuthState = {
  user: null,
  session: null,
  loading: true,
  initialized: false,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>(initialState);
  const previousUserRef = useRef<User | null>(null);
  const hasShownInitialToast = useRef(false);

  useEffect(() => {
    let mounted = true;

    // Get initial session
    const getInitialSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("Error getting initial session:", error);
          toast.error("Authentication error: " + error.message);
        }

        if (mounted) {
          setState({
            user: session?.user ?? null,
            session,
            loading: false,
            initialized: true,
          });

          // Set initial user reference
          previousUserRef.current = session?.user ?? null;
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
        if (mounted) {
          setState((prev) => ({
            ...prev,
            loading: false,
            initialized: true,
          }));
        }
      }
    };

    getInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, session?.user?.email);

      if (mounted) {
        const newUser = session?.user ?? null;
        const previousUser = previousUserRef.current;

        setState({
          user: newUser,
          session,
          loading: false,
          initialized: true,
        });

        // Only show toasts for actual user state changes, not initial loads
        if (hasShownInitialToast.current) {
          // Handle auth events with proper state tracking
          switch (event) {
            case "SIGNED_IN":
              // Only show if user actually changed from null to signed in
              if (!previousUser && newUser) {
                toast.success("Successfully signed in!");
              }
              break;
            case "SIGNED_OUT":
              // Only show if user actually changed from signed in to null
              if (previousUser && !newUser) {
                toast.success("Successfully signed out!");
              }
              break;
            case "TOKEN_REFRESHED":
              console.log("Token refreshed");
              break;
            case "USER_UPDATED":
              toast.success("Profile updated!");
              break;
            case "PASSWORD_RECOVERY":
              toast.success("Password recovery email sent!");
              break;
          }
        } else {
          hasShownInitialToast.current = true;
        }

        // Update previous user reference
        previousUserRef.current = newUser;
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleAuthError = (error: AuthError | Error) => {
    console.error("Auth error:", error);
    let message = "An unexpected error occurred";

    if ("message" in error) {
      message = error.message;
    }

    // Customize error messages for better UX
    if (message.includes("Invalid login credentials")) {
      message = "Invalid email or password";
    } else if (message.includes("Email not confirmed")) {
      message = "Please check your email and click the confirmation link";
    } else if (message.includes("User already registered")) {
      message = "An account with this email already exists";
    }

    toast.error(message);
    throw error;
  };

  const signUp = async (email: string, password: string) => {
    try {
      setState((prev) => ({ ...prev, loading: true }));

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: getRedirectUrl(),
        },
      });

      if (error) {
        handleAuthError(error);
      } else {
        toast.success(
          "Sign up successful! Please check your email to confirm your account."
        );
      }
    } catch {
      // Error already handled in handleAuthError
    } finally {
      setState((prev) => ({ ...prev, loading: false }));
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setState((prev) => ({ ...prev, loading: true }));

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        handleAuthError(error);
      }
    } catch {
      // Error already handled in handleAuthError
    } finally {
      setState((prev) => ({ ...prev, loading: false }));
    }
  };

  const signInWithGoogle = async () => {
    if (!isGoogleAuthEnabled()) {
      toast.error("Google authentication is not enabled");
      return;
    }

    try {
      setState((prev) => ({ ...prev, loading: true }));

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: getRedirectUrl(),
        },
      });

      if (error) {
        handleAuthError(error);
      }
    } catch {
      // Error already handled in handleAuthError
    } finally {
      setState((prev) => ({ ...prev, loading: false }));
    }
  };

  const signOut = async () => {
    try {
      setState((prev) => ({ ...prev, loading: true }));

      const { error } = await supabase.auth.signOut();

      if (error) {
        handleAuthError(error);
      }
    } catch {
      // Error already handled in handleAuthError
    } finally {
      setState((prev) => ({ ...prev, loading: false }));
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${getRedirectUrl()}/reset-password`,
      });

      if (error) {
        handleAuthError(error);
      } else {
        toast.success("Password reset email sent! Please check your inbox.");
      }
    } catch {
      // Error already handled in handleAuthError
    }
  };

  const value: AuthContextType = {
    ...state,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
