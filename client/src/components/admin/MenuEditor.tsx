import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Meal, Week, WeekMeal } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeftRight, CheckCircle, Edit, Plus, Trash2, XCircle } from "lucide-react";

interface MenuEditorProps {
  weekId: number;
}

interface NewMealForm {
  title: string;
  description: string;
  imageUrl: string;
  calories: number;
  protein: number;
  price: number;
  tags: string[];
  category: string;
}

const MenuEditor = ({ weekId }: MenuEditorProps) => {
  const { toast } = useToast();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);

  // New meal form
  const [newMealForm, setNewMealForm] = useState<NewMealForm>({
    title: "",
    description: "",
    imageUrl: "",
    calories: 0,
    protein: 0,
    price: 249,
    tags: [],
    category: "Main Dishes"
  });

  // Fetch week data
  const { data: weekData, isLoading: weekLoading } = useQuery<Week>({
    queryKey: ['/api/weeks', weekId],
    queryFn: async () => {
      const res = await fetch(`/api/weeks/${weekId}`);
      return res.json();
    }
  });

  // Fetch meals for the week
  const { data: weekMealsData, isLoading: weekMealsLoading, refetch: refetchWeekMeals } = useQuery<{ meals: Meal[] }>({
    queryKey: ['/api/menu', weekId],
    queryFn: async () => {
      const res = await fetch(`/api/menu/${weekId}`);
      return res.json();
    }
  });

  // Fetch all meals for adding to the week
  const { data: allMealsData, refetch: refetchAllMeals } = useQuery<{ meals: Meal[] }>({
    queryKey: ['/api/meals'],
    queryFn: async () => {
      const res = await fetch('/api/meals');
      return res.json();
    }
  });

  // Meals that are not yet added to the week
  const availableMeals = allMealsData?.meals.filter(meal => 
    !weekMealsData?.meals.some(weekMeal => weekMeal.id === meal.id)
  ) || [];

  // Handle adding a meal to the week
  const handleAddMealToWeek = async (mealId: number) => {
    try {
      await apiRequest('POST', `/api/weeks/${weekId}/meals`, {
        mealId,
        isAvailable: true,
        isFeatured: false,
        sortOrder: (weekMealsData?.meals.length || 0) + 1
      });

      // Refetch data to update UI immediately
      await refetchWeekMeals();
      await refetchAllMeals();

      toast({
        title: "Meal added",
        description: "The meal has been added to this week's menu."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "There was an error adding the meal. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Handle removing a meal from the week
  const handleRemoveMealFromWeek = async (mealId: number) => {
    try {
      await apiRequest('DELETE', `/api/weeks/${weekId}/meals/${mealId}`, {});

      // Refetch data to update UI immediately
      await refetchWeekMeals();
      await refetchAllMeals();

      toast({
        title: "Meal removed",
        description: "The meal has been removed from this week's menu."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "There was an error removing the meal. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Handle updating a meal
  const handleUpdateMeal = async () => {
    if (!editingMeal) return;

    try {
      await apiRequest('PATCH', `/api/meals/${editingMeal.id}`, editingMeal);

      // Refetch data to update UI immediately
      await refetchWeekMeals();
      await refetchAllMeals();

      toast({
        title: "Meal updated",
        description: "The meal has been updated successfully."
      });

      setIsEditDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "There was an error updating the meal. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Handle creating a new meal
  const handleCreateMeal = async () => {
    try {
      // Convert tags from string to array if needed
      let processedTags = newMealForm.tags;
      if (typeof newMealForm.tags === 'string') {
        processedTags = (newMealForm.tags as unknown as string).split(',').map(tag => tag.trim());
      }

      const response = await apiRequest('POST', '/api/meals', {
        ...newMealForm,
        tags: processedTags
      });
      const newMeal = await response.json();

      // Add the new meal to the week
      await handleAddMealToWeek(newMeal.id);

      // Refetch data to update UI immediately
      await refetchWeekMeals();
      await refetchAllMeals();

      toast({
        title: "Meal created",
        description: "The new meal has been created and added to the menu."
      });

      // Reset form
      setNewMealForm({
        title: "",
        description: "",
        imageUrl: "",
        calories: 0,
        protein: 0,
        price: 249,
        tags: [],
        category: "Main Dishes"
      });

      setIsAddDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "There was an error creating the meal. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Handle form field changes for editing
  const handleEditingMealChange = (field: string, value: any) => {
    if (!editingMeal) return;

    setEditingMeal({
      ...editingMeal,
      [field]: value
    });
  };

  // Handle form field changes for new meal
  const handleNewMealFormChange = (field: string, value: any) => {
    setNewMealForm({
      ...newMealForm,
      [field]: value
    });
  };

  if (weekLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-center items-center h-40">
            <p>Loading menu data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!weekData) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-center items-center h-40">
            <p>Week not found</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Menu for {weekData.label}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="current">
            <TabsList>
              <TabsTrigger value="current">Current Menu</TabsTrigger>
              <TabsTrigger value="available">Available Meals</TabsTrigger>
            </TabsList>

            <TabsContent value="current" className="mt-4">
              {weekMealsLoading ? (
                <div className="flex justify-center items-center h-40">
                  <p>Loading menu data...</p>
                </div>
              ) : weekMealsData && weekMealsData.meals && weekMealsData.meals.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Image</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Calories</TableHead>
                      <TableHead>Protein</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {weekMealsData?.meals?.map((meal) => (
                      <TableRow key={meal.id}>
                        <TableCell>
                          <img 
                            src={meal.imageUrl} 
                            alt={meal.title} 
                            className="w-16 h-16 object-cover rounded"
                          />
                        </TableCell>
                        <TableCell className="font-medium">{meal.title}</TableCell>
                        <TableCell>{meal.category}</TableCell>
                        <TableCell>{meal.calories} cal</TableCell>
                        <TableCell>{meal.protein}g</TableCell>
                        <TableCell>EGP {meal.price}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button 
                              variant="outline" 
                              size="icon"
                              onClick={() => handleRemoveMealFromWeek(meal.id)}
                            >
                              <Trash2 size={16} className="text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-10">
                  <p className="text-gray-500 mb-4">No meals added to this week's menu yet.</p>
                  <p className="text-sm text-gray-400">Add meals from the "Available Meals" tab below.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="available" className="mt-4">
              {availableMeals.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Image</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Calories</TableHead>
                      <TableHead>Protein</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {availableMeals.map((meal) => (
                      <TableRow key={meal.id}>
                        <TableCell>
                          <img 
                            src={meal.imageUrl} 
                            alt={meal.title} 
                            className="w-16 h-16 object-cover rounded"
                          />
                        </TableCell>
                        <TableCell className="font-medium">{meal.title}</TableCell>
                        <TableCell>{meal.category}</TableCell>
                        <TableCell>{meal.calories} cal</TableCell>
                        <TableCell>{meal.protein}g</TableCell>
                        <TableCell>EGP {meal.price}</TableCell>
                        <TableCell>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleAddMealToWeek(meal.id)}
                          >
                            <ArrowLeftRight size={14} className="mr-2" />
                            Add to Menu
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-10">
                  <p className="text-gray-500 mb-4">No additional meals available.</p>
                  <p className="text-sm text-gray-400">All existing meals are already in this week's menu. Create new meals in the "Meals" tab.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default MenuEditor;