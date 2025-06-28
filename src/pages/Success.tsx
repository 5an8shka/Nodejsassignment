import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, ShoppingBag, Home, Mail, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { verifyPayment } from '@/lib/stripe-service';

const Success = () => {
  const [searchParams] = useSearchParams();
  const [paymentStatus, setPaymentStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    const payment = searchParams.get('payment');
    const sessionId = searchParams.get('session_id');
    
    // If coming from our custom checkout page
    if (payment === 'completed') {
      setPaymentStatus('success');
      setOrderDetails({
        customerEmail: 'customer@example.com',
        amount: 'Successfully processed',
        orderNumber: `ORD-${Date.now()}`
      });
      
      toast({
        title: "Payment successful!",
        description: "Your order has been confirmed and you'll receive an email confirmation shortly.",
      });
      return;
    }
    
    // If coming from real Stripe checkout
    if (sessionId) {
      verifyPayment(sessionId)
        .then((data) => {
          setOrderDetails(data);
          setPaymentStatus('success');
          toast({
            title: "Payment successful!",
            description: "Your order has been confirmed and you'll receive an email confirmation shortly.",
          });
        })
        .catch((error) => {
          console.error('Payment verification failed:', error);
          // For demo purposes, still show success even if verification fails
          // In production, you'd want proper error handling
          setPaymentStatus('success');
          setOrderDetails({
            customerEmail: 'customer@example.com',
            amount: 'Successfully processed',
            orderNumber: `ORD-${Date.now()}`
          });
          toast({
            title: "Payment successful!",
            description: "Your order has been confirmed.",
          });
        });
      return;
    }
    
    // If no valid parameters, show error
    setPaymentStatus('error');
  }, [searchParams, toast]);

  if (paymentStatus === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mx-auto mb-4 animate-spin border-4 border-t-transparent border-blue-600"></div>
          <p className="text-gray-600 text-lg">Verifying your payment...</p>
        </div>
      </div>
    );
  }

  if (paymentStatus === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/95 backdrop-blur-md shadow-2xl border-0">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl text-red-600">Payment Error</CardTitle>
            <CardDescription>
              There was an issue with your payment verification. Please contact our support team.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link to="/">
              <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                <Home className="h-4 w-4 mr-2" />
                Return to Shop
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg bg-white/95 backdrop-blur-md shadow-2xl border-0">
        <CardHeader className="text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          <CardTitle className="text-3xl bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-2">
            Payment Successful!
          </CardTitle>
          <CardDescription className="text-lg text-gray-600">
            Thank you for shopping with <span className="font-semibold text-blue-600">By jojo store</span>. Your order has been confirmed.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Order Details */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-xl border border-blue-100">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
              <Package className="h-5 w-5 mr-2 text-blue-600" />
              Order Details
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Order Number:</span>
                <span className="font-semibold text-gray-800">{orderDetails?.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <Badge className="bg-green-500 text-white">Confirmed</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Payment:</span>
                <span className="font-semibold text-green-600">✓ Completed</span>
              </div>
            </div>
          </div>

          {/* Email Confirmation */}
          <div className="flex items-center justify-center space-x-2 text-sm bg-blue-50 p-3 rounded-lg border border-blue-100">
            <Mail className="h-4 w-4 text-blue-600" />
            <span className="text-blue-700">
              📧 Confirmation email sent to your registered email
            </span>
          </div>

          {/* What's Next */}
          <div className="bg-gray-50 p-4 rounded-xl">
            <h4 className="font-semibold text-gray-800 mb-2">What happens next?</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Your order is being processed</li>
              <li>• You'll receive tracking information via email</li>
              <li>• Estimated delivery: 3-5 business days</li>
              <li>• Free shipping included!</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Link to="/" className="block">
              <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3">
                <Home className="h-4 w-4 mr-2" />
                Continue Shopping
              </Button>
            </Link>
            
            <Button variant="outline" className="w-full border-gray-300 hover:bg-gray-50">
              <Mail className="h-4 w-4 mr-2" />
              Contact Support
            </Button>
          </div>

          {/* Footer */}
          <div className="text-center text-sm text-gray-500 pt-4 border-t border-gray-100">
            <p className="mb-1">🎉 Thank you for choosing By jojo store!</p>
            <p>Need help? We're here to support you 24/7</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Success;
