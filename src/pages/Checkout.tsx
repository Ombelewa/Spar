import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Store, Truck, CreditCard, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/supabase";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import axios from "axios";

interface Address {
  id: string;
  label: string;
  street: string;
  city: string;
  is_default: boolean;
}

interface ProfileData {
  id: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  phone: string;
  email?: string;
}

const Checkout = () => {
  const [fulfillmentType, setFulfillmentType] = useState<"delivery" | "pickup">(
    "delivery",
  );
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [deliveryTime, setDeliveryTime] = useState("asap");
  const [loading, setLoading] = useState(false);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [orderCompleted, setOrderCompleted] = useState(false);
  const [completedOrderDetails, setCompletedOrderDetails] = useState<any>(null);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);

  const { toast } = useToast();
  const navigate = useNavigate();

  // PayPal Client ID - Get this from your PayPal Developer Dashboard
  const paypalClientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;
  const isPayPalConfigured =
    paypalClientId && paypalClientId !== "your_paypal_client_id_here";

  // Redirect to products if cart is empty (only after data is fully loaded)
  useEffect(() => {
    // Only check after initial data load is complete and we're not in loading state
    if (initialDataLoaded && !loading && !orderCompleted) {
      // Double-check cart is actually empty and we're not in a loading state
      if (cartItems.length === 0) {
        console.log("Cart is empty after data load, redirecting to products");
        toast({
          title: "Cart is Empty",
          description: "Add items to your cart before checkout.",
        });
        navigate("/products");
      }
    }
  }, [
    initialDataLoaded,
    loading,
    cartItems.length,
    orderCompleted,
    navigate,
    toast,
  ]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          console.log("No user found, redirecting to /auth");
          navigate("/auth");
          return;
        }
        setUser(user);

        // Fetch profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, full_name, phone, email")
          .eq("id", user.id)
          .single();
        if (profileData) {
          // Split full_name into first and last name if available
          const nameParts = (profileData.full_name || "").split(" ");
          const firstName = nameParts[0] || "";
          const lastName = nameParts.slice(1).join(" ") || "";

          setProfile({
            ...profileData,
            first_name: firstName,
            last_name: lastName,
          });

          setFirstName(firstName);
          setLastName(lastName);
          setPhone(profileData.phone || "");
        }

        // Fetch addresses (with fallback for missing table)
        let addressData: any[] = [];
        try {
          const { data } = await supabase
            .from("addresses")
            .select("*")
            .eq("customer_id", user.id)
            .order("is_default", { ascending: false });
          addressData = data || [];
          setAddresses(addressData);
        } catch (error) {
          console.log("Addresses table not yet available:", error);
          setAddresses([]);
        }

        // Fetch cart
        const { data: cartData } = await supabase
          .from("cart_items")
          .select("*, product:products(*)")
          .eq("customer_id", user.id);
        const loadedCartItems = cartData || [];
        console.log("Cart data loaded:", loadedCartItems.length, "items");
        setCartItems(loadedCartItems);

        // Set default address
        if (addressData && addressData.length > 0) {
          const defaultAddress = addressData.find(
            (addr: Address) => addr.is_default,
          );
          if (defaultAddress) {
            setSelectedAddress(defaultAddress);
            setAddress(defaultAddress.street_address);
            setCity(defaultAddress.city);
          }
        }
      } catch (error) {
        console.error("Fetch error:", error);
        setError(`Fetch error: ${error.message}`);
      } finally {
        setLoading(false);
        // Set initial data loaded flag after a brief delay to ensure state is updated
        setTimeout(() => {
          setInitialDataLoaded(true);
        }, 100);
      }
    };
    fetchData();
  }, [navigate, toast]);

  const calculateTotal = () => {
    return cartItems.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0,
    );
  };

  const placeOrder = async (paymentId?: string, payerEmail?: string) => {
    // Prevent double orders
    if (orderCompleted) {
      toast({
        title: "Order Already Placed",
        description: "This order has already been completed.",
        variant: "destructive",
      });
      return;
    }

    if (!profile) {
      toast({
        title: "Error",
        description: "Profile not loaded.",
        variant: "destructive",
      });
      return;
    }

    const total = calculateTotal();
    const deliveryFee = total > 200 ? 0 : 35;
    const orderTotal = total + deliveryFee;

    try {
      setLoading(true);
      // Generate order number
      const orderNumber = `ORD-${Date.now()}`;

      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert([
          {
            order_number: orderNumber,
            customer_id: profile.id,
            delivery_method: fulfillmentType,
            status: paymentId ? "confirmed" : "pending",
            payment_status: paymentId ? "paid" : "pending",
            subtotal: total,
            tax_amount: 0,
            delivery_fee: deliveryFee,
            discount_amount: 0,
            total_amount: orderTotal,
            customer_name:
              `${firstName || profile.first_name || ""} ${lastName || profile.last_name || ""}`.trim(),
            customer_email: profile.email,
            customer_phone: phone || profile.phone || "",
            delivery_address:
              fulfillmentType === "delivery"
                ? {
                    street: address,
                    city: city,
                    instructions: "",
                  }
                : null,
            payment_method: paymentId ? "paypal" : null,
            payment_reference: paymentId,
            payment_details: payerEmail ? { payer_email: payerEmail } : null,
          },
        ])
        .select()
        .single();

      if (orderError) throw orderError;

      // Store order ID for PayPal completion
      setOrderId(orderData.id);

      const items = cartItems.map((item) => ({
        order_id: orderData.id,
        product_id: item.product_id,
        product_name: item.product.name,
        product_price: item.product.price,
        quantity: item.quantity,
        total_price: item.product.price * item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(items);
      if (itemsError) throw itemsError;

      // Clear cart
      await supabase.from("cart_items").delete().eq("customer_id", profile.id);

      // Set completion state immediately
      setOrderCompleted(true);
      setCompletedOrderDetails({
        orderNumber: orderData.order_number,
        total: orderData.total_amount,
        paymentReference: paymentId || "DEMO_" + Date.now(),
        customerName:
          `${firstName || profile.first_name || ""} ${lastName || profile.last_name || ""}`.trim(),
      });

      // Clear cart items from UI
      setCartItems([]);

      toast({
        title: "Order Placed Successfully!",
        description:
          fulfillmentType === "delivery"
            ? "Your groceries will be delivered within 60 minutes."
            : "Your order will be ready for pickup in 30 minutes.",
      });

      // Navigate after a short delay for demo mode
      if (!paymentId) {
        setTimeout(() => {
          navigate("/profile");
        }, 2000);
      }
    } catch (error: any) {
      console.error("Place order error:", error);
      toast({
        title: "Order Failed",
        description: error.message || "Could not place order.",
        variant: "destructive",
      });
      throw error; // Re-throw for PayPal error handling
    } finally {
      setLoading(false);
    }
  };

  // PayPal createOrder function
  const createOrder = async (data: any, actions: any) => {
    setLoading(true);

    if (fulfillmentType === "delivery") {
      if (!firstName || !lastName || !phone || !address || !city) {
        toast({
          title: "Validation Error",
          description: "All delivery fields are required.",
          variant: "destructive",
        });
        setLoading(false);
        return null;
      }
    }

    if (cartItems.length === 0) {
      toast({
        title: "Error",
        description: "Your cart is empty.",
        variant: "destructive",
      });
      setLoading(false);
      return null;
    }

    const total = calculateTotal();

    const deliveryFee = total > 200 ? 0 : 35;
    const grandTotal = total + deliveryFee;

    return actions.order.create({
      purchase_units: [
        {
          amount: {
            value: grandTotal.toFixed(2), // PayPal amount in ZAR
            currency_code: "USD", // Using USD for sandbox - change to ZAR for production
            breakdown: {
              item_total: {
                currency_code: "USD",
                value: total.toFixed(2),
              },
              shipping: {
                currency_code: "USD",
                value: deliveryFee.toFixed(2),
              },
            },
          },
          description: `Grocery Order - ${cartItemsCount} items`,
          custom_id: user?.id, // Track user
          items: cartItems.map((item: any) => ({
            name: item.product.name,
            unit_amount: {
              currency_code: "USD",
              value: item.product.price.toFixed(2),
            },
            quantity: item.quantity,
            description: `Qty: ${item.quantity}`,
          })),
        },
      ],
    });
  };

  // PayPal onApprove function
  const onApprove = async (data: any, actions: any) => {
    try {
      const details = await actions.order.capture();
      const name = details.payer.name.given_name;
      const email = details.payer.email_address;

      console.log("PayPal transaction completed:", details);

      // Immediately set order as completed to prevent UI issues
      setOrderCompleted(true);
      setCompletedOrderDetails({
        orderNumber: `ORD-${Date.now()}`,
        total: calculateTotal() + (calculateTotal() > 200 ? 0 : 35),
        paymentReference: details.id,
        customerName: `${name}`,
      });

      // Create order in database
      await placeOrder(details.id, email);

      toast({
        title: "Payment Successful!",
        description: `Thank you ${name}! Your order has been placed. Redirecting...`,
      });

      // Navigate immediately to profile
      setTimeout(() => {
        navigate("/profile");
      }, 1000);

      return details;
    } catch (error) {
      console.error("PayPal error:", error);
      // Reset completion state on error
      setOrderCompleted(false);
      setCompletedOrderDetails(null);
      toast({
        title: "Payment Failed",
        description:
          "There was an issue processing your payment. Please try again.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  // PayPal onError function
  const onError = (err: any) => {
    console.error("PayPal error:", err);
    setLoading(false);
    toast({
      title: "Payment Error",
      description:
        "There was an error with the payment processor. Please try again.",
      variant: "destructive",
    });
  };

  // PayPal onCancel function
  const onCancel = (data: any) => {
    console.log("PayPal payment cancelled:", data);
    setLoading(false);
    toast({
      title: "Payment Cancelled",
      description: "Your payment was cancelled. Your cart is still available.",
      variant: "default",
    });
  };

  const cartItemsCount = cartItems.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  const total = calculateTotal();
  const deliveryFee = total > 200 ? 0 : 35;
  const grandTotal = total + deliveryFee;

  if (loading || !initialDataLoaded)
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-indigo-600" />
          <p className="text-gray-600">Loading checkout...</p>
        </div>
      </div>
    );

  // Success page component
  const OrderSuccessPage = () => (
    <div className="min-h-screen bg-background">
      <Navbar cartItemsCount={0} />
      <main className="container py-8">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-green-50 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-8">
            <svg
              className="w-12 h-12 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 13l4 4L19 7"
              ></path>
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-green-600 mb-4">
            Order Successful!
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            Thank you {completedOrderDetails?.customerName}! Your order has been
            placed successfully.
          </p>
          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <h2 className="font-semibold mb-4">Order Details</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Order Number:</span>
                <span className="font-mono">
                  {completedOrderDetails?.orderNumber}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Total Amount:</span>
                <span>R {completedOrderDetails?.total?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Payment Reference:</span>
                <span className="font-mono text-xs">
                  {completedOrderDetails?.paymentReference}
                </span>
              </div>
            </div>
          </div>
          <p className="text-gray-600 mb-8">
            {fulfillmentType === "delivery"
              ? "Your groceries will be delivered within 60 minutes."
              : "Your order will be ready for pickup in 30 minutes."}
          </p>
          <button
            onClick={() => navigate("/profile")}
            className="bg-primary text-white px-8 py-3 rounded-lg hover:bg-primary/90 transition-colors"
          >
            View My Orders
          </button>
        </div>
      </main>
    </div>
  );

  const CheckoutContent = () => (
    <div className="min-h-screen bg-background relative">
      {/* Loading Overlay */}
      {loading && cartItems.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-8 max-w-sm w-full mx-4 text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-indigo-600" />
            <h3 className="text-lg font-semibold mb-2">
              Processing Payment...
            </h3>
            <p className="text-gray-600">
              Please don't close this window. We're processing your order.
            </p>
          </div>
        </div>
      )}

      <Navbar cartItemsCount={cartItemsCount} />
      <main className="container py-8">
        <h1 className="text-4xl font-bold mb-8">Checkout</h1>
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center py-2"
                  >
                    <div>
                      <p className="font-medium">{item.product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Qty: {item.quantity}
                      </p>
                    </div>
                    <p className="font-semibold">
                      R {(item.product.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                ))}
                <div className="pt-4 border-t space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>R {total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Fee</span>
                    <span>
                      {deliveryFee === 0
                        ? "FREE"
                        : `R ${deliveryFee.toFixed(2)}`}
                    </span>
                  </div>
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>R {grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Fulfillment Method */}
            <Card>
              <CardHeader>
                <CardTitle>Fulfillment Method</CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={fulfillmentType}
                  onValueChange={(value) =>
                    setFulfillmentType(value as "delivery" | "pickup")
                  }
                >
                  <div className="flex items-center space-x-2 p-4 border-2 rounded-lg transition-colors hover:border-primary cursor-pointer">
                    <RadioGroupItem value="delivery" id="delivery" />
                    <Label htmlFor="delivery" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <Truck className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <div className="font-semibold">Home Delivery</div>
                          <div className="text-sm text-muted-foreground">
                            Delivered to your doorstep
                          </div>
                        </div>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-4 border-2 rounded-lg transition-colors hover:border-primary cursor-pointer mt-2">
                    <RadioGroupItem value="pickup" id="pickup" />
                    <Label htmlFor="pickup" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center">
                          <Store className="h-6 w-6 text-secondary" />
                        </div>
                        <div>
                          <div className="font-semibold">Store Pickup</div>
                          <div className="text-sm text-muted-foreground">
                            Collect from your nearest SPAR
                          </div>
                        </div>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Delivery Address */}
            {fulfillmentType === "delivery" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    Delivery Address
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>First Name</Label>
                      <Input
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="First Name"
                      />
                    </div>
                    <div>
                      <Label>Last Name</Label>
                      <Input
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Last Name"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Phone Number"
                    />
                  </div>
                  <div>
                    <Label>Street Address</Label>
                    <Input
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Street Address"
                    />
                  </div>
                  <div>
                    <Label>City</Label>
                    <Input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="City"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Delivery Time */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Delivery Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={deliveryTime}
                  onValueChange={setDeliveryTime}
                >
                  <div className="flex items-center space-x-2 p-4 border-2 rounded-lg cursor-pointer">
                    <RadioGroupItem value="asap" id="asap" />
                    <Label htmlFor="asap" className="cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <Clock className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <div className="font-semibold">ASAP</div>
                          <div className="text-sm text-muted-foreground">
                            Deliver as soon as possible (within 60 min)
                          </div>
                        </div>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-4 border-2 rounded-lg cursor-pointer mt-2">
                    <RadioGroupItem value="scheduled" id="scheduled" />
                    <Label htmlFor="scheduled" className="cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center">
                          <Clock className="h-6 w-6 text-secondary" />
                        </div>
                        <div>
                          <div className="font-semibold">Scheduled</div>
                          <div className="text-sm text-muted-foreground">
                            Choose a specific time slot
                          </div>
                        </div>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>R {total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Fee</span>
                    <span>
                      {deliveryFee === 0
                        ? "FREE"
                        : `R ${deliveryFee.toFixed(2)}`}
                    </span>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>R {grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Payment Method
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {isPayPalConfigured && !orderCompleted ? (
                    <>
                      <div className="text-center py-4">
                        <PayPalButtons
                          style={{ layout: "vertical" }}
                          createOrder={createOrder}
                          onApprove={onApprove}
                          onError={onError}
                          onCancel={onCancel}
                          disabled={
                            loading ||
                            grandTotal === 0 ||
                            !cartItems.length ||
                            orderCompleted
                          }
                        />
                      </div>
                      <div className="text-xs text-muted-foreground text-center space-y-1">
                        <p>🛡️ Secure payment powered by PayPal</p>
                        <p>💳 Accepts all major credit/debit cards</p>
                        <p>🔒 100% secure transaction</p>
                      </div>
                    </>
                  ) : !orderCompleted ? (
                    <div className="text-center py-8">
                      <div className="text-muted-foreground mb-4">
                        <CreditCard className="h-12 w-12 mx-auto mb-2" />
                        <p>PayPal payment is not configured yet.</p>
                        <p className="text-sm">
                          Contact support to enable online payments.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-green-600 mb-4">
                        <svg
                          className="w-12 h-12 mx-auto mb-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M5 13l4 4L19 7"
                          ></path>
                        </svg>
                        <p>Order completed successfully!</p>
                        <p className="text-sm">Redirecting to your orders...</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Fallback button for demo/testing */}
                {import.meta.env.DEV && !orderCompleted && (
                  <Button
                    className="w-full mt-4"
                    variant="outline"
                    onClick={async () => {
                      try {
                        await placeOrder(
                          "DEMO_" + Date.now(),
                          "demo@example.com",
                        );
                        toast({
                          title: "Demo Order Placed!",
                          description: "Redirecting to profile...",
                        });
                      } catch (error) {
                        // Error already handled in placeOrder
                      }
                    }}
                    disabled={loading || grandTotal === 0 || orderCompleted}
                  >
                    🎯 Demo: Place Order (Development)
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );

  // Show success page if order is completed
  if (orderCompleted) {
    return <OrderSuccessPage />;
  }

  return isPayPalConfigured ? (
    <PayPalScriptProvider
      options={{
        clientId: paypalClientId!,
        currency: "USD",
        intent: "capture",
      }}
    >
      <CheckoutContent />
    </PayPalScriptProvider>
  ) : (
    <CheckoutContent />
  );
};

export default Checkout;
