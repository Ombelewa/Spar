import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import ProductCard, { Product } from "@/components/ProductCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, SlidersHorizontal, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { categoryService, productService } from "@/lib/supabase-service";
import { supabase } from "@/supabase";

const Products = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>(
    [],
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showInStockOnly, setShowInStockOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const isMounted = useRef(true);
  const [searchParams] = useSearchParams();
  const { slug } = useParams();

  useEffect(() => {
    isMounted.current = true;

    const fetchData = async () => {
      if (!isMounted.current) return;

      try {
        setLoading(true);
        setError(null);

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError)
          throw new Error("Authentication error: " + userError.message);
        if (!user) {
          console.log("No user found, redirecting to auth");
          navigate("/auth");
          return;
        }

        // Load categories from database
        const categoriesData = await categoryService.getCategories(true);
        const categoriesWithAll = [
          { id: "all", name: "All Products", slug: "all" },
          ...categoriesData,
        ];
        setCategories(categoriesWithAll);

        // Load products from database
        const productsData = await productService.getProducts({
          activeOnly: true,
        });
        setProducts(productsData || []);
        setAllProducts(productsData || []);

        // Load cart data
        const { data: cartData, error: cartError } = await supabase
          .from("cart_items")
          .select("*, product:products(*)")
          .eq("customer_id", user.id);
        if (cartError)
          throw new Error("Cart fetch error: " + cartError.message);

        setCart(
          cartData?.map((item) => ({
            product: item.product,
            quantity: item.quantity,
          })) || [],
        );

        // Handle category from URL params
        if (slug && slug !== "all") {
          const category = categoriesData.find((cat: any) => cat.slug === slug);
          if (category) {
            setSelectedCategory(category.id);
          }
        }

        // Sync search query from URL
        const query = searchParams.get("search") || "";
        setSearchQuery(query);
      } catch (err) {
        console.error("Fetch Error:", err);
        setError(err.message || "Failed to load products");
      } finally {
        if (isMounted.current) setLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted.current = false;
    };
  }, [navigate, searchParams, slug]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
  };

  // Filter products based on search, category, and stock
  useEffect(() => {
    let filtered = [...allProducts];

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.description
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()),
      );
    }

    // Filter by category
    if (selectedCategory && selectedCategory !== "all") {
      filtered = filtered.filter(
        (product) => product.category_id === selectedCategory,
      );
    }

    // Filter by stock
    if (showInStockOnly) {
      filtered = filtered.filter((product) => product.stock_quantity > 0);
    }

    setProducts(filtered);
  }, [allProducts, searchQuery, selectedCategory, showInStockOnly]);

  const handleAddToCart = async (product: Product, quantity: number) => {
    if (!product.stock_quantity || quantity > product.stock_quantity) {
      toast({
        title: "Out of Stock",
        description: `Cannot add ${product.name}: Insufficient stock`,
        variant: "destructive",
      });
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: existingItem, error: fetchError } = await supabase
        .from("cart_items")
        .select("*")
        .eq("customer_id", user.id)
        .eq("product_id", product.id)
        .maybeSingle();

      if (fetchError && fetchError.code !== "PGRST116") {
        throw new Error("Cart fetch error: " + fetchError.message);
      }

      if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;
        if (newQuantity > product.stock_quantity) {
          toast({
            title: "Stock Limit",
            description: `Cannot add ${quantity} more ${product.name}: Only ${product.stock_quantity} in stock`,
            variant: "destructive",
          });
          return;
        }

        const { error: updateError } = await supabase
          .from("cart_items")
          .update({ quantity: newQuantity })
          .eq("id", existingItem.id);
        if (updateError)
          throw new Error("Cart update error: " + updateError.message);

        setCart((prevCart) =>
          prevCart.map((item) =>
            item.product.id === product.id
              ? { ...item, quantity: newQuantity }
              : item,
          ),
        );
      } else {
        const { error: insertError } = await supabase
          .from("cart_items")
          .insert([{ customer_id: user.id, product_id: product.id, quantity }]);
        if (insertError)
          throw new Error("Cart insert error: " + insertError.message);

        setCart((prevCart) => [...prevCart, { product, quantity }]);
      }

      toast({
        title: "Added to cart",
        description: `${quantity}x ${product.name}`,
      });
    } catch (err) {
      console.error("Add to Cart Error:", err);
      setError(err.message || "Error adding to cart");
    }
  };

  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-indigo-600" />
              <p className="text-gray-600">Loading products...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar cartItemsCount={cartItemsCount} />
        <main className="container py-8">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar cartItemsCount={cartItemsCount} />
      <main className="container py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Shop Products</h1>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <form onSubmit={handleSearch}>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search for products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </form>
            </div>
            <Button
              variant="outline"
              className="md:w-auto"
              onClick={() => setShowInStockOnly(!showInStockOnly)}
            >
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              {showInStockOnly ? "Show All" : "In Stock Only"}
            </Button>
          </div>
          <div className="flex gap-2 flex-wrap">
            {categories.map((category) => (
              <Badge
                key={category.id}
                variant={
                  selectedCategory === category.id ||
                  (selectedCategory === null && category.id === "all")
                    ? "default"
                    : "outline"
                }
                className="cursor-pointer px-4 py-2"
                onClick={() =>
                  setSelectedCategory(
                    category.id === "all" ? null : category.id,
                  )
                }
              >
                {category.name}
              </Badge>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={handleAddToCart}
            />
          ))}
        </div>
        {products.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">No products found</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Products;
