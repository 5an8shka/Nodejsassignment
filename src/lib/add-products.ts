import { supabase } from '@/integrations/supabase/client';

// Function to remove the Portable Phone Charger product
export const removePortableCharger = async () => {
  try {
    const { data, error } = await supabase
      .from('products')
      .delete()
      .eq('title', 'Portable Phone Charger')
      .select();

    if (error) {
      console.error('Error removing Portable Phone Charger:', error);
      return { success: false, error };
    }

    console.log('Successfully removed Portable Phone Charger:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Error removing product:', error);
    return { success: false, error };
  }
};

// Function to add/update products with proper images (keeping other products)
export const addProductsWithImages = async () => {
  try {
    const products = [
      {
        id: 'wireless-earbuds-001',
        title: 'Wireless Bluetooth Earbuds',
        description: 'Premium sound quality with noise cancellation and 8-hour battery life.',
        price: 79.99,
        image_url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500&h=500&fit=crop&auto=format'
      },
      {
        id: 'smartphone-case-001',
        title: 'Protective Smartphone Case',
        description: 'Drop-proof case with military-grade protection and wireless charging compatibility.',
        price: 24.99,
        image_url: 'https://images.unsplash.com/photo-1556656793-08538906a9f8?w=500&h=500&fit=crop&auto=format'
      }
    ];

    for (const product of products) {
      const { data, error } = await supabase
        .from('products')
        .upsert(product)
        .select();

      if (error) {
        console.error(`Error updating product ${product.title}:`, error);
      } else {
        console.log(`Successfully updated product: ${product.title}`);
      }
    }

    console.log('All products updated successfully!');
    return { success: true };
  } catch (error) {
    console.error('Error updating products:', error);
    return { success: false, error };
  }
};