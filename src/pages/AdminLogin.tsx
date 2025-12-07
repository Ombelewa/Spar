import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { authService, profileService } from "@/lib/supabase-service";
import {
  Eye,
  EyeOff,
  Shield,
  Info,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [initialCheck, setInitialCheck] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check if user is already logged in and is admin (only once on mount)
  useEffect(() => {
    let mounted = true;

    const checkAdminAuth = async () => {
      try {
        const user = await authService.getCurrentUser();
        if (user && mounted) {
          const isAdmin = await profileService.isAdmin();
          if (isAdmin && mounted) {
            navigate("/admin", { replace: true });
            return;
          }
        }
      } catch (error) {
        console.error("Error checking admin auth:", error);
      } finally {
        if (mounted) {
          setInitialCheck(false);
        }
      }
    };

    checkAdminAuth();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast({
        title: "Please fill in all fields",
        description: "Both email and password are required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Sign in with Supabase
      await authService.signIn(email, password);

      // Check if user has admin privileges
      const isAdmin = await profileService.isAdmin();

      if (isAdmin) {
        toast({
          title: "Welcome back!",
          description: "Redirecting to admin dashboard...",
        });
        navigate("/admin", { replace: true });
      } else {
        // User doesn't have admin privileges
        await authService.signOut();
        toast({
          title: "Access denied",
          description:
            "This account doesn't have admin privileges. Please contact your administrator.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      let errorMessage = "Login failed. Please check your credentials.";

      if (error.message?.includes("Invalid login credentials")) {
        errorMessage = "Incorrect email or password. Please try again.";
      } else if (error.message?.includes("Email not confirmed")) {
        errorMessage = "Please verify your email address first.";
      } else if (error.message?.includes("Too many requests")) {
        errorMessage = "Too many attempts. Please wait a moment and try again.";
      }

      toast({
        title: "Login failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Show loading spinner during initial auth check
  if (initialCheck) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-96">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-600">Checking authentication...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Login</h1>
          <p className="text-gray-600 mt-2">Spar Express Delivery</p>
        </div>

        {/* What is Admin Access Info */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 mb-2">
                  What is Admin Access?
                </p>
                <p className="text-blue-800 mb-3">
                  Admin access lets you manage your store: add products, process
                  orders, view sales data, and manage customers.
                </p>
                <div className="bg-blue-100 p-3 rounded text-xs space-y-1">
                  <p className="font-medium text-blue-900">
                    Don't have admin access?
                  </p>
                  <p className="text-blue-800">
                    1. First create an account at{" "}
                    <Link to="/auth" className="underline font-medium">
                      Customer Sign Up
                    </Link>
                  </p>
                  <p className="text-blue-800">
                    2. Then run this in Supabase SQL Editor:
                  </p>
                  <code className="block bg-white p-2 rounded mt-1 text-xs">
                    UPDATE profiles SET role = 'admin' WHERE email =
                    'your@email.com'
                  </code>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Login Form */}
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Sign In to Dashboard</CardTitle>
            <p className="text-sm text-gray-600">
              Enter your admin credentials
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <Input
                  type="email"
                  placeholder="admin@sparexpress.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10"
                  disabled={loading}
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-10 pr-10"
                    disabled={loading}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600"
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-10 bg-indigo-600 hover:bg-indigo-700"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing In...
                  </div>
                ) : (
                  "Sign In to Admin Dashboard"
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t text-center space-y-3">
              <div className="text-sm text-gray-600">
                Need to create an account?{" "}
                <Link
                  to="/auth"
                  className="text-indigo-600 hover:text-indigo-500 font-medium"
                >
                  Sign Up Here
                </Link>
              </div>
              <div className="text-sm text-gray-500">
                <Link to="/" className="text-gray-600 hover:text-gray-500">
                  ← Back to Store
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Help Section */}
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-2 mb-3">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-gray-900">Quick Admin Setup:</p>
                <ol className="text-gray-600 text-xs mt-1 space-y-1 list-decimal list-inside">
                  <li>Create account at /auth</li>
                  <li>Run SQL command above</li>
                  <li>Login here with same credentials</li>
                </ol>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-gray-900">
                  Getting "Access Denied"?
                </p>
                <p className="text-gray-600 text-xs mt-1">
                  Your account exists but doesn't have admin privileges yet. Run
                  the SQL command above.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminLogin;
