import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";

interface CategoryCardProps {
  name: string;
  image: string;
  productCount: number;
  slug: string;
}

const CategoryCard = ({ name, image, productCount, slug }: CategoryCardProps) => {
  return (
    <Link to={`/category/${slug}`}>
      <Card className="group overflow-hidden border-2 transition-all hover:border-primary hover:shadow-lg cursor-pointer">
        <div className="aspect-square relative overflow-hidden">
          <img
            src={image}
            alt={name}
            className="w-full h-full object-cover transition-transform group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
            <h3 className="font-bold text-xl mb-1">{name}</h3>
            <p className="text-sm text-white/90">{productCount} products</p>
          </div>
        </div>
      </Card>
    </Link>
  );
};

export default CategoryCard;
