
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface CartItem {
  id: string;
  title: string;
  price: number;
  quantity: number;
  image_url: string;
  description: string;
}

export const useOrders = () => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const createOrder = async (cartItems: CartItem[]) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to place an order",
        variant: "destructive",
      });
      return { success: false };
    }

    setLoading(true);

    try {
      // Call Stripe checkout function
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { cartItems }
      });

      if (error) throw error;

      // Redirect to Stripe checkout
      if (data?.url) {
        window.location.href = data.url;
        return { success: true };
      }

      throw new Error('No checkout URL received');
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast({
        title: "Checkout failed",
        description: error.message || "Failed to create checkout session",
        variant: "destructive",
      });
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  return { createOrder, loading };
};
