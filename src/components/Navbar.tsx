import { useState, useEffect } from "react";
import {
  ShoppingCart,
  Search,
  User,
  Menu,
  X,
  LogOut,
  Settings,
  Package,
  Home,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Link,
  useNavigate,
  useSearchParams,
  useLocation,
} from "react-router-dom";
import { supabase } from "@/supabase";
import { authService, profileService } from "@/lib/supabase-service";
import { useToast } from "@/components/ui/use-toast";

interface NavbarProps {
  cartItemsCount?: number;
}

const Navbar = ({ cartItemsCount = 0 }: NavbarProps) => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { toast } = useToast();

  // Get guest cart count from localStorage
  const getGuestCartCount = (): number => {
    try {
      const guestCart = JSON.parse(localStorage.getItem("guestCart") || "[]");
      return guestCart.reduce(
        (sum: number, item: any) => sum + item.quantity,
        0,
      );
    } catch {
      return 0;
    }
  };

  // Transfer guest cart to user account after login
  const transferGuestCart = async (userId: string) => {
    try {
      const guestCart = JSON.parse(localStorage.getItem("guestCart") || "[]");
      if (guestCart.length === 0) return;

      for (const guestItem of guestCart) {
        const { data: existingItem } = await supabase
          .from("cart_items")
          .select("*")
          .eq("customer_id", userId)
          .eq("product_id", guestItem.product.id)
          .maybeSingle();

        if (existingItem) {
          // Update existing item quantity
          await supabase
            .from("cart_items")
            .update({ quantity: existingItem.quantity + guestItem.quantity })
            .eq("id", existingItem.id);
        } else {
          // Insert new item
          await supabase.from("cart_items").insert({
            customer_id: userId,
            product_id: guestItem.product.id,
            quantity: guestItem.quantity,
          });
        }
      }

      // Clear guest cart after transfer
      localStorage.removeItem("guestCart");

      toast({
        title: "Cart merged",
        description: `${guestCart.length} items from your guest cart have been added to your account.`,
      });
    } catch (error) {
      console.error("Error transferring guest cart:", error);
    }
  };

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);

        if (currentUser) {
          const userProfile = await profileService.getCurrentProfile();
          setProfile(userProfile);

          // Transfer guest cart if user just logged in
          await transferGuestCart(currentUser.id);
        }
      } catch (error) {
        console.error("Error loading user data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();

    // Sync search query from URL
    const query = searchParams.get("search") || "";
    setSearchQuery(query);

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        setUser(null);
        setProfile(null);
        setLoading(false);
      } else if (event === "SIGNED_IN" && session) {
        setUser(session.user);
        try {
          const userProfile = await profileService.getCurrentProfile();
          setProfile(userProfile);

          // Transfer guest cart on sign in
          await transferGuestCart(session.user.id);
        } catch (error) {
          console.error("Error loading profile after sign in:", error);
        }
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate("/products");
    }
    setIsMobileMenuOpen(false);
  };

  const handleSignOut = async () => {
    try {
      // Close mobile menu if open
      setIsMobileMenuOpen(false);

      // Clear local state immediately for responsive UI
      setUser(null);
      setProfile(null);

      // Clear all auth-related localStorage items
      localStorage.removeItem("adminToken");
      localStorage.removeItem("supabase.auth.token");

      // Clear any Supabase session data
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith("sb-")) {
          localStorage.removeItem(key);
        }
      });

      // Sign out from Supabase with scope: 'global' to clear all sessions
      const { error } = await supabase.auth.signOut({ scope: "global" });

      if (error) {
        console.error("Supabase sign out error:", error);
        // Try alternative sign out method
        try {
          await supabase.auth.signOut({ scope: "local" });
        } catch (fallbackError) {
          console.error("Fallback sign out also failed:", fallbackError);
        }
      }

      // Show success message
      toast({
        title: "Signed out successfully",
        description: "You have been signed out of your account.",
      });

      // Navigate to home page and reload to ensure clean state
      navigate("/", { replace: true });

      // Add small delay then reload to ensure all state is cleared
      setTimeout(() => {
        window.location.href = "/";
      }, 100);
    } catch (error) {
      console.error("Sign out error:", error);

      // Failsafe: Clear everything and reload
      setUser(null);
      setProfile(null);
      localStorage.clear();

      toast({
        title: "Sign out complete",
        description: "You have been signed out.",
      });

      // Force navigation and reload as last resort
      window.location.href = "/";
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const isAdmin = profile?.role === "admin" || profile?.role === "super_admin";
  const isOnAdminPage = location.pathname.startsWith("/admin");

  // Get user initials for avatar
  const getUserInitials = () => {
    if (profile?.full_name) {
      return profile.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase();
    }
    return user?.email?.[0]?.toUpperCase() || "U";
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <div className="text-2xl font-bold">
            <span className="text-primary">SPAR</span>
            <span className="text-secondary"> Express</span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          <Link to="/">
            <Button
              variant={location.pathname === "/" ? "secondary" : "ghost"}
              size="sm"
              className="gap-2"
            >
              <Home className="h-4 w-4" />
              Home
            </Button>
          </Link>
          <Link to="/products">
            <Button
              variant={
                location.pathname === "/products" ||
                location.pathname.startsWith("/category")
                  ? "secondary"
                  : "ghost"
              }
              size="sm"
              className="gap-2"
            >
              <Store className="h-4 w-4" />
              Shop
            </Button>
          </Link>
        </nav>

        {/* Search Bar */}
        <div className="hidden md:flex flex-1 max-w-md mx-6">
          <form onSubmit={handleSearch} className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search for products..."
              className="pl-10 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-2">
          {/* Cart */}
          <Link to="/cart">
            <Button variant="ghost" size="icon" className="relative">
              <ShoppingCart className="h-5 w-5" />
              {(cartItemsCount > 0 || (!user && getGuestCartCount() > 0)) && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-primary text-primary-foreground text-xs">
                  {(() => {
                    const count = user ? cartItemsCount : getGuestCartCount();
                    return count > 99 ? "99+" : count;
                  })()}
                </Badge>
              )}
            </Button>
          </Link>

          {/* User Menu */}
          {loading ? (
            <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-8 w-8 rounded-full p-0"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium text-sm">
                      {profile?.full_name || "User"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {user.email}
                    </p>
                    {isAdmin && (
                      <Badge variant="secondary" className="w-fit text-xs">
                        {profile.role === "super_admin"
                          ? "Super Admin"
                          : "Admin"}
                      </Badge>
                    )}
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    <span>My Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="cursor-pointer">
                    <Package className="mr-2 h-4 w-4" />
                    <span>My Orders</span>
                  </Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="cursor-pointer">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Admin Panel</span>
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <Link to="/auth">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link to="/auth?tab=signup">
                <Button size="sm">Sign Up</Button>
              </Link>
            </div>
          )}

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={toggleMobileMenu}
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-background border-b">
          <div className="container py-4 space-y-3">
            {/* Mobile Search */}
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search for products..."
                className="pl-10 w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </form>

            {/* Mobile Navigation */}
            <div className="space-y-1">
              <Link to="/" onClick={toggleMobileMenu}>
                <Button variant="ghost" className="w-full justify-start gap-2">
                  <Home className="h-4 w-4" />
                  Home
                </Button>
              </Link>
              <Link to="/products" onClick={toggleMobileMenu}>
                <Button variant="ghost" className="w-full justify-start gap-2">
                  <Store className="h-4 w-4" />
                  Shop
                </Button>
              </Link>
              <Link to="/cart" onClick={toggleMobileMenu}>
                <Button variant="ghost" className="w-full justify-start gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Cart{" "}
                  {(() => {
                    const count = user ? cartItemsCount : getGuestCartCount();
                    return count > 0 ? `(${count})` : "";
                  })()}
                </Button>
              </Link>
            </div>

            {/* Mobile Auth */}
            <div className="border-t pt-3">
              {user ? (
                <div className="space-y-1">
                  <div className="px-3 py-2 text-sm">
                    <p className="font-medium">
                      {profile?.full_name || "User"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {user.email}
                    </p>
                    {isAdmin && (
                      <Badge variant="secondary" className="w-fit text-xs mt-1">
                        {profile.role === "super_admin"
                          ? "Super Admin"
                          : "Admin"}
                      </Badge>
                    )}
                  </div>
                  <Link to="/profile" onClick={toggleMobileMenu}>
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-2"
                    >
                      <User className="h-4 w-4" />
                      My Profile
                    </Button>
                  </Link>
                  {isAdmin && (
                    <Link to="/admin" onClick={toggleMobileMenu}>
                      <Button
                        variant="ghost"
                        className="w-full justify-start gap-2"
                      >
                        <Settings className="h-4 w-4" />
                        Admin Panel
                      </Button>
                    </Link>
                  )}
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 text-red-600 hover:text-red-600 hover:bg-red-50"
                    onClick={handleSignOut}
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </Button>
                </div>
              ) : (
                <div className="space-y-1">
                  <Link to="/auth" onClick={toggleMobileMenu}>
                    <Button variant="ghost" className="w-full justify-start">
                      Sign In
                    </Button>
                  </Link>
                  <Link to="/auth?tab=signup" onClick={toggleMobileMenu}>
                    <Button className="w-full">Sign Up</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Admin Badge */}
      {isOnAdminPage && isAdmin && (
        <div className="bg-orange-100 border-b border-orange-200 py-1">
          <div className="container text-center">
            <p className="text-xs text-orange-800">
              <Settings className="inline h-3 w-3 mr-1" />
              Admin Mode - You are viewing the admin panel
            </p>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
