import { useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { createStripeCheckout } from '@/lib/stripe-service';

interface CartItem {
  id: string;
  title: string;
  price: number;
  quantity: number;
  image_url: string;
  description?: string;
}

interface Props {
  cart: CartItem[];
  onRemove: (id: string) => void;
  onUpdateQuantity: (id: string, qty: number) => void;
}

const StripeCheckoutPage: React.FC<Props> = ({ cart, onRemove, onUpdateQuantity }) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const getTotalPrice = () => cart.reduce((total, item) => total + item.price * item.quantity, 0);
  const getTotalItems = () => cart.reduce((total, item) => total + item.quantity, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast({ title: 'Cart is empty', description: 'Add items before checkout.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      await createStripeCheckout(cart);
    } catch (error: any) {
      toast({
        title: 'Stripe Checkout Error',
        description: error.message || 'Unable to connect to Stripe. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-white/95 backdrop-blur-md shadow-2xl border-0">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingCart className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl text-blue-700">Secure Stripe Checkout</CardTitle>
        </CardHeader>
        <CardContent>
          {cart.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Your cart is empty.</div>
          ) : (
            <div>
              <div className="divide-y divide-gray-100 mb-6">
                {cart.map(item => (
                  <div key={item.id} className="flex items-center py-4">
                    <img src={item.image_url} alt={item.title} className="w-16 h-16 object-cover rounded-lg mr-4" />
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{item.title}</div>
                      <div className="text-gray-500 text-sm">{item.description}</div>
                      <div className="text-blue-700 font-bold mt-1">${item.price.toFixed(2)}</div>
                    </div>
                    <div className="flex flex-col items-center ml-4">
                      <Badge className="mb-2">x{item.quantity}</Badge>
                      <Button size="sm" variant="outline" onClick={() => onUpdateQuantity(item.id, item.quantity - 1)} disabled={item.quantity <= 1}>-</Button>
                      <Button size="sm" variant="outline" onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}>+</Button>
                      <Button size="sm" variant="ghost" className="mt-2 text-red-500" onClick={() => onRemove(item.id)}>Remove</Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center mb-6">
                <div className="text-lg font-semibold text-gray-700">Total:</div>
                <div className="text-2xl font-bold text-blue-700">${getTotalPrice().toFixed(2)}</div>
              </div>
              <Button
                onClick={handleCheckout}
                size="lg"
                disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 text-white py-4 text-lg font-semibold"
              >
                {loading ? (
                  <span className="animate-spin mr-2 w-5 h-5 border-2 border-white border-t-transparent rounded-full inline-block" />
                ) : (
                  <ShoppingCart className="h-5 w-5 mr-2" />
                )}
                {loading ? 'Processing...' : 'Pay with Stripe'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StripeCheckoutPage;
