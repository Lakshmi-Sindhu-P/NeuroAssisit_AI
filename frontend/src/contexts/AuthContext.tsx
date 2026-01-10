import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { apiRequest } from "@/lib/api";

export type UserRole = "patient" | "front-desk" | "doctor" | "admin" | "master-admin";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName?: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signUp: (data: any) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to decode JWT and extract role (without verification)
function decodeJWT(token: string): { role?: string; sub?: string; exp?: number } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch {
    return null;
  }
}

// Map backend role to frontend format
function mapRole(backendRole: string): UserRole {
  const role = (backendRole || "PATIENT").toUpperCase();
  switch (role) {
    case "MASTER_ADMIN": return "master-admin";
    case "FRONT_DESK": return "front-desk";
    case "DOCTOR": return "doctor";
    case "ADMIN": return "admin";
    case "PATIENT":
    default: return "patient";
  }
}

// Synchronously check if token exists and is not expired
function getInitialAuthState(): { user: User | null; hasToken: boolean } {
  const token = localStorage.getItem("neuroassist_token");
  if (!token) {
    return { user: null, hasToken: false };
  }

  const payload = decodeJWT(token);
  if (!payload) {
    localStorage.removeItem("neuroassist_token");
    return { user: null, hasToken: false };
  }

  // Check if token is expired
  if (payload.exp && payload.exp * 1000 < Date.now()) {
    localStorage.removeItem("neuroassist_token");
    return { user: null, hasToken: false };
  }

  // Create temporary user from JWT payload
  // This allows immediate auth while we fetch full user details
  const role = mapRole(payload.role || "PATIENT");
  return {
    user: {
      id: payload.sub || "",
      email: "",
      firstName: "",
      role,
    },
    hasToken: true,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // SYNCHRONOUS initialization from localStorage
  const initialState = getInitialAuthState();
  const [user, setUser] = useState<User | null>(initialState.user);
  const [isLoading, setIsLoading] = useState(initialState.hasToken); // Only loading if we have token to validate

  useEffect(() => {
    // Only fetch user details if we have a token
    if (!initialState.hasToken) {
      setIsLoading(false);
      return;
    }

    async function loadUser() {
      try {
        const userData = await apiRequest("/auth/me");
        const profile = await apiRequest("/users/me/profile");

        setUser({
          id: userData.id,
          email: userData.email,
          firstName: profile.first_name || userData.email.split('@')[0],
          lastName: profile.last_name || "",
          role: mapRole(userData.role),
        });
      } catch (error: any) {
        console.error("Failed to load user", error);
        // Only clear auth on 401 (invalid token)
        // 403 means valid token but insufficient permissions - don't logout
        if (error?.status === 401) {
          localStorage.removeItem("neuroassist_token");
          setUser(null);
        }
        // For other errors (network, 500, etc), keep the user logged in
        // based on the JWT we already decoded
      } finally {
        setIsLoading(false);
      }
    }

    loadUser();
  }, []);

  const login = async (email: string, password: string) => {
    const formData = new URLSearchParams();
    formData.append("username", email);
    formData.append("password", password);

    const data = await apiRequest("/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    localStorage.setItem("neuroassist_token", data.access_token);

    // Fetch user details
    const userData = await apiRequest("/auth/me");
    const profile = await apiRequest("/users/me/profile");

    const newUser: User = {
      id: userData.id,
      email: userData.email,
      firstName: profile.first_name || userData.email.split('@')[0],
      lastName: profile.last_name || "",
      role: mapRole(userData.role),
    };

    setUser(newUser);
  };

  const signUp = async (formData: any) => {
    const [firstName, ...lastNames] = (formData.fullName || "").split(" ");
    const lastName = lastNames.join(" ") || " ";

    const payload: Record<string, any> = {
      email: formData.email,
      password: formData.password,
      role: "PATIENT",
      first_name: firstName,
      last_name: lastName,
      phone: formData.phone || "",
      age: formData.age ? parseInt(formData.age) : null,
      gender: formData.gender || null,
    };

    try {
      await apiRequest("/auth/signup", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    } catch (error: any) {
      let errorMessage = "Failed to create account";
      if (error?.detail) {
        errorMessage = typeof error.detail === 'string' ? error.detail : JSON.stringify(error.detail);
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      throw new Error(errorMessage);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("neuroassist_token");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        signUp,
        logout,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
