import { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, Star, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useProducts } from '@/hooks/useProducts';
import { Link, useNavigate } from 'react-router-dom';
import { addProductsWithImages, removePortableCharger } from '@/lib/add-products';
import { createSmartCheckout, createRobustCheckout, createBulletproofCheckout, createStripeCheckout } from '@/lib/stripe-service';
import { ThemeToggle } from '@/components/theme-toggle';

interface Product {
  id: string;
  title: string;
  price: number;
  image_url: string;
  description: string;
}

interface CartItem extends Product {
  quantity: number;
}

const Index = () => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { toast } = useToast();
  const { user, signOut, loading: authLoading } = useAuth();
  const { products, loading: productsLoading } = useProducts();
  const navigate = useNavigate();

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = '/auth';
    }
  }, [user, authLoading]);

  const addToCart = (product: Product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });

    toast({
      title: "Added to cart",
      description: `${product.title} has been added to your cart.`,
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
    toast({
      title: "Removed from cart",
      description: "Item has been removed from your cart.",
    });
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity === 0) {
      removeFromCart(productId);
      return;
    }

    setCart(prevCart =>
      prevCart.map(item =>
        item.id === productId
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast({
        title: "Cart is empty",
        description: "Please add some items to your cart before checkout.",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('🎯 Starting Stripe-only checkout...');
      
      // Use direct Stripe integration (no custom checkout page)
      await createStripeCheckout(cart);
      
    } catch (error: any) {
      console.error('❌ Stripe checkout error:', error);
      
      toast({
        title: "Stripe Checkout Error",
        description: error.message || "Unable to connect to Stripe. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Signed out",
      description: "You have been successfully signed out.",
    });
  };

  // Add this function to remove the portable charger
  const handleRemovePortableCharger = async () => {
    try {
      const result = await removePortableCharger();
      if (result.success) {
        toast({
          title: "Product removed!",
          description: "Portable Phone Charger has been removed from the store.",
        });
        // Refresh the page to see updated products
        window.location.reload();
      }
    } catch (error) {
      toast({
        title: "Remove failed",
        description: "Failed to remove product. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (authLoading || productsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg mx-auto mb-4 animate-spin border-4 border-t-transparent border-blue-600"></div>
          <p className="text-gray-600 text-lg">Loading your shopping experience...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-md shadow-xl border-b border-white/20 sticky top-0 z-50 dark:bg-gray-900/90 dark:border-gray-700/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <ShoppingCart className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Jojo Store
                </h1>
                <p className="text-xs text-gray-500 -mt-1 dark:text-gray-400">Premium Tech Store</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {user && (
                <div className="flex items-center space-x-2 text-sm text-gray-600 bg-white/60 px-3 py-2 rounded-full dark:text-gray-300 dark:bg-gray-800/60">
                  <User className="h-4 w-4" />
                  <span className="hidden md:inline">{user.email}</span>
                </div>
              )}
              
              <ThemeToggle />
              
              <Button
                variant="outline"
                size="lg"
                onClick={() => setIsCartOpen(!isCartOpen)}
                className="relative bg-white/80 hover:bg-white/90 border-2 border-blue-200 hover:border-blue-300 transition-all duration-200 shadow-lg hover:shadow-xl dark:bg-gray-800/80 dark:hover:bg-gray-800/90 dark:border-blue-600 dark:hover:border-blue-500"
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                Cart
                {getTotalItems() > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center bg-gradient-to-r from-red-500 to-pink-500 animate-bounce shadow-lg">
                    {getTotalItems()}
                  </Badge>
                )}
              </Button>
              
              <Button
                variant="ghost"
                onClick={handleSignOut}
                className="text-gray-600 hover:text-gray-800 hover:bg-white/50 dark:text-gray-300 dark:hover:text-gray-100 dark:hover:bg-gray-800/50"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Products Grid */}
          <div className="flex-1">
            <div className="text-center mb-16">
              <h2 className="text-5xl font-extrabold text-gray-900 mb-6 dark:text-gray-100">
                Featured <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Products</span>
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed dark:text-gray-300">
                Discover our carefully curated selection of premium tech products designed to enhance your digital lifestyle
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {products.map((product) => (
                <Card key={product.id} className="group hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-3 bg-white/90 backdrop-blur-sm border-0 shadow-xl overflow-hidden hover:scale-[1.02] dark:bg-gray-800/90 dark:hover:shadow-purple-500/10">
                  <CardHeader className="p-0 relative overflow-hidden">
                    <div className="aspect-video w-full overflow-hidden">
                      <img
                        src={product.image_url}
                        alt={product.title}
                        className="w-full h-full object-cover group-hover:scale-125 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500" />
                    </div>
                    <div className="absolute top-4 right-4 flex space-x-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400 drop-shadow-sm" />
                      ))}
                    </div>
                    <div className="absolute top-4 left-4">
                      <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 shadow-lg">
                        In Stock
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8">
                    <CardTitle className="text-xl mb-4 group-hover:text-blue-600 transition-colors duration-300 line-clamp-2 dark:text-gray-100 dark:group-hover:text-blue-400">
                      {product.title}
                    </CardTitle>
                    <CardDescription className="text-gray-600 mb-6 leading-relaxed line-clamp-3 dark:text-gray-300">
                      {product.description}
                    </CardDescription>
                    <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                      ${product.price.toFixed(2)}
                    </div>
                    <p className="text-sm text-green-600 font-medium">✓ Free shipping • 30-day returns</p>
                  </CardContent>
                  <CardFooter className="p-8 pt-0">
                    <Button 
                      onClick={() => addToCart(product)}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 text-lg py-6"
                      size="lg"
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      Add to Cart
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>

          {/* Cart Sidebar - Enhanced Design */}
          {isCartOpen && (
            <div className="lg:w-96">
              <Card className="sticky top-28 bg-white/95 backdrop-blur-md shadow-2xl border-0 overflow-hidden rounded-3xl dark:bg-gray-800/95 dark:shadow-purple-500/5">
                <CardHeader className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white p-6">
                  <CardTitle className="flex items-center justify-between text-white text-xl">
                    <span className="flex items-center">
                      <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center mr-3">
                        <ShoppingCart className="h-5 w-5" />
                      </div>
                      Shopping Cart
                    </span>
                    <Badge variant="secondary" className="bg-white/20 text-white border-0 text-sm px-3 py-1 rounded-full font-semibold">
                      {getTotalItems()} {getTotalItems() === 1 ? 'item' : 'items'}
                    </Badge>
                  </CardTitle>
                </CardHeader>

                <CardContent className="max-h-96 overflow-y-auto p-0">
                  {cart.length === 0 ? (
                    <div className="text-center py-16 px-6">
                      <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <ShoppingCart className="h-12 w-12 text-gray-400 dark:text-gray-300" />
                      </div>
                      <h3 className="text-gray-700 dark:text-gray-200 text-xl font-semibold mb-2">Your cart is empty</h3>
                      <p className="text-gray-500 dark:text-gray-400 text-sm">Add some amazing products to get started!</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {cart.map((item) => (
                        <div key={item.id} className="p-4 hover:bg-gray-50 transition-colors duration-200">
                          <div className="flex items-start space-x-4">
                            <div className="relative">
                              <img
                                src={item.image_url}
                                alt={item.title}
                                className="w-16 h-16 object-cover rounded-xl shadow-sm"
                              />
                              <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                {item.quantity}
                              </div>
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-2 leading-tight">
                                {item.title}
                              </h4>
                              <p className="text-lg font-bold text-indigo-600 mb-2">
                                ${item.price.toFixed(2)}
                              </p>
                              
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                  className="h-8 w-8 p-0 rounded-full border-gray-300 hover:border-red-300 hover:bg-red-50"
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                
                                <span className="w-8 text-center font-semibold text-sm bg-gray-100 rounded px-2 py-1">
                                  {item.quantity}
                                </span>
                                
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                  className="h-8 w-8 p-0 rounded-full border-gray-300 hover:border-green-300 hover:bg-green-50"
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                                
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeFromCart(item.id)}
                                  className="h-8 w-8 p-0 ml-2 rounded-full hover:bg-red-100 text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>

                {cart.length > 0 && (
                  <CardFooter className="p-6 bg-gradient-to-r from-gray-50 to-blue-50 border-t">
                    <div className="w-full space-y-4">
                      <div className="flex justify-between items-center py-3 border-t border-gray-200">
                        <span className="text-lg font-semibold text-gray-700">Total:</span>
                        <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                          ${getTotalPrice().toFixed(2)}
                        </span>
                      </div>
                      
                      <Button 
                        onClick={handleCheckout}
                        size="lg" 
                        className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] text-base py-4 rounded-xl font-semibold"
                      >
                        <ShoppingCart className="h-5 w-5 mr-2" />
                        Secure Checkout with Stripe
                      </Button>
                      
                      <div className="flex items-center justify-center text-xs text-gray-500 mt-3">
                        <span className="mr-1">🔒</span>
                        Your payment information is secure and encrypted
                      </div>
                    </div>
                  </CardFooter>
                )}
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
