import stripePromise from './stripe';
import { supabase } from '@/integrations/supabase/client';

export interface CartItem {
  id: string;
  title: string;
  price: number;
  quantity: number;
  image_url: string;
  description?: string;
}

// DIRECT STRIPE INTEGRATION - No Edge Functions Required
export const createDirectStripeCheckout = async (items: CartItem[]) => {
  try {
    console.log('🚀 Starting direct Stripe checkout...');
    
    // Validate inputs
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('Cart is empty. Please add items before checkout.');
    }

    // Check user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('You must be logged in to checkout. Please sign in first.');
    }

    console.log('✅ User authenticated:', user.email);

    // Get Stripe instance
    const stripe = await stripePromise;
    if (!stripe) {
      throw new Error('Stripe failed to initialize. Please check your configuration.');
    }

    console.log('✅ Stripe loaded successfully');

    // Create line items for Stripe
    const lineItems = items.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.title,
          description: item.description || `${item.title} - Premium quality tech product`,
          images: [item.image_url],
        },
        unit_amount: Math.round(item.price * 100), // Convert to cents
      },
      quantity: item.quantity,
    }));

    console.log('📦 Line items prepared:', lineItems);

    // Store order in database before checkout
    const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    try {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          total_amount: totalAmount,
          status: 'pending',
          customer_email: user.email
        })
        .select()
        .single();

      if (orderError) {
        console.error('⚠️ Order storage failed:', orderError);
        // Continue with checkout even if order storage fails
      } else {
        console.log('✅ Order stored:', orderData);
      }
    } catch (dbError) {
      console.error('⚠️ Database error:', dbError);
      // Continue with checkout
    }

    // Use Stripe's client-side checkout session creation
    // This requires a backend endpoint, so we'll use a different approach
    
    // Method 1: Try to call your backend to create checkout session
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          lineItems,
          customerEmail: user.email,
          successUrl: `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${window.location.origin}/`
        })
      });

      if (response.ok) {
        const { sessionId } = await response.json();
        console.log('✅ Checkout session created via API');
        
        const result = await stripe.redirectToCheckout({ sessionId });
        if (result.error) {
          throw new Error(result.error.message);
        }
        return;
      }
    } catch (apiError) {
      console.log('⚠️ API endpoint not available, trying Supabase edge function...');
    }

    // Method 2: Try Supabase Edge Function (FIXED)
    try {
      console.log('🔄 Calling Supabase edge function...');
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: JSON.stringify({
          items: lineItems,
          success_url: `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${window.location.origin}/`,
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      if (error) {
        console.error('❌ Edge function error:', error);
        throw new Error(`Edge function failed: ${error.message}`);
      }

      if (data && data.url) {
        console.log('✅ Edge function success! Redirecting to Stripe...');
        console.log('🔗 Stripe checkout URL:', data.url);
        
        // Direct redirect to Stripe's hosted checkout page
        window.location.href = data.url;
        return;
      } else if (data && data.sessionId) {
        console.log('✅ Edge function returned sessionId, using redirectToCheckout...');
        const result = await stripe.redirectToCheckout({ sessionId: data.sessionId });
        if (result.error) {
          throw new Error(result.error.message);
        }
        return;
      } else {
        console.error('❌ Edge function returned invalid response:', data);
        throw new Error('Invalid response from edge function');
      }
    } catch (edgeError) {
      console.error('❌ Edge function failed:', edgeError);
      // Continue to fallback
    }

    // Method 3: Show error instead of fake checkout
    console.error('💥 All Stripe methods failed');
    throw new Error('Unable to create Stripe checkout session. Please try again or contact support.');
  } catch (error: any) {
    console.error('💥 Direct Stripe checkout failed:', error);
    throw new Error(error.message || 'Stripe checkout failed. Please try again.');
  }
};

// Create a backend endpoint simulation for development
export const createBackendCheckoutSession = async (items: CartItem[]) => {
  try {
    console.log('🌐 Creating backend checkout session...');
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentication required');

    // This simulates what a backend endpoint would do
    const sessionData = {
      id: `cs_test_${Date.now()}`,
      url: `https://checkout.stripe.com/pay/cs_test_${Date.now()}#fidkdWxOYHwnPyd1blpxYHZxWjA0S2J8YU1HUkFwV3FsZ2xcYW1sVUhmXUpTcVBHZGNWU01xN1JmX2l1Ymg8QHVrQnJHNUE3VkYzV3w%3D`,
      customer_email: user.email,
      amount_total: items.reduce((sum, item) => sum + (item.price * item.quantity), 0) * 100
    };

    console.log('✅ Backend session simulated:', sessionData);
    
    // Redirect to Stripe (simulated)
    window.location.href = sessionData.url;
    
  } catch (error) {
    console.error('❌ Backend checkout failed:', error);
    throw error;
  }
};

// Production-ready Stripe checkout using Stripe Elements (embedded)
export const createStripeElementsCheckout = async (items: CartItem[]) => {
  try {
    console.log('⚡ Creating Stripe Elements checkout...');
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentication required');

    const stripe = await stripePromise;
    if (!stripe) throw new Error('Stripe not loaded');

    // Store cart for the checkout page
    localStorage.setItem('stripe_checkout_items', JSON.stringify(items));
    localStorage.setItem('stripe_checkout_user', JSON.stringify(user));
    
    // Redirect to a dedicated Stripe Elements checkout page
    window.location.href = '/stripe-checkout';
    
  } catch (error) {
    console.error('❌ Stripe Elements checkout failed:', error);
    throw error;
  }
};

// SIMPLIFIED STRIPE CHECKOUT - Debug version to fix 404 errors
export const createDebugStripeCheckout = async (items: CartItem[]) => {
  try {
    console.log('🔧 Debug: Starting simplified Stripe checkout...');
    
    // Step 1: Validate basics
    if (!items || items.length === 0) {
      throw new Error('Cart is empty');
    }

    // Step 2: Check authentication
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.access_token) {
      throw new Error('Not authenticated - please sign in again');
    }

    console.log('✅ Debug: User session valid');

    // Step 3: Test edge function with minimal data
    console.log('🔧 Debug: Testing edge function...');
    
    const testPayload = {
      items: items.map(item => ({
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.title,
          },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity,
      })),
      success_url: `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${window.location.origin}/`,
    };

    console.log('📦 Debug: Payload prepared:', testPayload);

    // Step 4: Call edge function with proper headers
    const { data, error } = await supabase.functions.invoke('create-checkout', {
      body: JSON.stringify(testPayload),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      }
    });

    console.log('📡 Debug: Edge function response:', { data, error });

    // Step 5: Handle response
    if (error) {
      console.error('❌ Debug: Edge function error:', error);
      throw new Error(`Edge function failed: ${error.message || 'Unknown error'}`);
    }

    if (!data) {
      console.error('❌ Debug: No data returned');
      throw new Error('No response from checkout service');
    }

    if (data.url) {
      console.log('✅ Debug: Got Stripe URL, redirecting...');
      console.log('🔗 Debug: URL:', data.url);
      window.location.href = data.url;
      return;
    }

    if (data.error) {
      console.error('❌ Debug: Server error:', data.error);
      throw new Error(`Server error: ${data.error}`);
    }

    console.error('❌ Debug: Invalid response format:', data);
    throw new Error('Invalid response from checkout service');

  } catch (error: any) {
    console.error('💥 Debug checkout failed:', error);
    throw new Error(error.message || 'Checkout failed');
  }
};

// WORKING STRIPE CHECKOUT - Let's fix this once and for all
export const createWorkingStripeCheckout = async (items: CartItem[]) => {
  try {
    console.log('🎯 FINAL FIX: Starting working Stripe checkout...');
    console.log('📦 Items to checkout:', items);
    
    // Step 1: Basic validation
    if (!items || items.length === 0) {
      throw new Error('Cart is empty');
    }

    // Step 2: Get user session with detailed logging
    console.log('🔐 Getting user session...');
    const { data: { session, user }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Session error:', sessionError);
      throw new Error('Authentication error - please sign in again');
    }
    
    if (!session?.access_token || !user) {
      console.error('❌ No valid session or user');
      throw new Error('Please sign in to continue checkout');
    }

    console.log('✅ User authenticated:', user.email);
    console.log('✅ Access token available:', !!session.access_token);

    // Step 3: Prepare payload with exact format edge function expects
    const payload = {
      items: items.map(item => ({
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.title,
            description: item.description || `${item.title} - Premium tech product`,
            images: [item.image_url],
          },
          unit_amount: Math.round(item.price * 100), // Convert to cents
        },
        quantity: item.quantity,
      })),
      success_url: `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${window.location.origin}/`,
    };

    // Log payload for debugging
    console.log('🔎 Payload to edge function:', JSON.stringify(payload, null, 2));

    // Step 4: Call edge function with explicit headers
    console.log('🚀 Calling create-checkout edge function...');
    
    const { data, error } = await supabase.functions.invoke('create-checkout', {
      body: JSON.stringify(payload), // FIX: send as JSON string
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      }
    });

    console.log('📨 Raw response data:', data);
    console.log('❗ Raw response error:', error);

    // Step 5: Detailed error handling
    if (error) {
      console.error('❌ Edge function error details:');
      console.error('- Message:', error.message);
      console.error('- Code:', error.code);
      console.error('- Details:', error.details);
      console.error('- Hint:', error.hint);
      
      // Specific error handling
      if (error.message?.includes('JWT')) {
        throw new Error('Authentication expired. Please refresh the page and try again.');
      } else if (error.message?.includes('not found')) {
        throw new Error('Checkout service not available. Please try again later.');
      } else {
        throw new Error(`Checkout failed: ${error.message}`);
      }
    }

    // Step 6: Validate response
    if (!data) {
      console.error('❌ No data returned from edge function');
      throw new Error('No response from checkout service');
    }

    console.log('📦 Response data type:', typeof data);
    console.log('📦 Response data keys:', Object.keys(data));

    // Step 7: Handle different response formats
    if (data.error) {
      console.error('❌ Server returned error:', data.error);
      throw new Error(`Server error: ${data.error}`);
    }

    if (data.url) {
      console.log('✅ SUCCESS! Got Stripe checkout URL');
      console.log('🔗 Redirecting to:', data.url);
      
      // Validate URL format
      if (!data.url.includes('checkout.stripe.com')) {
        console.warn('⚠️ Warning: URL doesn\'t look like Stripe checkout:', data.url);
      }
      
      // Redirect to Stripe
      window.location.href = data.url;
      return;
    }

    if (data.sessionId) {
      console.log('✅ Got session ID, using Stripe redirect...');
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error('Stripe not loaded');
      }
      
      const result = await stripe.redirectToCheckout({ sessionId: data.sessionId });
      if (result.error) {
        throw new Error(result.error.message);
      }
      return;
    }

    // If we get here, the response format is unexpected
    console.error('❌ Unexpected response format:', data);
    throw new Error('Invalid response format from checkout service');

  } catch (error: any) {
    console.error('💥 CHECKOUT FAILED:', error);
    console.error('Stack trace:', error.stack);
    throw new Error(error.message || 'Checkout failed unexpectedly');
  }
};

// FIXED STRIPE CHECKOUT - With proper authentication handling
export const createAuthenticatedStripeCheckout = async (items: CartItem[]) => {
  try {
    console.log('🔐 Starting authenticated Stripe checkout...');
    console.log('📦 Items to checkout:', items);
    
    if (!items || items.length === 0) throw new Error('Cart is empty');
    
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) throw new Error('Authentication failed. Please sign in again.');
    
    console.log('✅ User authenticated:', session.user?.email);
    
    const payload = {
      items: items.map(item => ({
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.title,
            description: item.description || `${item.title} - Premium tech product`,
            images: [item.image_url],
          },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity,
      })),
      success_url: `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${window.location.origin}/`,
    };

    console.log('🔎 Payload to edge function:', JSON.stringify(payload, null, 2));

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(payload),
    });

    console.log('📡 Response status:', response.status);
    console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        console.error('❌ Error response data:', errorData);
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch (parseError) {
        console.error('❌ Could not parse error response:', parseError);
        const errorText = await response.text();
        console.error('❌ Raw error response:', errorText);
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('✅ Success response data:', data);

    if (data.success === false || data.error) {
      throw new Error(data.error || 'Checkout service returned an error.');
    }

    if (data.url) {
      console.log('🔗 Redirecting to Stripe checkout:', data.url);
      window.location.href = data.url;
      return;
    }

    throw new Error('Invalid response from checkout service - no URL provided.');

  } catch (error: any) {
    console.error('💥 AUTHENTICATED CHECKOUT FAILED:', error);
    throw new Error(error.message || 'Checkout failed unexpectedly.');
  }
};

// Update main function to use the authenticated version
export const createStripeCheckout = async (items: CartItem[]) => {
  return await createAuthenticatedStripeCheckout(items);
};

// Legacy function names for compatibility
export const createCheckoutSession = createStripeCheckout;
export const createBulletproofCheckout = createStripeCheckout;
export const createRobustCheckout = createStripeCheckout;

// Payment verification function
export const verifyPayment = async (sessionId: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('verify-payment', {
      body: JSON.stringify({ sessionId }),
      headers: { 'Content-Type': 'application/json' }
    });

    if (error) {
      throw error;
    }
    return data;
  } catch (error) {
    console.error('❌ Payment verification failed:', error);
    throw error;
  }
};