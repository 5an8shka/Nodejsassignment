import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 200 });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed", success: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 405,
    });
  }
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!supabaseUrl || !supabaseAnonKey || !stripeSecretKey) {
      return new Response(JSON.stringify({ error: "Server config error", success: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing or invalid authorization header", success: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData.user?.email) {
      return new Response(JSON.stringify({ error: "Authentication failed", success: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON in request body", success: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    const { items, success_url, cancel_url } = body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: "No valid items provided", success: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    for (const item of items) {
      if (!item.price_data || !item.quantity || !item.price_data.unit_amount) {
        return new Response(JSON.stringify({ error: "Invalid item format", success: false }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
    }
    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });
    let customerId;
    try {
      const customers = await stripe.customers.list({ email: userData.user.email, limit: 1 });
      if (customers.data.length > 0) customerId = customers.data[0].id;
    } catch {}
    let checkoutSession;
    try {
      checkoutSession = await stripe.checkout.sessions.create({
        customer: customerId,
        customer_email: customerId ? undefined : userData.user.email,
        line_items: items,
        mode: "payment",
        success_url: success_url || `${req.headers.get("origin")}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancel_url || `${req.headers.get("origin")}/`,
        metadata: { user_id: userData.user.id, user_email: userData.user.email },
        payment_intent_data: { metadata: { user_id: userData.user.id } },
        allow_promotion_codes: true,
        billing_address_collection: "required",
        shipping_address_collection: { allowed_countries: ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'IN'] }
      });
    } catch (stripeError) {
      return new Response(JSON.stringify({ error: stripeError.message || "Stripe error", success: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }
    try {
      const totalAmount = items.reduce((total, item) => total + (item.price_data.unit_amount * item.quantity), 0) / 100;
      await supabase.from('orders').insert({
        user_id: userData.user.id,
        stripe_session_id: checkoutSession.id,
        total_amount: totalAmount,
        status: 'pending',
        stripe_payment_intent_id: null,
        customer_email: userData.user.email
      });
    } catch {}
    return new Response(JSON.stringify({ sessionId: checkoutSession.id, url: checkoutSession.url, success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || 'Unexpected error', success: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
