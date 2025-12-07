import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";
import {
  adminService,
  productService,
  orderService,
  categoryService,
  authService,
  profileService,
} from "@/lib/supabase-service";

// Error Boundary Component
const ErrorBoundary = ({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback: React.ReactNode;
}) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      console.error("Caught error:", error);
      setHasError(true);
    };

    window.addEventListener("error", handleError);
    return () => window.removeEventListener("error", handleError);
  }, []);

  if (hasError) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

// Lucide Icons
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  FolderTree,
  Store,
  BarChart3,
  LogOut,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Settings,
  AlertTriangle,
} from "lucide-react";

// ShadCN UI
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

const Admin = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("dashboard");
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const [productForm, setProductForm] = useState({
    name: "",
    price: "",
    category_id: "",
    unit: "piece",
    description: "",
    stock_quantity: "",
    min_stock_level: "5",
  });

  // Check authentication and load user data
  useEffect(() => {
    let mounted = true;

    const initializeAdmin = async () => {
      try {
        if (!mounted) return;
        setLoading(true);
        setError(null);

        // Check if user is authenticated and is admin
        const user = await authService.getCurrentUser();
        if (!user && mounted) {
          navigate("/admin-login", { replace: true });
          return;
        }

        const profile = await profileService.getCurrentProfile();
        if (!mounted) return;

        if (
          !profile ||
          (profile.role !== "admin" && profile.role !== "super_admin")
        ) {
          toast({
            title: "Access Denied",
            description: "You don't have admin privileges.",
            variant: "destructive",
          });
          navigate("/admin-login", { replace: true });
          return;
        }

        if (mounted) {
          setCurrentUser(profile);
          await loadDashboardData();
        }
      } catch (error) {
        console.error("Admin initialization error:", error);
        if (mounted) {
          setError(
            "Failed to load admin panel. Please try refreshing the page.",
          );
          setLoading(false);
        }
      }
    };

    initializeAdmin();

    return () => {
      mounted = false;
    };
  }, [navigate, toast]);

  // Load all dashboard data
  const loadDashboardData = async () => {
    try {
      // Load data step by step to avoid overwhelming
      console.log("Loading dashboard data...");

      const productsData = await productService.getProducts({
        activeOnly: false,
      });
      console.log("Products loaded:", productsData?.length || 0);
      setProducts(productsData || []);

      const ordersData = await orderService.getOrders({ limit: 50 });
      console.log("Orders loaded:", ordersData?.length || 0);
      setOrders(ordersData || []);

      const categoriesData = await categoryService.getCategories(false);
      console.log("Categories loaded:", categoriesData?.length || 0);
      setCategories(categoriesData || []);

      // Calculate basic stats
      const totalOrders = ordersData?.length || 0;
      const totalRevenue =
        ordersData?.reduce(
          (sum: number, order: any) => sum + Number(order.total_amount || 0),
          0,
        ) || 0;
      const pendingOrders =
        ordersData?.filter((order: any) => order.status === "pending").length ||
        0;

      const statsData = {
        total_orders: totalOrders,
        total_revenue: totalRevenue,
        pending_orders: pendingOrders,
        total_products: productsData?.length || 0,
        total_customers: 0, // We'll calculate this later
        low_stock_products:
          productsData?.filter(
            (p: any) => p.stock_quantity <= p.min_stock_level,
          ).length || 0,
      };

      console.log("Stats calculated:", statsData);
      setStats(statsData);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      setError("Failed to load dashboard data. Please refresh the page.");
      toast({
        title: "Error",
        description: "Failed to load dashboard data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle product creation
  const handleAddProduct = async () => {
    if (!productForm.name || !productForm.price || !productForm.category_id) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setActionLoading(true);
    try {
      await productService.createProduct({
        ...productForm,
        price: parseFloat(productForm.price),
        stock_quantity: parseInt(productForm.stock_quantity) || 0,
        min_stock_level: parseInt(productForm.min_stock_level) || 5,
        is_active: true,
        is_featured: false,
        images: [],
        tags: [],
      });

      toast({
        title: "Success",
        description: `Product "${productForm.name}" added successfully.`,
      });

      // Reset form
      setProductForm({
        name: "",
        price: "",
        category_id: "",
        unit: "piece",
        description: "",
        stock_quantity: "",
        min_stock_level: "5",
      });

      await loadDashboardData();
    } catch (error) {
      console.error("Error adding product:", error);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle product deletion
  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    setActionLoading(true);
    try {
      await productService.deleteProduct(id);
      toast({
        title: "Success",
        description: `Product "${name}" deleted successfully.`,
      });
      await loadDashboardData();
    } catch (error) {
      console.error("Error deleting product:", error);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle order status update
  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    setActionLoading(true);
    try {
      await orderService.updateOrderStatus(orderId, status);
      toast({
        title: "Success",
        description: `Order status updated to ${status}.`,
      });
      await loadDashboardData();
    } catch (error) {
      console.error("Error updating order:", error);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await authService.signOut();
      navigate("/admin-login", { replace: true });
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const sidebarItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "products", label: "Products", icon: Package },
    { id: "orders", label: "Orders", icon: ShoppingCart },
    { id: "categories", label: "Categories", icon: FolderTree },
  ];

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "delivered":
        return "default";
      case "confirmed":
      case "preparing":
        return "secondary";
      case "pending":
        return "outline";
      case "cancelled":
        return "destructive";
      default:
        return "outline";
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-indigo-600" />
          <p className="text-gray-600">Loading admin dashboard...</p>
          <p className="text-sm text-gray-500 mt-2">This may take a moment</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Something went wrong
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-y-2">
            <Button onClick={() => window.location.reload()} className="w-full">
              Refresh Page
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/admin-login")}
              className="w-full"
            >
              Back to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary
      fallback={
        <div className="flex h-screen items-center justify-center bg-gray-50">
          <div className="text-center max-w-md">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Admin Panel Error
            </h2>
            <p className="text-gray-600 mb-4">
              The admin panel encountered an error. Please refresh the page.
            </p>
            <Button onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex min-h-screen bg-gray-50">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-6 border-b border-gray-200">
            <Link to="/" className="flex items-center gap-2">
              <Store className="h-6 w-6 text-indigo-600" />
              <span className="font-bold text-lg">Spar Express</span>
            </Link>
            <p className="text-sm text-gray-500 mt-1">Admin Panel</p>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${
                  activeTab === item.id
                    ? "bg-indigo-600 text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <Avatar>
                <AvatarFallback className="bg-indigo-600 text-white">
                  {currentUser?.full_name?.charAt(0) ||
                    currentUser?.email?.charAt(0) ||
                    "A"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {currentUser?.full_name || "Admin User"}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {currentUser?.email}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full justify-start"
              size="sm"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <header className="bg-white border-b border-gray-200 px-8 py-6">
            <h1 className="text-3xl font-bold text-gray-900">
              {sidebarItems.find((i) => i.id === activeTab)?.label}
            </h1>
            <p className="text-gray-600 mt-1">
              Manage your store operations and track performance
            </p>
          </header>

          <div className="p-8">
            {/* DASHBOARD */}
            {activeTab === "dashboard" && (
              <div className="space-y-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">
                        Total Revenue
                      </CardTitle>
                      <BarChart3 className="h-4 w-4 text-gray-400" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        ${stats.total_revenue?.toFixed(2) || "0.00"}
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        <span className="text-green-600">+12.5%</span> from last
                        month
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">
                        Total Orders
                      </CardTitle>
                      <ShoppingCart className="h-4 w-4 text-gray-400" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {stats.total_orders || 0}
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        <span className="text-green-600">
                          {stats.pending_orders || 0}
                        </span>{" "}
                        pending
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">
                        Products
                      </CardTitle>
                      <Package className="h-4 w-4 text-gray-400" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {stats.total_products || 0}
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        <span className="text-orange-600">
                          {stats.low_stock_products || 0}
                        </span>{" "}
                        low stock
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">
                        Categories
                      </CardTitle>
                      <Users className="h-4 w-4 text-gray-400" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {categories.length || 0}
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        <span className="text-green-600">Active</span>{" "}
                        categories
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Orders */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Orders</CardTitle>
                    <CardDescription>
                      Latest orders from your customers
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {orders.length === 0 ? (
                      <div className="text-center py-8">
                        <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          No orders yet
                        </h3>
                        <p className="text-gray-600">
                          Orders will appear here when customers start shopping
                        </p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Order</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {orders.slice(0, 5).map((order) => (
                            <TableRow key={order.id}>
                              <TableCell className="font-medium">
                                #{order.order_number}
                              </TableCell>
                              <TableCell>{order.customer_name}</TableCell>
                              <TableCell>${order.total_amount}</TableCell>
                              <TableCell>
                                <Badge
                                  variant={getStatusBadgeVariant(order.status)}
                                >
                                  {order.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {format(
                                  new Date(order.created_at),
                                  "MMM d, yyyy",
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* PRODUCTS */}
            {activeTab === "products" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Add New Product</CardTitle>
                    <CardDescription>
                      Add a new product to your inventory
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="p-name">Product Name *</Label>
                        <Input
                          id="p-name"
                          value={productForm.name}
                          onChange={(e) =>
                            setProductForm({
                              ...productForm,
                              name: e.target.value,
                            })
                          }
                          placeholder="e.g., Fresh Bananas"
                        />
                      </div>
                      <div>
                        <Label htmlFor="p-price">Price *</Label>
                        <Input
                          id="p-price"
                          type="number"
                          step="0.01"
                          value={productForm.price}
                          onChange={(e) =>
                            setProductForm({
                              ...productForm,
                              price: e.target.value,
                            })
                          }
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <Label htmlFor="p-cat">Category *</Label>
                        <Select
                          value={productForm.category_id}
                          onValueChange={(v) =>
                            setProductForm({ ...productForm, category_id: v })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.length > 0 ? (
                              categories.map((category) => (
                                <SelectItem
                                  key={category.id}
                                  value={category.id}
                                >
                                  {category.name}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="" disabled>
                                No categories available
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        {categories.length === 0 && (
                          <p className="text-xs text-red-500 mt-1">
                            No categories found. Please create categories first.
                          </p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="p-unit">Unit</Label>
                        <Select
                          value={productForm.unit}
                          onValueChange={(v) =>
                            setProductForm({ ...productForm, unit: v })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="piece">Piece</SelectItem>
                            <SelectItem value="kg">Kilogram</SelectItem>
                            <SelectItem value="lb">Pound</SelectItem>
                            <SelectItem value="pack">Pack</SelectItem>
                            <SelectItem value="bottle">Bottle</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="p-stock">Stock Quantity</Label>
                        <Input
                          id="p-stock"
                          type="number"
                          value={productForm.stock_quantity}
                          onChange={(e) =>
                            setProductForm({
                              ...productForm,
                              stock_quantity: e.target.value,
                            })
                          }
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <Label htmlFor="p-min">Min Stock Level</Label>
                        <Input
                          id="p-min"
                          type="number"
                          value={productForm.min_stock_level}
                          onChange={(e) =>
                            setProductForm({
                              ...productForm,
                              min_stock_level: e.target.value,
                            })
                          }
                          placeholder="5"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label htmlFor="p-desc">Description</Label>
                        <Textarea
                          id="p-desc"
                          value={productForm.description}
                          onChange={(e) =>
                            setProductForm({
                              ...productForm,
                              description: e.target.value,
                            })
                          }
                          placeholder="Product description..."
                          rows={3}
                        />
                      </div>
                    </div>
                    <Button
                      onClick={handleAddProduct}
                      className="mt-4"
                      disabled={actionLoading}
                    >
                      {actionLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Adding Product...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Product
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Product Inventory</CardTitle>
                    <CardDescription>
                      Manage your product catalog
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {products.length === 0 ? (
                      <div className="text-center py-8">
                        <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          No products yet
                        </h3>
                        <p className="text-gray-600">
                          Add your first product above to get started
                        </p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Stock</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {products.map((product) => (
                            <TableRow key={product.id}>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center">
                                    <Package className="h-4 w-4 text-gray-400" />
                                  </div>
                                  <div>
                                    <p className="font-medium">
                                      {product.name}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {product.unit}
                                    </p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                {product.category?.name || "Uncategorized"}
                              </TableCell>
                              <TableCell>${product.price}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {product.stock_quantity}
                                  {product.stock_quantity <=
                                    product.min_stock_level && (
                                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    product.is_active ? "default" : "outline"
                                  }
                                >
                                  {product.is_active ? "Active" : "Inactive"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    disabled={actionLoading}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      handleDeleteProduct(
                                        product.id,
                                        product.name,
                                      )
                                    }
                                    disabled={actionLoading}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ORDERS */}
            {activeTab === "orders" && (
              <Card>
                <CardHeader>
                  <CardTitle>Order Management</CardTitle>
                  <CardDescription>
                    View and update order status
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {orders.length === 0 ? (
                    <div className="text-center py-8">
                      <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No orders yet
                      </h3>
                      <p className="text-gray-600">
                        Orders will appear here when customers place them
                      </p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-medium">
                              #{order.order_number}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">
                                  {order.customer_name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {order.customer_email}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>${order.total_amount}</TableCell>
                            <TableCell>
                              {format(
                                new Date(order.created_at),
                                "MMM d, yyyy",
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={getStatusBadgeVariant(order.status)}
                              >
                                {order.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={order.status}
                                onValueChange={(value) =>
                                  handleUpdateOrderStatus(order.id, value)
                                }
                                disabled={actionLoading}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">
                                    Pending
                                  </SelectItem>
                                  <SelectItem value="confirmed">
                                    Confirmed
                                  </SelectItem>
                                  <SelectItem value="preparing">
                                    Preparing
                                  </SelectItem>
                                  <SelectItem value="ready_for_pickup">
                                    Ready
                                  </SelectItem>
                                  <SelectItem value="out_for_delivery">
                                    Out for Delivery
                                  </SelectItem>
                                  <SelectItem value="delivered">
                                    Delivered
                                  </SelectItem>
                                  <SelectItem value="cancelled">
                                    Cancelled
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            )}

            {/* CATEGORIES */}
            {activeTab === "categories" && (
              <Card>
                <CardHeader>
                  <CardTitle>Categories Overview</CardTitle>
                  <CardDescription>
                    Manage your product categories
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {categories.length === 0 ? (
                    <div className="text-center py-8">
                      <FolderTree className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No categories yet
                      </h3>
                      <p className="text-gray-600 mb-4">
                        Categories help organize your products. Run this SQL
                        command to add default categories:
                      </p>
                      <div className="bg-gray-100 p-4 rounded-lg text-left text-sm font-mono">
                        <p>
                          INSERT INTO public.categories (name, slug,
                          description, is_active, sort_order) VALUES
                        </p>
                        <p>
                          ('Fresh Produce', 'fresh-produce', 'Fresh fruits and
                          vegetables', true, 1),
                        </p>
                        <p>
                          ('Dairy & Eggs', 'dairy-eggs', 'Milk, cheese, eggs',
                          true, 2),
                        </p>
                        <p>
                          ('Bakery', 'bakery', 'Fresh bread and pastries', true,
                          3);
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {categories.map((category) => {
                        const productCount = products.filter(
                          (p) => p.category_id === category.id,
                        ).length;
                        return (
                          <Card key={category.id}>
                            <CardHeader>
                              <CardTitle className="text-lg">
                                {category.name}
                              </CardTitle>
                              <CardDescription>
                                {category.description}
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="flex items-center justify-between">
                                <p className="text-sm text-gray-600">
                                  {productCount} product
                                  {productCount !== 1 ? "s" : ""}
                                </p>
                                <Badge
                                  variant={
                                    category.is_active ? "default" : "outline"
                                  }
                                >
                                  {category.is_active ? "Active" : "Inactive"}
                                </Badge>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
};

export default Admin;
