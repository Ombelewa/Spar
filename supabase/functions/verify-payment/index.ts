import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { reference } = await req.json()

    const supabase = createClient(
      Deno.env.get('https://seeauhltrvdxhlalgjpn.supabase.co') ?? '',
      Deno.env.get('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlZWF1aGx0cnZkeGhsYWxnanBuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTE0MDkwNSwiZXhwIjoyMDc2NzE2OTA1fQ.sKSR1hJGHwEcbMSWLl-1gjZks3poh0ig9XqACj58pFs') ?? '',
    )

    const secretKey = Deno.env.get('sk_test_df4da255978f4c9ef1406ad49a9effc34c820a58') ?? ''
    
    if (!secretKey) {
      throw new Error('PAYSTACK_SECRET_KEY not set')
    }

    // Verify payment with Paystack
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json'
      },
    })

    const data = await response.json()

    if (data.status && data.data.status === 'success') {
      // Update order status to paid
      const { error } = await supabase
        .from('orders')
        .update({ status: 'paid' })
        .eq('payment_reference', reference)

      if (error) throw error

      return new Response(
        JSON.stringify({ success: true, message: 'Payment verified successfully' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        },
      )
    } else {
      throw new Error('Payment verification failed: ' + (data.message || 'Unknown error'))
    }
  } catch (error) {
    console.error('Verification error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: error.message || 'Internal server error' 
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      },
    )
  }
})