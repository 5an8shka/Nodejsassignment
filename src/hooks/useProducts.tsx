import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Product {
  id: string;
  title: string;
  price: number;
  image_url: string;
  description: string;
  stock_quantity: number;
}

export const useProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fixBrokenImages = useCallback(async (productList: Product[]) => {
    const brokenImageFixes = [
      {
        title: 'Portable Phone Charger',
        correctImageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=300&fit=crop',
        correctPrice: 29.99
      }
    ];

    for (const fix of brokenImageFixes) {
      const product = productList.find(p => p.title === fix.title);
      if (product && (product.image_url.includes('photo-1609592144780') || product.price !== fix.correctPrice)) {
        try {
          await supabase
            .from('products')
            .update({ 
              image_url: fix.correctImageUrl,
              price: fix.correctPrice
            })
            .eq('title', fix.title);
          
          // Update local state
          setProducts(prev => prev.map(p => 
            p.title === fix.title 
              ? { ...p, image_url: fix.correctImageUrl, price: fix.correctPrice }
              : p
          ));
        } catch (error) {
          console.error(`Failed to fix ${fix.title}:`, error);
        }
      }
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Products fetch error:', error);
        toast({
          title: "Error loading products",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setProducts(data || []);
        
        // Auto-fix broken images
        if (data && data.length > 0) {
          await fixBrokenImages(data);
        }
      }
    } catch (error) {
      console.error('Products fetch catch error:', error);
      toast({
        title: "Error loading products",
        description: "Failed to load products from database",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [fixBrokenImages, toast]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return { products, loading, refetch: fetchProducts };
};
