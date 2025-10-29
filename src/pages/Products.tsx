import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import ProductCard, { Product } from "@/components/ProductCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, SlidersHorizontal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/supabase";

const Products = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showInStockOnly, setShowInStockOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const isMounted = useRef(true);
  const [searchParams] = useSearchParams();

  const categories = [
    { id: "all", name: "All Products" },
    { id: "fruits", name: "Fruits" },
    { id: "vegetables", name: "Vegetables" },
    { id: "dairy", name: "Dairy" },
    { id: "bakery", name: "Bakery" },
  ];

  useEffect(() => {
    isMounted.current = true;

    const fetchData = async () => {
      if (!isMounted.current) return;

      try {
        setLoading(true);
        setError(null);

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw new Error("Authentication error: " + userError.message);
        if (!user) {
          console.log("No user found, redirecting to auth");
          navigate("/auth");
          return;
        }

        const { data: productData, error: productError } = await supabase
          .from("products")
          .select("*");
        if (productError) throw new Error("Product fetch error: " + productError.message);
        setProducts(productData || []);

        const { data: cartData, error: cartError } = await supabase
          .from("cart_items")
          .select("*, product:products(*)")
          .eq("user_id", user.id);
        if (cartError) throw new Error("Cart fetch error: " + cartError.message);

        setCart(
          cartData?.map((item) => ({
            product: item.product,
            quantity: item.quantity,
          })) || []
        );

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
  }, [navigate, searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || selectedCategory === "all" || product.category === selectedCategory;
    const matchesStock = !showInStockOnly || product.stock > 0;
    return matchesSearch && matchesCategory && matchesStock;
  });

  const handleAddToCart = async (product: Product, quantity: number) => {
    if (!product.stock || quantity > product.stock) {
      setError(`Cannot add ${product.name}: Insufficient stock`);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: existingItem, error: fetchError } = await supabase
        .from("cart_items")
        .select("*")
        .eq("user_id", user.id)
        .eq("product_id", product.id)
        .maybeSingle();

      if (fetchError && fetchError.code !== "PGRST116") {
        throw new Error("Cart fetch error: " + fetchError.message);
      }

      if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;
        if (newQuantity > product.stock) {
          setError(`Cannot add ${quantity} more ${product.name}: Only ${product.stock} in stock`);
          return;
        }

        const { error: updateError } = await supabase
          .from("cart_items")
          .update({ quantity: newQuantity })
          .eq("id", existingItem.id);
        if (updateError) throw new Error("Cart update error: " + updateError.message);

        setCart((prevCart) =>
          prevCart.map((item) =>
            item.product.id === product.id
              ? { ...item, quantity: newQuantity }
              : item
          )
        );
      } else {
        const { error: insertError } = await supabase
          .from("cart_items")
          .insert([{ user_id: user.id, product_id: product.id, quantity }]);
        if (insertError) throw new Error("Cart insert error: " + insertError.message);

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

  if (loading) return <div>Loading...</div>;
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
                variant={selectedCategory === category.id || (selectedCategory === null && category.id === "all") ? "default" : "outline"}
                className="cursor-pointer px-4 py-2"
                onClick={() => setSelectedCategory(category.id === "all" ? null : category.id)}
              >
                {category.name}
              </Badge>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={handleAddToCart}
            />
          ))}
        </div>
        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">No products found</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Products;