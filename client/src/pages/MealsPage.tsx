import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, ChefHat, Clock, Users, Leaf, X } from "lucide-react";
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
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const handleMealClick = (meal: Meal) => {
    setSelectedMeal(meal);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedMeal(null);
  };

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
            <Card 
              key={meal.id} 
              className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleMealClick(meal)}
            >
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

      {/* Meal Detail Modal */}
      <Dialog open={isModalOpen} onOpenChange={closeModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedMeal && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold mb-2">
                  {selectedMeal.title}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Meal Image */}
                <div className="relative w-full h-64 rounded-lg overflow-hidden">
                  <img 
                    src={selectedMeal.imageUrl} 
                    alt={selectedMeal.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-4 right-4">
                    <Badge variant="secondary" className="bg-white/90">
                      {selectedMeal.category}
                    </Badge>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h3 className="font-semibold text-lg mb-2">About This Meal</h3>
                  <p className="text-gray-700 leading-relaxed">
                    {selectedMeal.description}
                  </p>
                </div>

                {/* Nutrition Information */}
                <div>
                  <h3 className="font-semibold text-lg mb-4">Nutrition Facts</h3>
                  <Tabs defaultValue="standard" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="standard">Standard Portion</TabsTrigger>
                      <TabsTrigger value="large">Large Portion</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="standard" className="mt-4">
                      <div className="grid grid-cols-2 gap-6">
                        <div className="text-center p-4 bg-orange-50 rounded-lg">
                          <div className="text-2xl font-bold text-orange-600">{selectedMeal.calories}</div>
                          <div className="text-gray-600 font-medium">Calories</div>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">{selectedMeal.protein}g</div>
                          <div className="text-gray-600 font-medium">Protein</div>
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="large" className="mt-4">
                      <div className="grid grid-cols-2 gap-6">
                        <div className="text-center p-4 bg-orange-50 rounded-lg">
                          <div className="text-2xl font-bold text-orange-600">{selectedMeal.caloriesLarge}</div>
                          <div className="text-gray-600 font-medium">Calories</div>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">{selectedMeal.proteinLarge}g</div>
                          <div className="text-gray-600 font-medium">Protein</div>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>

                {/* Ingredients */}
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <ChefHat className="h-5 w-5 text-red-600" />
                    Ingredients
                  </h3>
                  {selectedMeal.ingredients && selectedMeal.ingredients.trim() ? (
                    <div className="text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-lg">
                      {selectedMeal.ingredients.split(',').length > 1 ? (
                        <ul className="list-disc list-inside space-y-1">
                          {selectedMeal.ingredients.split(',').map((ingredient, index) => (
                            <li key={index} className="text-sm">
                              {ingredient.trim()}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p>{selectedMeal.ingredients}</p>
                      )}
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                      <p className="text-amber-700 text-sm">
                        <strong>Ingredients information coming soon!</strong><br/>
                        Our chef team is working on providing detailed ingredient lists for all meals. 
                        For specific dietary requirements or allergen information, please contact our support team.
                      </p>
                    </div>
                  )}
                </div>

                {/* Tags */}
                {selectedMeal.tags && selectedMeal.tags.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-lg mb-3">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedMeal.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-sm">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Close Button */}
                <div className="flex justify-end pt-4 border-t">
                  <Button onClick={closeModal} variant="outline">
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MealsPage;