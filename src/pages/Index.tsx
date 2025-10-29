import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import CategoryCard from "@/components/CategoryCard";
import { Button } from "@/components/ui/button";
import { ArrowRight, Truck, Clock, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import fruitsImage from "@/assets/category-fruits.jpg";
import vegetablesImage from "@/assets/category-vegetables.jpg";
import dairyImage from "@/assets/category-dairy.jpg";
import bakeryImage from "@/assets/category-bakery.jpg";

const Index = () => {
  const categories = [
    { name: "Fresh Fruits", image: fruitsImage, productCount: 150, slug: "fruits" },
    { name: "Vegetables", image: vegetablesImage, productCount: 200, slug: "vegetables" },
    { name: "Dairy Products", image: dairyImage, productCount: 80, slug: "dairy" },
    { name: "Bakery", image: bakeryImage, productCount: 60, slug: "bakery" },
  ];

  const features = [
    {
      icon: Clock,
      title: "60-Minute Delivery",
      description: "Get your groceries delivered to your door within an hour"
    },
    {
      icon: Truck,
      title: "Free Delivery",
      description: "Free delivery on all orders over R200"
    },
    {
      icon: Shield,
      title: "Quality Guaranteed",
      description: "Fresh products or your money back, no questions asked"
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar cartItemsCount={0} />
      
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((category) => (
            <CategoryCard key={category.slug} {...category} />
          ))}
        </div>
      </section>

      <section className="bg-muted/50 py-16">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-12">Why Choose SPAR Delivery?</h2>
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
            Fresh groceries delivered to your door in under 60 minutes. Download the app or order online now.
          </p>
          <Link to="/products">
            <Button size="lg" variant="secondary" className="bg-white text-primary hover:bg-white/90">
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
