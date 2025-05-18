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
  const { data: weekData } = useQuery<Week>({
    queryKey: [`/api/weeks/${weekId}`],
    queryFn: async () => {
      const res = await fetch(`/api/weeks/${weekId}`);
      return res.json();
    }
  });
  
  // Fetch meals for the week
  const { data: weekMealsData } = useQuery<{ meals: Meal[] }>({
    queryKey: [`/api/menu/${weekId}`],
  });
  
  // Fetch all meals for adding to the week
  const { data: allMealsData } = useQuery<{ meals: Meal[] }>({
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
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/menu/${weekId}`] });
      
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
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/menu/${weekId}`] });
      
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
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/menu/${weekId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/meals'] });
      
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
      
      const newMeal = await apiRequest('POST', '/api/meals', {
        ...newMealForm,
        tags: processedTags
      });
      
      // Add the new meal to the week
      await handleAddMealToWeek(newMeal.id);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/menu/${weekId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/meals'] });
      
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
  
  if (!weekData || !weekMealsData) {
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
  
  return (
    <div className="space-y-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Menu for {weekData.label}</CardTitle>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-white">
                <Plus size={16} className="mr-2" />
                Create New Meal
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Meal</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-title">Title</Label>
                    <Input
                      id="new-title"
                      value={newMealForm.title}
                      onChange={(e) => handleNewMealFormChange('title', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-category">Category</Label>
                    <Input
                      id="new-category"
                      value={newMealForm.category}
                      onChange={(e) => handleNewMealFormChange('category', e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="new-description">Description</Label>
                  <Textarea
                    id="new-description"
                    value={newMealForm.description}
                    onChange={(e) => handleNewMealFormChange('description', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="new-image">Image URL</Label>
                  <Input
                    id="new-image"
                    value={newMealForm.imageUrl}
                    onChange={(e) => handleNewMealFormChange('imageUrl', e.target.value)}
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-calories">Calories</Label>
                    <Input
                      id="new-calories"
                      type="number"
                      value={newMealForm.calories}
                      onChange={(e) => handleNewMealFormChange('calories', parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-protein">Protein (g)</Label>
                    <Input
                      id="new-protein"
                      type="number"
                      value={newMealForm.protein}
                      onChange={(e) => handleNewMealFormChange('protein', parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-price">Base Price (EGP)</Label>
                    <Input
                      id="new-price"
                      type="number"
                      value={newMealForm.price}
                      onChange={(e) => handleNewMealFormChange('price', parseInt(e.target.value))}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="new-tags">Tags (comma separated)</Label>
                  <Input
                    id="new-tags"
                    value={newMealForm.tags.join(', ')}
                    onChange={(e) => handleNewMealFormChange('tags', e.target.value.split(',').map(tag => tag.trim()))}
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-4">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateMeal} className="bg-primary hover:bg-primary/90 text-white">
                  Create Meal
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="current">
            <TabsList>
              <TabsTrigger value="current">Current Menu</TabsTrigger>
              <TabsTrigger value="available">Available Meals</TabsTrigger>
            </TabsList>
            
            <TabsContent value="current" className="mt-4">
              {weekMealsData.meals.length > 0 ? (
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
                    {weekMealsData.meals.map((meal) => (
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
                            <Dialog open={isEditDialogOpen && editingMeal?.id === meal.id} onOpenChange={(open) => {
                              setIsEditDialogOpen(open);
                              if (!open) setEditingMeal(null);
                            }}>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="icon"
                                  onClick={() => setEditingMeal(meal)}
                                >
                                  <Edit size={16} />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>Edit Meal</DialogTitle>
                                </DialogHeader>
                                {editingMeal && (
                                  <div className="grid gap-4 py-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                        <Label htmlFor="title">Title</Label>
                                        <Input
                                          id="title"
                                          value={editingMeal.title}
                                          onChange={(e) => handleEditingMealChange('title', e.target.value)}
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label htmlFor="category">Category</Label>
                                        <Input
                                          id="category"
                                          value={editingMeal.category}
                                          onChange={(e) => handleEditingMealChange('category', e.target.value)}
                                        />
                                      </div>
                                    </div>
                                    
                                    <div className="space-y-2">
                                      <Label htmlFor="description">Description</Label>
                                      <Textarea
                                        id="description"
                                        value={editingMeal.description}
                                        onChange={(e) => handleEditingMealChange('description', e.target.value)}
                                      />
                                    </div>
                                    
                                    <div className="space-y-2">
                                      <Label htmlFor="image">Image URL</Label>
                                      <Input
                                        id="image"
                                        value={editingMeal.imageUrl}
                                        onChange={(e) => handleEditingMealChange('imageUrl', e.target.value)}
                                      />
                                    </div>
                                    
                                    <div className="grid grid-cols-3 gap-4">
                                      <div className="space-y-2">
                                        <Label htmlFor="calories">Calories</Label>
                                        <Input
                                          id="calories"
                                          type="number"
                                          value={editingMeal.calories}
                                          onChange={(e) => handleEditingMealChange('calories', parseInt(e.target.value))}
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label htmlFor="protein">Protein (g)</Label>
                                        <Input
                                          id="protein"
                                          type="number"
                                          value={editingMeal.protein}
                                          onChange={(e) => handleEditingMealChange('protein', parseInt(e.target.value))}
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label htmlFor="price">Base Price (EGP)</Label>
                                        <Input
                                          id="price"
                                          type="number"
                                          value={editingMeal.price}
                                          onChange={(e) => handleEditingMealChange('price', parseInt(e.target.value))}
                                        />
                                      </div>
                                    </div>
                                    
                                    <div className="space-y-2">
                                      <Label htmlFor="tags">Tags (comma separated)</Label>
                                      <Input
                                        id="tags"
                                        value={editingMeal.tags ? editingMeal.tags.join(', ') : ''}
                                        onChange={(e) => handleEditingMealChange('tags', e.target.value.split(',').map(tag => tag.trim()))}
                                      />
                                    </div>
                                  </div>
                                )}
                                <div className="flex justify-end space-x-4">
                                  <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                                    Cancel
                                  </Button>
                                  <Button onClick={handleUpdateMeal} className="bg-primary hover:bg-primary/90 text-white">
                                    Save Changes
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                            
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
                  <p className="text-sm text-gray-400">Add meals from the "Available Meals" tab or create new meals.</p>
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
                  <p className="text-sm text-gray-400">All existing meals are already in this week's menu.</p>
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
