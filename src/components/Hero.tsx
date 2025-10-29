import { Button } from "@/components/ui/button";
import { Clock, Truck } from "lucide-react";
import heroImage from "@/assets/hero-groceries.jpg";

const Hero = () => {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-background via-muted/30 to-background">
      <div className="container py-12 md:py-20">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div className="space-y-6">
            <div className="inline-block">
              <div className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
                <Truck className="h-4 w-4" />
                <span>Fast Delivery to Your Doorstep</span>
              </div>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold leading-tight">
              Fresh Groceries
              <span className="block bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Delivered in Minutes
              </span>
            </h1>
            
            <p className="text-lg text-muted-foreground max-w-lg">
              Shop from thousands of products and get them delivered to your door in under 60 minutes. Your everyday essentials, just a tap away.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity">
                Start Shopping
              </Button>
              <Button size="lg" variant="outline">
                View Categories
              </Button>
            </div>

            <div className="flex items-center gap-6 pt-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-secondary" />
                <div>
                  <div className="font-semibold">60 Minutes</div>
                  <div className="text-sm text-muted-foreground">Delivery Time</div>
                </div>
              </div>
              <div className="h-12 w-px bg-border" />
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-secondary" />
                <div>
                  <div className="font-semibold">Free Delivery</div>
                  <div className="text-sm text-muted-foreground">On orders over R200</div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-secondary/20 rounded-3xl blur-3xl" />
            <img
              src={heroImage}
              alt="Fresh groceries"
              className="relative rounded-3xl shadow-2xl w-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
