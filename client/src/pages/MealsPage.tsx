import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ChefHat, Clock, Users, Leaf } from "lucide-react";
import logoImage from "@assets/Logo tm.png";
import headerPatternImage from "@assets/Header BG Pattern_1753742643683.png";

interface Meal {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  calories: number;
  protein: number;
  caloriesLarge: number;
  proteinLarge: number;
  ingredients?: string;
  tags?: string[];
  category: string;
}

const MealsPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Fetch all meals
  const { data: mealsData, isLoading } = useQuery<{ meals: Meal[] }>({
    queryKey: ['/api/meals'],
  });

  const meals = mealsData?.meals || [];

  // Get unique categories
  const categories = ["all", ...Array.from(new Set(meals.map(meal => meal.category)))];

  // Filter meals based on search and category
  const filteredMeals = meals.filter(meal => {
    const matchesSearch = meal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         meal.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         meal.ingredients?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         meal.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === "all" || meal.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        {/* Header */}
        <div 
          className="relative overflow-hidden h-24 flex items-center justify-center px-8"
          style={{ 
            backgroundColor: '#A80906',
            backgroundImage: `url(${headerPatternImage})`,
            backgroundRepeat: 'repeat-x',
            backgroundSize: 'auto 96px',
            backgroundPosition: 'center'
          }}
        >
          <div className="relative z-10 h-14">
            <img 
              src={logoImage} 
              alt="Wagba Logo" 
              className="h-full w-auto brightness-0 invert"
            />
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading our delicious meals...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div 
        className="relative overflow-hidden h-24 flex items-center justify-center px-8"
        style={{ 
          backgroundColor: '#A80906',
          backgroundImage: `url(${headerPatternImage})`,
          backgroundRepeat: 'repeat-x',
          backgroundSize: 'auto 96px',
          backgroundPosition: 'center'
        }}
      >
        <div className="relative z-10 h-14">
          <img 
            src={logoImage} 
            alt="Wagba Logo" 
            className="h-full w-auto brightness-0 invert"
          />
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Page Title and Description */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: '#A80906' }}>
            Our Complete Meal Collection
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Explore our entire catalog of chef-crafted meals. Each dish is prepared with fresh ingredients, 
            balanced nutrition, and authentic flavors to fuel your week.
          </p>
        </div>

        {/* Search and Filter */}
        <div className="mb-8 space-y-4">
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search meals, ingredients, or tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex flex-wrap justify-center gap-2">
            {categories.map(category => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className={selectedCategory === category ? "bg-red-600 hover:bg-red-700" : ""}
              >
                {category === "all" ? "All Categories" : category}
              </Button>
            ))}
          </div>
        </div>

        {/* Meals Count */}
        <div className="text-center mb-6">
          <p className="text-gray-600">
            Showing {filteredMeals.length} of {meals.length} meals
          </p>
        </div>

        {/* Meals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredMeals.map((meal) => (
            <Card key={meal.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-video relative overflow-hidden">
                <img 
                  src={meal.imageUrl} 
                  alt={meal.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2">
                  <Badge variant="secondary" className="bg-white/90">
                    {meal.category}
                  </Badge>
                </div>
              </div>
              
              <CardHeader>
                <CardTitle className="text-lg">{meal.title}</CardTitle>
                <CardDescription className="text-sm line-clamp-2">
                  {meal.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Nutrition Info */}
                <Tabs defaultValue="standard" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="standard">Standard</TabsTrigger>
                    <TabsTrigger value="large">Large</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="standard" className="mt-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="text-center p-2 bg-orange-50 rounded">
                        <div className="font-bold text-orange-600">{meal.calories}</div>
                        <div className="text-gray-600">Calories</div>
                      </div>
                      <div className="text-center p-2 bg-green-50 rounded">
                        <div className="font-bold text-green-600">{meal.protein}g</div>
                        <div className="text-gray-600">Protein</div>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="large" className="mt-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="text-center p-2 bg-orange-50 rounded">
                        <div className="font-bold text-orange-600">{meal.caloriesLarge}</div>
                        <div className="text-gray-600">Calories</div>
                      </div>
                      <div className="text-center p-2 bg-green-50 rounded">
                        <div className="font-bold text-green-600">{meal.proteinLarge}g</div>
                        <div className="text-gray-600">Protein</div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                {/* Ingredients */}
                {meal.ingredients && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-1">
                      <ChefHat className="h-3 w-3" />
                      Ingredients
                    </h4>
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {meal.ingredients}
                    </p>
                  </div>
                )}

                {/* Tags */}
                {meal.tags && meal.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {meal.tags.slice(0, 3).map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {meal.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{meal.tags.length - 3} more
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* No Results */}
        {filteredMeals.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Search className="h-12 w-12 mx-auto mb-4" />
              <p className="text-lg">No meals found</p>
              <p className="text-sm">Try adjusting your search or filter options</p>
            </div>
            <Button 
              onClick={() => {setSearchTerm(""); setSelectedCategory("all");}}
              variant="outline"
            >
              Clear Filters
            </Button>
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-12 text-center py-8 border-t border-gray-200">
          <p className="text-gray-600 text-sm mb-2">
            All meals are prepared fresh by our chefs using premium ingredients
          </p>
          <p className="text-xs text-gray-500">
            Nutritional values are approximate and may vary based on preparation
          </p>
        </div>
      </div>
    </div>
  );
};

export default MealsPage;