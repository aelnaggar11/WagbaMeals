
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Meal } from "@shared/schema";
import { Plus, Edit, Trash2, Save, X } from "lucide-react";

interface MealFormData {
  title: string;
  description: string;
  category: string;
  calories: number;
  protein: number;
  price: number;
  imageUrl: string;
}

const MealsManager = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [formData, setFormData] = useState<MealFormData>({
    title: "",
    description: "",
    category: "main",
    calories: 0,
    protein: 0,
    price: 0,
    imageUrl: ""
  });

  // Fetch all meals
  const { data: mealsData, isLoading } = useQuery<{ meals: Meal[] }>({
    queryKey: ['/api/meals'],
    queryFn: async () => {
      const response = await fetch('/api/meals');
      if (!response.ok) throw new Error('Failed to fetch meals');
      return response.json();
    }
  });

  // Create meal mutation
  const createMealMutation = useMutation({
    mutationFn: async (mealData: MealFormData) => {
      const response = await fetch('/api/admin/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mealData)
      });
      if (!response.ok) throw new Error('Failed to create meal');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/meals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/meals'] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Meal created successfully!"
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create meal. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Update meal mutation
  const updateMealMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: MealFormData }) => {
      const response = await fetch(`/api/admin/meals/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update meal');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/meals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/meals'] });
      setIsDialogOpen(false);
      setEditingMeal(null);
      resetForm();
      toast({
        title: "Success",
        description: "Meal updated successfully!"
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update meal. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Delete meal mutation
  const deleteMealMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/meals/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete meal');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/meals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/meals'] });
      toast({
        title: "Success",
        description: "Meal deleted successfully!"
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete meal. Please try again.",
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      category: "main",
      calories: 0,
      protein: 0,
      price: 0,
      imageUrl: ""
    });
  };

  const handleOpenDialog = (meal?: Meal) => {
    if (meal) {
      setEditingMeal(meal);
      setFormData({
        title: meal.title,
        description: meal.description,
        category: meal.category,
        calories: meal.calories,
        protein: meal.protein,
        price: meal.price,
        imageUrl: meal.imageUrl
      });
    } else {
      setEditingMeal(null);
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.description || !formData.imageUrl) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    if (editingMeal) {
      updateMealMutation.mutate({ id: editingMeal.id, data: formData });
    } else {
      createMealMutation.mutate(formData);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this meal? This action cannot be undone.')) {
      deleteMealMutation.mutate(id);
    }
  };

  const categories = [
    { value: "main", label: "Main Course" },
    { value: "breakfast", label: "Breakfast" },
    { value: "lunch", label: "Lunch" },
    { value: "dinner", label: "Dinner" },
    { value: "snack", label: "Snack" },
    { value: "dessert", label: "Dessert" }
  ];

  if (isLoading) {
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
            <CardTitle>Meal Management</CardTitle>
            <CardDescription>
              Add, edit, and manage all meals in your database. These meals will be available for selection in weekly menus.
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus size={16} className="mr-2" />
                Add New Meal
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingMeal ? 'Edit Meal' : 'Add New Meal'}
                </DialogTitle>
                <DialogDescription>
                  {editingMeal ? 'Update the meal information below.' : 'Fill in the details to create a new meal.'}
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Meal Name *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., Herb Grilled Chicken"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe the meal ingredients and preparation..."
                    rows={3}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="imageUrl">Image URL *</Label>
                  <Input
                    id="imageUrl"
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    placeholder="https://example.com/meal-image.jpg"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="calories">Calories</Label>
                    <Input
                      id="calories"
                      type="number"
                      min="0"
                      value={formData.calories || ''}
                      onChange={(e) => setFormData({ ...formData, calories: parseInt(e.target.value) || 0 })}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="protein">Protein (g)</Label>
                    <Input
                      id="protein"
                      type="number"
                      min="0"
                      step="0.1"
                      value={formData.protein || ''}
                      onChange={(e) => setFormData({ ...formData, protein: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price">Price (EGP)</Label>
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.price || ''}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    <X size={16} className="mr-2" />
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMealMutation.isPending || updateMealMutation.isPending}
                  >
                    <Save size={16} className="mr-2" />
                    {editingMeal ? 'Update Meal' : 'Create Meal'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        
        <CardContent>
          {mealsData?.meals && mealsData.meals.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Image</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Calories</TableHead>
                  <TableHead>Protein</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mealsData.meals.map((meal) => (
                  <TableRow key={meal.id}>
                    <TableCell>
                      <img 
                        src={meal.imageUrl} 
                        alt={meal.title} 
                        className="w-16 h-16 object-cover rounded"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{meal.title}</TableCell>
                    <TableCell className="capitalize">{meal.category}</TableCell>
                    <TableCell className="max-w-xs truncate" title={meal.description}>
                      {meal.description}
                    </TableCell>
                    <TableCell>{meal.calories} cal</TableCell>
                    <TableCell>{meal.protein}g</TableCell>
                    <TableCell>EGP {meal.price}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => handleOpenDialog(meal)}
                        >
                          <Edit size={16} />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => handleDelete(meal.id)}
                          disabled={deleteMealMutation.isPending}
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
              <p className="text-sm text-gray-400 mb-6">
                Add your first meal to get started. These meals will be available for selection in weekly menus.
              </p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus size={16} className="mr-2" />
                Add Your First Meal
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MealsManager;
