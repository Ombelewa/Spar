import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService, profileService } from "@/lib/supabase-service";
import { Loader2, Shield, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RequireAdminProps {
  children: JSX.Element;
  allowSuperAdminOnly?: boolean;
}

export const RequireAdmin = ({
  children,
  allowSuperAdminOnly = false,
}: RequireAdminProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const checkAdminAccess = async () => {
      try {
        // Check if user is authenticated
        const user = await authService.getCurrentUser();

        if (!user) {
          if (mounted) {
            navigate("/admin-login", { replace: true });
          }
          return;
        }

        // Get user profile and check role
        const profile = await profileService.getCurrentProfile();
        if (!profile && mounted) {
          setError("Profile not found");
          setLoading(false);
          return;
        }

        // Check admin permissions
        const hasAccess = allowSuperAdminOnly
          ? profile?.role === "super_admin"
          : profile?.role === "admin" || profile?.role === "super_admin";

        if (mounted) {
          if (hasAccess) {
            setIsAuthorized(true);
          } else {
            setError("Insufficient privileges");
          }
          setLoading(false);
        }
      } catch (error) {
        console.error("Error checking admin access:", error);
        if (mounted) {
          setError("Failed to verify admin access");
          setLoading(false);
        }
      }
    };

    checkAdminAccess();

    return () => {
      mounted = false;
    };
  }, [navigate, allowSuperAdminOnly]);

  const handleSignOut = async () => {
    try {
      await authService.signOut();
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const handleGoToLogin = () => {
    navigate("/admin-login", { replace: true });
  };

  const handleGoHome = () => {
    navigate("/", { replace: true });
  };

  // Loading state - prevent flickering
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
              Verifying your admin privileges...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state - access denied
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-orange-600" />
            </div>
            <CardTitle className="text-xl font-semibold text-gray-900">
              Admin Access Required
            </CardTitle>
            <p className="text-sm text-gray-600 mt-2">
              You need admin privileges to access this area
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h3 className="font-medium text-orange-900 mb-2">
                How to Get Admin Access
              </h3>
              <div className="text-sm text-orange-800 space-y-2">
                <p>1. Create a regular account if you don't have one</p>
                <p>2. Ask your administrator to give you admin privileges</p>
                <p className="text-xs pt-2 border-t border-orange-200">
                  <strong>For developers:</strong> Run this in Supabase SQL
                  Editor:
                  <br />
                  <code className="text-xs bg-white px-1 rounded">
                    UPDATE profiles SET role = 'admin' WHERE email =
                    'your@email.com'
                  </code>
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleGoHome}
                className="w-full bg-indigo-600 hover:bg-indigo-700"
              >
                Go to Store
              </Button>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={handleGoToLogin}
                  variant="outline"
                  className="w-full"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Admin Login
                </Button>

                <Button
                  onClick={handleSignOut}
                  variant="outline"
                  className="w-full"
                >
                  Sign Out
                </Button>
              </div>
            </div>

            <div className="text-center pt-4 border-t">
              <p className="text-xs text-gray-500">
                Need help? Check the ADMIN_ACCESS_SIMPLE.md guide
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success - user is authorized
  if (isAuthorized) {
    return children;
  }

  // Fallback - should not reach here
  return null;
};
