
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Meal } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Edit, Plus, Trash2 } from "lucide-react";

interface NewMealForm {
  title: string;
  description: string;
  imageUrl: string;
  calories: number;
  protein: number;
  price: number;
  tags: string;
  category: string;
}

const MealsManager = () => {
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
    tags: "",
    category: "Main Dishes"
  });

  // Fetch all meals
  const { data: allMealsData, isLoading: mealsLoading, refetch: refetchMeals } = useQuery<{ meals: Meal[] }>({
    queryKey: ['/api/meals'],
    queryFn: async () => {
      const res = await fetch('/api/meals');
      return res.json();
    }
  });

  // Handle creating a new meal
  const handleCreateMeal = async () => {
    try {
      // Convert tags from string to array
      const processedTags = newMealForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);

      await apiRequest('POST', '/api/meals', {
        ...newMealForm,
        tags: processedTags
      });

      await refetchMeals();

      toast({
        title: "Meal created",
        description: "The new meal has been created successfully."
      });

      // Reset form
      setNewMealForm({
        title: "",
        description: "",
        imageUrl: "",
        calories: 0,
        protein: 0,
        price: 249,
        tags: "",
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

  // Handle updating a meal
  const handleUpdateMeal = async () => {
    if (!editingMeal) return;

    try {
      await apiRequest('PATCH', `/api/meals/${editingMeal.id}`, editingMeal);

      await refetchMeals();

      toast({
        title: "Meal updated",
        description: "The meal has been updated successfully."
      });

      setIsEditDialogOpen(false);
      setEditingMeal(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "There was an error updating the meal. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Handle deleting a meal
  const handleDeleteMeal = async (mealId: number) => {
    if (!confirm("Are you sure you want to delete this meal? This action cannot be undone.")) {
      return;
    }

    try {
      await apiRequest('DELETE', `/api/meals/${mealId}`, {});

      await refetchMeals();

      toast({
        title: "Meal deleted",
        description: "The meal has been deleted successfully."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "There was an error deleting the meal. Please try again.",
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

  const categories = ["Main Dishes", "Salads", "Bowls", "Vegetarian", "Protein", "Sides"];

  if (mealsLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-center items-center h-40">
            <p>Loading meals...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Meals Database</CardTitle>
            <p className="text-sm text-gray-600 mt-1">Manage all meals available in the system</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus size={16} className="mr-2" />
                Add New Meal
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Meal</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Meal Name</Label>
                  <Input
                    id="title"
                    value={newMealForm.title}
                    onChange={(e) => handleNewMealFormChange('title', e.target.value)}
                    placeholder="Enter meal name"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newMealForm.description}
                    onChange={(e) => handleNewMealFormChange('description', e.target.value)}
                    placeholder="Enter meal description"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="imageUrl">Image URL</Label>
                  <Input
                    id="imageUrl"
                    value={newMealForm.imageUrl}
                    onChange={(e) => handleNewMealFormChange('imageUrl', e.target.value)}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={newMealForm.category} onValueChange={(value) => handleNewMealFormChange('category', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="calories">Calories</Label>
                    <Input
                      id="calories"
                      type="number"
                      value={newMealForm.calories}
                      onChange={(e) => handleNewMealFormChange('calories', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="protein">Protein (g)</Label>
                    <Input
                      id="protein"
                      type="number"
                      value={newMealForm.protein}
                      onChange={(e) => handleNewMealFormChange('protein', parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="price">Price (EGP)</Label>
                  <Input
                    id="price"
                    type="number"
                    value={newMealForm.price}
                    onChange={(e) => handleNewMealFormChange('price', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <Input
                    id="tags"
                    value={newMealForm.tags}
                    onChange={(e) => handleNewMealFormChange('tags', e.target.value)}
                    placeholder="protein, low-carb, gluten-free"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateMeal}>
                    Create Meal
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {allMealsData && allMealsData.meals && allMealsData.meals.length > 0 ? (
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
                {allMealsData.meals.map((meal) => (
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
                          onClick={() => {
                            setEditingMeal(meal);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Edit size={16} />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => handleDeleteMeal(meal.id)}
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
              <p className="text-gray-500 mb-4">No meals in the database yet.</p>
              <p className="text-sm text-gray-400">Add your first meal to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Meal Dialog */}
      {editingMeal && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Meal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-title">Meal Name</Label>
                <Input
                  id="edit-title"
                  value={editingMeal.title}
                  onChange={(e) => handleEditingMealChange('title', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editingMeal.description}
                  onChange={(e) => handleEditingMealChange('description', e.target.value)}
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="edit-imageUrl">Image URL</Label>
                <Input
                  id="edit-imageUrl"
                  value={editingMeal.imageUrl}
                  onChange={(e) => handleEditingMealChange('imageUrl', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="edit-category">Category</Label>
                <Select value={editingMeal.category} onValueChange={(value) => handleEditingMealChange('category', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-calories">Calories</Label>
                  <Input
                    id="edit-calories"
                    type="number"
                    value={editingMeal.calories}
                    onChange={(e) => handleEditingMealChange('calories', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-protein">Protein (g)</Label>
                  <Input
                    id="edit-protein"
                    type="number"
                    value={editingMeal.protein}
                    onChange={(e) => handleEditingMealChange('protein', parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit-price">Price (EGP)</Label>
                <Input
                  id="edit-price"
                  type="number"
                  value={editingMeal.price}
                  onChange={(e) => handleEditingMealChange('price', parseInt(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label htmlFor="edit-tags">Tags (comma-separated)</Label>
                <Input
                  id="edit-tags"
                  value={Array.isArray(editingMeal.tags) ? editingMeal.tags.join(', ') : editingMeal.tags}
                  onChange={(e) => handleEditingMealChange('tags', e.target.value.split(',').map(tag => tag.trim()))}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateMeal}>
                  Update Meal
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default MealsManager;
