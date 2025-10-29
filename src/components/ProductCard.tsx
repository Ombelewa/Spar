import { useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  image_url: string;
  unit: string;
  stock: number;
}

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product, quantity: number) => void;
}

const ProductCard = ({ product, onAddToCart }: ProductCardProps) => {
  const [quantity, setQuantity] = useState(1);

  const handleAdd = () => {
    if (quantity > 0 && quantity <= product.stock) {
      onAddToCart(product, quantity);
      setQuantity(1);
    }
  };

  return (
    <Card className="flex flex-col">
      <CardContent className="p-4 flex-1">
        <img
          src={product.image_url}
          alt={product.name}
          className="w-full h-48 object-cover rounded-lg mb-4"
        />
        <h3 className="font-semibold text-lg mb-1">{product.name}</h3>
        <p className="text-sm text-muted-foreground mb-2">{product.unit}</p>
        <p className="text-lg font-bold text-primary">R {product.price.toFixed(2)}</p>
        <p className="text-sm text-muted-foreground">
          {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
        </p>
      </CardContent>
      <CardFooter className="p-4 flex items-center gap-2">
        <Input
          type="number"
          min="1"
          max={product.stock}
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
          className="w-16"
          disabled={product.stock === 0}
        />
        <Button
          onClick={handleAdd}
          disabled={product.stock === 0 || quantity > product.stock}
        >
          Add to Cart
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ProductCard;