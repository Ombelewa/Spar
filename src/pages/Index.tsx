import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import CategoryCard from "@/components/CategoryCard";
import { Button } from "@/components/ui/button";
import { ArrowRight, Truck, Clock, Shield, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import {
  categoryService,
  productService,
  authService,
} from "@/lib/supabase-service";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/supabase";
import fruitsImage from "@/assets/category-fruits.jpg";
import vegetablesImage from "@/assets/category-vegetables.jpg";
import dairyImage from "@/assets/category-dairy.jpg";
import bakeryImage from "@/assets/category-bakery.jpg";

const Index = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cartCount, setCartCount] = useState(0);
  const { toast } = useToast();

  // Default images for categories
  const categoryImages: { [key: string]: string } = {
    "fresh-produce": fruitsImage,
    "dairy-eggs": dairyImage,
    bakery: bakeryImage,
    "meat-seafood": vegetablesImage, // Using vegetables image as placeholder
    "pantry-essentials": dairyImage, // Using dairy image as placeholder
    beverages: fruitsImage, // Using fruits image as placeholder
    "snacks-candy": bakeryImage, // Using bakery image as placeholder
    household: vegetablesImage,
    "personal-care": dairyImage,
    "baby-kids": fruitsImage,
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // Load categories from database
        const categoriesData = await categoryService.getCategories(true); // Only active categories

        // Get product counts for each category
        const categoriesWithCounts = await Promise.all(
          categoriesData.map(async (category: any) => {
            try {
              const products = await productService.getProducts({
                categoryId: category.id,
                activeOnly: true,
                limit: 1000, // Get all to count
              });

              return {
                ...category,
                productCount: products?.length || 0,
                image: categoryImages[category.slug] || fruitsImage, // Fallback image
              };
            } catch (error) {
              console.error(
                `Error loading products for category ${category.name}:`,
                error,
              );
              return {
                ...category,
                productCount: 0,
                image: categoryImages[category.slug] || fruitsImage,
              };
            }
          }),
        );

        setCategories(categoriesWithCounts);
      } catch (error) {
        console.error("Error loading categories:", error);
        toast({
          title: "Error",
          description: "Failed to load categories. Please refresh the page.",
          variant: "destructive",
        });

        // Fallback to empty array
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [toast]);

  const features = [
    {
      icon: Clock,
      title: "60-Minute Delivery",
      description: "Get your groceries delivered to your door within an hour",
    },
    {
      icon: Truck,
      title: "Free Delivery",
      description: "Free delivery on all orders over R200",
    },
    {
      icon: Shield,
      title: "Quality Guaranteed",
      description: "Fresh products or your money back, no questions asked",
    },
  ];

  useEffect(() => {
    const loadCartCount = async () => {
      try {
        const user = await authService.getCurrentUser();
        if (user) {
          const { data: cartData } = await supabase
            .from("cart_items")
            .select("quantity")
            .eq("customer_id", user.id);

          const count =
            cartData?.reduce((sum, item) => sum + item.quantity, 0) || 0;
          setCartCount(count);
        }
      } catch (error) {
        console.error("Error loading cart count:", error);
      }
    };

    loadCartCount();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar cartItemsCount={cartCount} />

      <Hero />

      <section className="container py-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-2">Shop by Category</h2>
            <p className="text-muted-foreground">Browse our fresh selection</p>
          </div>
          <Link to="/products">
            <Button variant="outline">
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className="aspect-square bg-gray-200 rounded-lg mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((category) => (
              <CategoryCard key={category.slug} {...category} />
            ))}
          </div>
        )}
      </section>

      <section className="bg-muted/50 py-16">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-12">
            Why Choose SPAR Delivery?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
                  <feature.icon className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container py-16">
        <div className="bg-gradient-to-r from-primary to-secondary rounded-3xl p-8 md:p-12 text-center text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Start Shopping Today
          </h2>
          <p className="text-lg mb-6 text-white/90 max-w-2xl mx-auto">
            Fresh groceries delivered to your door in under 60 minutes. Download
            the app or order online now.
          </p>
          <Link to="/products">
            <Button
              size="lg"
              variant="secondary"
              className="bg-white text-primary hover:bg-white/90"
            >
              Browse Products
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t bg-muted/30 py-8">
        <div className="container text-center text-muted-foreground">
          <p>&copy; 2025 SPAR Delivery. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
