import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService, profileService } from "@/lib/supabase-service";
import { Loader2, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface RequireCustomerProps {
  children: JSX.Element;
}

export const RequireCustomer = ({ children }: RequireCustomerProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkCustomerAccess = async () => {
      try {
        // Check if user is authenticated
        const user = await authService.getCurrentUser();

        if (!user) {
          if (mounted) {
            navigate("/auth", { replace: true });
          }
          return;
        }

        // Get user profile to check if they're a customer
        const profile = await profileService.getCurrentProfile();

        if (!mounted) return;

        if (!profile) {
          navigate("/auth", { replace: true });
          return;
        }

        // If user is admin/super_admin, redirect to admin panel
        if (profile.role === "admin" || profile.role === "super_admin") {
          navigate("/admin", { replace: true });
          return;
        }

        // User is a customer, allow access
        if (profile.role === "customer") {
          setIsAuthorized(true);
        } else {
          // Unknown role, redirect to auth
          navigate("/auth", { replace: true });
          return;
        }

        setLoading(false);
      } catch (error) {
        console.error("Error checking customer access:", error);
        if (mounted) {
          navigate("/auth", { replace: true });
        }
      }
    };

    checkCustomerAccess();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-96">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Checking Access
            </h2>
            <p className="text-sm text-gray-600 text-center">
              Verifying your account...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success - user is authorized customer
  if (isAuthorized) {
    return children;
  }

  // Fallback - should not reach here due to navigation redirects
  return null;
};
