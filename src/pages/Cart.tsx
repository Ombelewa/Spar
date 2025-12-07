import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Minus, Plus, Trash2, ArrowLeft } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/supabase";
import { authService } from "@/lib/supabase-service";

interface CartItem {
  id: string;
  product: {
    id: string;
    name: string;
    price: number;
    image_url: string;
    unit: string;
    stock: number;
  };
  quantity: number;
}

const Cart = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const navigate = useNavigate();
  const isMounted = useRef(true);
  const { toast } = useToast();

  // Guest cart management using localStorage
  const getGuestCart = (): CartItem[] => {
    try {
      const cart = localStorage.getItem("guestCart");
      return cart ? JSON.parse(cart) : [];
    } catch {
      return [];
    }
  };

  const saveGuestCart = (cart: CartItem[]) => {
    localStorage.setItem("guestCart", JSON.stringify(cart));
  };

  useEffect(() => {
    isMounted.current = true;

    const fetchCart = async () => {
      if (!isMounted.current) return;

      try {
        setLoading(true);
        setError(null);

        const user = await authService.getCurrentUser();

        if (!user) {
          // Guest user - load cart from localStorage
          console.log("Guest user detected, loading cart from localStorage");
          setIsGuest(true);
          const guestCart = getGuestCart();
          setCartItems(guestCart);
        } else {
          // Authenticated user - load cart from database
          setIsGuest(false);
          const { data, error } = await supabase
            .from("cart_items")
            .select("*, product:products(*)")
            .eq("customer_id", user.id);

          if (error) throw error;
          setCartItems(data || []);
        }
      } catch (error: any) {
        console.error("Fetch Error:", error);
        setError(error.message || "Failed to load cart");
      } finally {
        if (isMounted.current) setLoading(false);
      }
    };

    fetchCart();

    return () => {
      isMounted.current = false;
    };
  }, []);

  const updateQuantity = async (id: string, change: number) => {
    try {
      const item = cartItems.find((item) => item.id === id);
      if (!item) return;

      const newQuantity = Math.max(1, item.quantity + change);
      if (newQuantity > item.product.stock) {
        setError(
          `Cannot set quantity to ${newQuantity} for ${item.product.name}: Only ${item.product.stock} in stock`,
        );
        return;
      }

      if (isGuest) {
        // Guest user - update localStorage
        const updatedItems = cartItems.map((item) =>
          item.id === id ? { ...item, quantity: newQuantity } : item,
        );
        setCartItems(updatedItems);
        saveGuestCart(updatedItems);
      } else {
        // Authenticated user - update database
        const { error } = await supabase
          .from("cart_items")
          .update({ quantity: newQuantity })
          .eq("id", id);
        if (error) throw new Error("Quantity update error: " + error.message);

        setCartItems((items) =>
          items.map((item) =>
            item.id === id ? { ...item, quantity: newQuantity } : item,
          ),
        );
      }
    } catch (err) {
      console.error("Update Quantity Error:", err);
      setError(err.message || "Error updating quantity");
    }
  };

  const removeItem = async (id: string) => {
    try {
      if (isGuest) {
        // Guest user - remove from localStorage
        const updatedItems = cartItems.filter((item) => item.id !== id);
        setCartItems(updatedItems);
        saveGuestCart(updatedItems);
      } else {
        // Authenticated user - remove from database
        const { error } = await supabase
          .from("cart_items")
          .delete()
          .eq("id", id);
        if (error) throw new Error("Remove item error: " + error.message);

        setCartItems((items) => items.filter((item) => item.id !== id));
      }
    } catch (err) {
      console.error("Remove Item Error:", err);
      setError(err.message || "Error removing item");
    }
  };

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  );
  const deliveryFee = subtotal > 200 ? 0 : 35;
  const total = subtotal + deliveryFee;

  if (loading) return <div>Loading...</div>;
  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar
          cartItemsCount={cartItems.reduce(
            (sum, item) => sum + item.quantity,
            0,
          )}
        />
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
      <Navbar
        cartItemsCount={cartItems.reduce((sum, item) => sum + item.quantity, 0)}
      />
      <main className="container py-8">
        <div className="mb-6">
          <Link to="/products">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Continue Shopping
            </Button>
          </Link>
          <h1 className="text-4xl font-bold">Shopping Cart</h1>
        </div>

        {cartItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg mb-4">
              Your cart is empty
            </p>
            <Link to="/products">
              <Button>Start Shopping</Button>
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <img
                        src={item.product.image_url}
                        alt={item.product.name}
                        className="w-24 h-24 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">
                          {item.product.name}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          {item.product.unit}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="text-lg font-bold text-primary">
                            R {(item.product.price * item.quantity).toFixed(2)}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => updateQuantity(item.id, -1)}
                              className="h-8 w-8"
                              disabled={item.quantity === 1}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <div className="w-12 text-center font-semibold">
                              {item.quantity}
                            </div>
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => updateQuantity(item.id, 1)}
                              className="h-8 w-8"
                              disabled={item.quantity >= item.product.stock}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => removeItem(item.id)}
                              className="h-8 w-8 text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="lg:col-span-1">
              <Card className="sticky top-20">
                <CardContent className="p-6 space-y-4">
                  <h2 className="text-xl font-bold">Order Summary</h2>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium">
                        R {subtotal.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Delivery Fee
                      </span>
                      <span className="font-medium">
                        {deliveryFee === 0
                          ? "FREE"
                          : `R ${deliveryFee.toFixed(2)}`}
                      </span>
                    </div>
                    {subtotal < 200 && (
                      <p className="text-sm text-muted-foreground">
                        Add R {(200 - subtotal).toFixed(2)} more for free
                        delivery
                      </p>
                    )}
                    <div className="pt-4 border-t">
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total</span>
                        <span className="text-primary">
                          R {total.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Link to="/checkout">
                    <Button className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90">
                      Proceed to Checkout
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Cart;
