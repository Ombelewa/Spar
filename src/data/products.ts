import { Product } from "@/components/ProductCard";

export const products: Product[] = [
  // Fruits
  {
    id: "1",
    name: "Fresh Apples - Red Delicious",
    price: 29.99,
    image: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=800",
    unit: "per kg",
    category: "fruits",
    inStock: true,
    discount: 10
  },
  {
    id: "2",
    name: "Bananas - Premium",
    price: 19.99,
    image: "https://images.unsplash.com/photo-1603833665858-e61d17a86224?w=800",
    unit: "per kg",
    category: "fruits",
    inStock: true
  },
  {
    id: "3",
    name: "Fresh Oranges",
    price: 34.99,
    image: "https://images.unsplash.com/photo-1580052614034-c55d20bfee3b?w=800",
    unit: "per kg",
    category: "fruits",
    inStock: true
  },
  {
    id: "4",
    name: "Strawberries - Punnet",
    price: 45.99,
    image: "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=800",
    unit: "250g",
    category: "fruits",
    inStock: true,
    discount: 15
  },

  // Vegetables
  {
    id: "5",
    name: "Fresh Tomatoes",
    price: 24.99,
    image: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800",
    unit: "per kg",
    category: "vegetables",
    inStock: true
  },
  {
    id: "6",
    name: "Lettuce - Iceberg",
    price: 15.99,
    image: "https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=800",
    unit: "each",
    category: "vegetables",
    inStock: true
  },
  {
    id: "7",
    name: "Carrots - Fresh",
    price: 18.99,
    image: "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=800",
    unit: "per kg",
    category: "vegetables",
    inStock: true,
    discount: 5
  },
  {
    id: "8",
    name: "Bell Peppers - Mixed",
    price: 39.99,
    image: "https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=800",
    unit: "per kg",
    category: "vegetables",
    inStock: true
  },

  // Dairy
  {
    id: "9",
    name: "Full Cream Milk",
    price: 21.99,
    image: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=800",
    unit: "2L",
    category: "dairy",
    inStock: true
  },
  {
    id: "10",
    name: "Cheddar Cheese",
    price: 54.99,
    image: "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=800",
    unit: "500g",
    category: "dairy",
    inStock: true,
    discount: 20
  },
  {
    id: "11",
    name: "Greek Yogurt",
    price: 35.99,
    image: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800",
    unit: "500g",
    category: "dairy",
    inStock: true
  },
  {
    id: "12",
    name: "Fresh Butter",
    price: 42.99,
    image: "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=800",
    unit: "250g",
    category: "dairy",
    inStock: false
  },

  // Bakery
  {
    id: "13",
    name: "White Bread - Sliced",
    price: 16.99,
    image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800",
    unit: "700g loaf",
    category: "bakery",
    inStock: true
  },
  {
    id: "14",
    name: "Croissants - 6 Pack",
    price: 34.99,
    image: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800",
    unit: "6 pack",
    category: "bakery",
    inStock: true,
    discount: 10
  },
  {
    id: "15",
    name: "Brown Bread",
    price: 18.99,
    image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800",
    unit: "700g loaf",
    category: "bakery",
    inStock: true
  },
  {
    id: "16",
    name: "Assorted Muffins",
    price: 44.99,
    image: "https://images.unsplash.com/photo-1607958996333-41aef7caefaa?w=800",
    unit: "6 pack",
    category: "bakery",
    inStock: true
  },
];
