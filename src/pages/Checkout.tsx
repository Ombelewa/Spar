import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Store, Truck } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/supabase";
import { usePaystackPayment } from 'react-paystack';
import axios from 'axios';

interface Address {
  id: string;
  label: string;
  street: string;
  city: string;
  is_default: boolean;
}

interface ProfileData {
  id: string; // Added id field
  first_name: string;
  last_name: string;
  phone: string;
  email?: string; // Added email for Paystack config
}

const Checkout = () => {
  const [fulfillmentType, setFulfillmentType] = useState<"delivery" | "pickup">("delivery");
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [deliveryTime, setDeliveryTime] = useState("asap");
  const [loading, setLoading] = useState(false);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [user, setUser] = useState<any | null>(null); // Added user state
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");

  const { toast } = useToast();
  const navigate = useNavigate();

  // Paystack config
  const [config, setConfig] = useState({
    reference: (Date.now() + '').slice(-8),
    email: 'ssylvanus516@gmail.com',
    amount: 0,
    publicKey: 'pk_test_your_paystack_public_key', // Replace with your actual Paystack test public key
    metadata: {
      custom_fields: [
        {
          display_name: "Customer Name",
          variable_name: "customer_name",
          value: '',
        },
      ],
    },
  });

  const initializePayment = usePaystackPayment(config);

  // Load Paystack script manually to catch errors
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    script.onload = () => console.log("Paystack script loaded successfully");
    script.onerror = () => {
      console.error("Failed to load Paystack script");
      toast({
        title: "Payment Error",
        description: "Failed to load Paystack payment system. Please check your internet or disable ad-blockers.",
        variant: "destructive",
      });
    };
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, [toast]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.log("No user found, redirecting to /auth");
          navigate("/auth");
          return;
        }
        setUser(user); // Store user

        // Update config with user email
        setConfig((prev) => ({
          ...prev,
          email: user.email || 'ssylvanus516@gmail.com',
        }));

        // Fetch profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, phone, email")
          .eq("id", user.id)
          .single();
        setProfile(profileData);
        if (profileData) {
          setFirstName(profileData.first_name || "");
          setLastName(profileData.last_name || "");
          setPhone(profileData.phone || "");
          setConfig((prev) => ({
            ...prev,
            metadata: {
              custom_fields: [
                {
                  display_name: "Customer Name",
                  variable_name: "customer_name",
                  value: `${profileData.first_name || ''} ${profileData.last_name || ''}`,
                },
              ],
            },
          }));
        }

        // Fetch addresses
        const { data: addressData } = await supabase
          .from("addresses")
          .select("*")
          .eq("user_id", user.id)
          .order("is_default", { ascending: false });
        setAddresses(addressData || []);

        // Fetch cart
        const { data: cartData } = await supabase
          .from("cart_items")
          .select("*, product:products(*)")
          .eq("user_id", user.id);
        setCartItems(cartData || []);

        // Set default address
        if (addressData && addressData.length > 0) {
          const defaultAddress = addressData.find((addr: Address) => addr.is_default);
          if (defaultAddress) {
            setSelectedAddress(defaultAddress);
            setAddress(defaultAddress.street);
            setCity(defaultAddress.city);
          }
        }

        // Log config for debugging
        const total = cartData?.reduce((sum, item) => sum + (item.product.price * item.quantity), 0) || 0;
        console.log("Config after fetch:", {
          email: user.email || 'ssylvanus516@gmail.com',
          amount: (total + (total > 200 ? 0 : 35)) * 100,
          publicKey: config.publicKey,
          reference: config.reference,
        });
      } catch (error: any) {
        console.error("Fetch error:", error);
        toast({
          title: "Error",
          description: "Failed to load checkout data.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [navigate, toast]);

  const calculateTotal = () => {
    return cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  };

  const placeOrder = async (paymentReference?: string) => {
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
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert([
          {
            user_id: profile.id, // Fixed: Using profile.id
            fulfillment_type: fulfillmentType,
            delivery_time: deliveryTime,
            total: orderTotal,
            status: paymentReference ? 'paid' : 'pending',
            payment_reference: paymentReference,
            first_name: firstName || profile.first_name,
            last_name: lastName || profile.last_name,
            phone: phone || profile.phone,
            address: fulfillmentType === "delivery" ? address : null,
            city: fulfillmentType === "delivery" ? city : null,
          },
        ])
        .select()
        .single();

      if (orderError) throw orderError;

      const items = cartItems.map((item) => ({
        order_id: orderData.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.product.price,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(items);
      if (itemsError) throw itemsError;

      await supabase
        .from("cart_items")
        .delete()
        .eq("user_id", profile.id); // Fixed: Using profile.id

      toast({
        title: "Order Placed Successfully!",
        description:
          fulfillmentType === "delivery"
            ? "Your groceries will be delivered within 60 minutes."
            : "Your order will be ready for pickup in 30 minutes.",
      });
      navigate("/");
    } catch (error: any) {
      console.error("Place order error:", error);
      toast({
        title: "Error",
        description: "Failed to place order.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const onSuccess = async (reference: any) => {
    console.log("Paystack success:", reference);
    try {
      const response = await axios.post(
        'https://seeauhltrvdxhlalgjpn.supabase.co/functions/v1/verify-payment',
        { reference: reference.reference },
        { headers: { 'Content-Type': 'application/json' } }
      );
      console.log("Verification response:", response.data);
      if (response.data.success) {
        await placeOrder(reference.reference);
      } else {
        toast({
          title: "Payment Failed",
          description: response.data.message || "Payment verification failed.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Verification error:", error);
      toast({
        title: "Payment Failed",
        description: error.message || "Payment verification failed.",
        variant: "destructive",
      });
    }
  };

  const onClose = () => {
    console.log("Paystack popup closed");
    toast({
      title: "Payment Cancelled",
      description: "Payment was cancelled.",
    });
  };

  const handlePlaceOrder = () => {
    console.log("handlePlaceOrder called", { fulfillmentType, firstName, lastName, phone, address, city, grandTotal });
    if (fulfillmentType === "delivery") {
      if (!firstName || !lastName || !phone || !address || !city) {
        toast({
          title: "Validation Error",
          description: "All delivery fields are required.",
          variant: "destructive",
        });
        return;
      }
    }

    const total = calculateTotal();
    if (total === 0) {
      toast({
        title: "Error",
        description: "Your cart is empty.",
        variant: "destructive",
      });
      return;
    }

    const updatedConfig = {
      ...config,
      amount: (total + (total > 200 ? 0 : 35)) * 100,
      email: user?.email || profile?.email || 'ssylvanus516@gmail.com',
      metadata: {
        custom_fields: [
          {
            display_name: "Customer Name",
            variable_name: "customer_name",
            value: `${firstName || profile?.first_name || ''} ${lastName || profile?.last_name || ''}`,
          },
        ],
      },
    };
    console.log("Initializing payment with config:", updatedConfig);
    initializePayment({ onSuccess, onClose }); // Fixed: Single argument with callbacks
  };

  const cartItemsCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const total = calculateTotal();
  const deliveryFee = total > 200 ? 0 : 35;
  const grandTotal = total + deliveryFee;

  if (loading) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-background">
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
                  <div key={item.id} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{item.product.name}</p>
                      <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                    </div>
                    <p className="font-semibold">R {(item.product.price * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
                <div className="pt-4 border-t space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>R {total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Fee</span>
                    <span>{deliveryFee === 0 ? "FREE" : `R ${deliveryFee.toFixed(2)}`}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>R {grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Fulfillment Method</CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={fulfillmentType}
                  onValueChange={(value) => setFulfillmentType(value as "delivery" | "pickup")}
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
                          <div className="text-sm text-muted-foreground">Delivered to your doorstep</div>
                        </div>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-4 border-2 rounded-lg transition-colors hover:border-primary cursor-pointer">
                    <RadioGroupItem value="pickup" id="pickup" />
                    <Label htmlFor="pickup" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center">
                          <Store className="h-6 w-6 text-secondary" />
                        </div>
                        <div>
                          <div className="font-semibold">Store Pickup</div>
                          <div className="text-sm text-muted-foreground">Collect from your nearest SPAR</div>
                        </div>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>
            {fulfillmentType === "delivery" ? (
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
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Pickup Location</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Select your nearest SPAR store for pickup.</p>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2 p-3 border rounded-lg">
                      <Store className="h-5 w-5" />
                      <div>
                        <h4 className="font-medium">SPAR Central Mall</h4>
                        <p className="text-sm text-muted-foreground">123 Main Street, City Center</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Delivery Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup value={deliveryTime} onValueChange={setDeliveryTime}>
                  <div className="flex items-center space-x-2 p-4 border-2 rounded-lg cursor-pointer">
                    <RadioGroupItem value="asap" id="asap" />
                    <Label htmlFor="asap" className="cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <Clock className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <div className="font-semibold">ASAP</div>
                          <div className="text-sm text-muted-foreground">Deliver as soon as possible (within 60 min)</div>
                        </div>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-4 border-2 rounded-lg cursor-pointer">
                    <RadioGroupItem value="scheduled" id="scheduled" />
                    <Label htmlFor="scheduled" className="cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center">
                          <Clock className="h-6 w-6 text-secondary" />
                        </div>
                        <div>
                          <div className="font-semibold">Scheduled</div>
                          <div className="text-sm text-muted-foreground">Choose a specific time slot</div>
                        </div>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>
          </div>
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
                    <span>{deliveryFee === 0 ? "FREE" : `R ${deliveryFee.toFixed(2)}`}</span>
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
                <CardTitle>Payment Method</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button
                    className="w-full"
                    onClick={handlePlaceOrder}
                    disabled={loading || grandTotal === 0}
                  >
                    Pay with Paystack - R {grandTotal.toFixed(2)}
                  </Button>
                  <p className="text-sm text-muted-foreground text-center">Secure payment</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Checkout;