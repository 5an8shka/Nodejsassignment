import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON in request body" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    const { sessionId } = body;
    if (!sessionId) {
      return new Response(JSON.stringify({ error: "Session ID is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'payment_intent'],
    });
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );
    if (session.payment_status === 'paid') {
      const { data: updatedOrder, error: updateError } = await supabaseService
        .from('orders')
        .update({ 
          status: 'completed',
          stripe_payment_intent_id: session.payment_intent?.id,
          customer_email: session.customer_details?.email
        })
        .eq('stripe_session_id', sessionId)
        .select()
        .single();
      if (updateError) {
        console.error('Error updating order:', updateError);
      }
      try {
        await supabaseService.functions.invoke('send-confirmation-email', {
          body: JSON.stringify({
            email: session.customer_details?.email,
            orderId: updatedOrder?.id,
            sessionId: sessionId
          }),
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (emailError) {
        console.error('Error sending confirmation email:', emailError);
      }
    }
    return new Response(JSON.stringify({ 
      status: session.payment_status,
      customerEmail: session.customer_details?.email,
      amount: session.amount_total ? session.amount_total / 100 : 0
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || 'Payment verification failed' }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
