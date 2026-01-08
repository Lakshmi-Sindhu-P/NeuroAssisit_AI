import { Navigate, useLocation } from "react-router-dom";
import { useAuth, UserRole } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles: UserRole[];
    redirectTo?: string;
}

/**
 * ProtectedRoute - Role-based route guard
 * 
 * BEHAVIOR:
 * - No auth token → redirect to /login
 * - Role NOT in allowedRoles → redirect to role-appropriate dashboard
 * - Role allowed → render children
 * 
 * GUARANTEES:
 * - NEVER returns null
 * - NEVER shows blank screen
 * - ALWAYS redirects immediately when unauthorized
 * - NO toasts (toasts are for API errors only)
 */
export function ProtectedRoute({ children, allowedRoles, redirectTo }: ProtectedRouteProps) {
    const { user, isAuthenticated, isLoading } = useAuth();
    const location = useLocation();

    // Get redirect path based on user role
    const getRedirectPath = (role: UserRole | undefined): string => {
        if (redirectTo) return redirectTo;

        switch (role) {
            case "master-admin":
                return "/admin/master";
            case "front-desk":
                return "/admin/dashboard";
            case "doctor":
                return "/doctor/dashboard";
            case "patient":
                return "/dashboard";
            default:
                return "/login";
        }
    };

    // Show loading spinner while checking auth
    // This is the ONLY time we don't immediately redirect
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent"></div>
                    <p className="text-muted-foreground text-sm">Loading...</p>
                </div>
            </div>
        );
    }

    // Not authenticated → redirect to login IMMEDIATELY
    if (!isAuthenticated || !user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Role not allowed → redirect to appropriate dashboard IMMEDIATELY
    // NO toast, NO blank screen, just redirect
    if (!allowedRoles.includes(user.role)) {
        const redirectPath = getRedirectPath(user.role);
        return <Navigate to={redirectPath} replace />;
    }

    // Authorized → render children
    return <>{children}</>;
}

/**
 * RequireAuth - Simple authentication guard (any authenticated user)
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent"></div>
                    <p className="text-muted-foreground text-sm">Loading...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <>{children}</>;
}
