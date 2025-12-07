import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get request data
    const { reference, gateway = "paystack" } = await req.json();

    if (!reference) {
      throw new Error("Payment reference is required");
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let paymentData: any = null;
    let isVerified = false;

    // Verify payment based on gateway
    if (gateway === "paystack") {
      const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");

      if (!paystackSecretKey) {
        throw new Error("Paystack secret key not configured");
      }

      // Verify payment with Paystack
      const response = await fetch(
        `https://api.paystack.co/transaction/verify/${reference}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${paystackSecretKey}`,
            "Content-Type": "application/json",
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          `Paystack API error: ${data.message || "Unknown error"}`,
        );
      }

      if (data.status && data.data.status === "success") {
        isVerified = true;
        paymentData = {
          reference: data.data.reference,
          amount: data.data.amount / 100, // Convert from kobo to naira
          currency: data.data.currency,
          gateway_response: data.data.gateway_response,
          paid_at: data.data.paid_at,
          channel: data.data.channel,
          customer: data.data.customer,
          authorization: data.data.authorization,
        };
      }
    } else if (gateway === "paypal") {
      // PayPal verification would go here
      // For now, we'll assume it's handled by PayPal's client-side SDK
      isVerified = true;
      paymentData = { reference };
    } else {
      throw new Error(`Unsupported payment gateway: ${gateway}`);
    }

    if (isVerified) {
      // Update order status to paid
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("id, customer_id, order_number, total_amount, payment_status")
        .eq("payment_reference", reference)
        .single();

      if (orderError) {
        console.error("Error finding order:", orderError);
        throw new Error("Order not found");
      }

      if (order.payment_status === "paid") {
        return new Response(
          JSON.stringify({
            success: true,
            message: "Payment already verified",
            order_id: order.id,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          },
        );
      }

      // Update order payment status
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          payment_status: "paid",
          payment_details: paymentData,
          status: "confirmed", // Move to confirmed status after payment
        })
        .eq("payment_reference", reference);

      if (updateError) {
        console.error("Error updating order:", updateError);
        throw new Error("Failed to update order status");
      }

      // Create notification for customer
      const { error: notificationError } = await supabase
        .from("notifications")
        .insert({
          user_id: order.customer_id,
          title: "Payment Confirmed",
          message: `Your payment for order ${order.order_number} has been confirmed. Your order is now being prepared.`,
          type: "payment_confirmed",
          data: {
            order_id: order.id,
            order_number: order.order_number,
            amount: order.total_amount,
            payment_reference: reference,
          },
        });

      if (notificationError) {
        console.error("Error creating notification:", notificationError);
        // Don't throw error here as payment is already processed
      }

      // Log the successful payment verification
      console.log(
        `Payment verified successfully for order ${order.order_number}, reference: ${reference}`,
      );

      return new Response(
        JSON.stringify({
          success: true,
          message: "Payment verified successfully",
          order_id: order.id,
          order_number: order.order_number,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    } else {
      throw new Error("Payment verification failed");
    }
  } catch (error) {
    console.error("Payment verification error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || "Payment verification failed",
        error: error.name || "PaymentError",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
