import { useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  category_id?: string;
  unit: string;
  stock_quantity: number;
  images: string[];
  is_active: boolean;
  is_featured: boolean;
  min_stock_level: number;
}

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product, quantity: number) => void;
}

const ProductCard = ({ product, onAddToCart }: ProductCardProps) => {
  const [quantity, setQuantity] = useState(1);

  const handleAdd = () => {
    if (quantity > 0 && quantity <= product.stock_quantity) {
      onAddToCart(product, quantity);
      setQuantity(1);
    }
  };

  return (
    <Card className="flex flex-col">
      <CardContent className="p-4 flex-1">
        <img
          src={product.images?.[0] || "/placeholder.svg"}
          alt={product.name}
          className="w-full h-48 object-cover rounded-lg mb-4"
          onError={(e) => {
            e.currentTarget.src = "/placeholder.svg";
          }}
        />
        <h3 className="font-semibold text-lg mb-1">{product.name}</h3>
        {product.description && (
          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
            {product.description}
          </p>
        )}
        <p className="text-sm text-muted-foreground mb-2">{product.unit}</p>
        <p className="text-lg font-bold text-primary">
          R {product.price.toFixed(2)}
        </p>
        <p className="text-sm text-muted-foreground">
          {product.stock_quantity > 0
            ? `${product.stock_quantity} in stock`
            : "Out of stock"}
        </p>
      </CardContent>
      <CardFooter className="p-4 flex items-center gap-2">
        <Input
          type="number"
          min="1"
          max={product.stock_quantity}
          value={quantity}
          onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
          className="w-20"
          disabled={product.stock_quantity === 0}
        />
        <Button
          onClick={handleAdd}
          className="flex-1"
          disabled={product.stock_quantity === 0}
        >
          {product.stock_quantity === 0 ? "Out of Stock" : "Add to Cart"}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ProductCard;
