import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { z } from "zod";
import { Trash2, Edit, Plus, Move, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ImageUploader } from "./ImageUploader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Meal } from "@shared/schema";

// Schemas for form validation
const heroSchema = z.object({
  backgroundImageUrl: z.string().url().optional().or(z.literal("")),
  ctaText: z.string().default("Get Started"),
  ctaUrl: z.string().default("/"),
  isActive: z.boolean().default(true),
});

const carouselMealSchema = z.object({
  mealId: z.number().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  displayOrder: z.number().default(0),
  isActive: z.boolean().default(true),
});

const faqSchema = z.object({
  question: z.string().min(1, "Question is required"),
  answer: z.string().min(1, "Answer is required"),
  displayOrder: z.number().default(0),
  isActive: z.boolean().default(true),
});

type HeroFormData = z.infer<typeof heroSchema>;
type CarouselMealFormData = z.infer<typeof carouselMealSchema>;
type FaqFormData = z.infer<typeof faqSchema>;

export function LandingPageManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch data with proper typing
  const { data: hero } = useQuery<any>({
    queryKey: ['/api/admin/landing/hero'],
  });

  const { data: carouselMeals = [] } = useQuery<any[]>({
    queryKey: ['/api/admin/landing/carousel-meals'],
  });

  const { data: faqs = [] } = useQuery<any[]>({
    queryKey: ['/api/admin/landing/faqs'],
  });

  const { data: mealsResponse } = useQuery<{ meals: Meal[] }>({
    queryKey: ['/api/meals'],
  });
  
  const allMeals = Array.isArray(mealsResponse?.meals) ? mealsResponse.meals : [];

  // Hero Section Component
  const HeroSection = () => {
    const [isEditing, setIsEditing] = useState(false);
    
    const heroForm = useForm<HeroFormData>({
      resolver: zodResolver(heroSchema),
      defaultValues: hero || {
        backgroundImageUrl: "",
        ctaText: "Get Started",
        ctaUrl: "/",
        isActive: true,
      },
    });

    // Only reset form when entering edit mode (when hero data loads)
    useEffect(() => {
      if (hero && !isEditing) {
        heroForm.reset({
          backgroundImageUrl: hero.backgroundImageUrl || "",
          ctaText: hero.ctaText || "Get Started",
          ctaUrl: hero.ctaUrl || "/",
          isActive: hero.isActive !== false,
        });
      }
    }, [hero]);

    const heroMutation = useMutation({
      mutationFn: async (data: HeroFormData) => {
        if (hero?.id) {
          return await fetch(`/api/admin/landing/hero/${hero.id}`, {
            method: 'PATCH',
            headers: { 
              'Content-Type': 'application/json',
              'credentials': 'include'
            },
            credentials: 'include',
            body: JSON.stringify(data),
          }).then(res => res.json());
        } else {
          return await fetch('/api/admin/landing/hero', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'credentials': 'include'
            },
            credentials: 'include',
            body: JSON.stringify(data),
          }).then(res => res.json());
        }
      },
      onSuccess: () => {
        toast({
          title: "Success",
          description: "Hero section updated successfully",
        });
        queryClient.refetchQueries({ queryKey: ['/api/admin/landing/hero'] });
        setIsEditing(false);
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: "Failed to update hero section",
          variant: "destructive",
        });
      },
    });

    const handleHeroSubmit = (data: HeroFormData) => {
      heroMutation.mutate(data);
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Hero Section
            <Button
              onClick={() => setIsEditing(!isEditing)}
              variant={isEditing ? "outline" : "default"}
            >
              {isEditing ? "Cancel" : <Edit className="h-4 w-4" />}
            </Button>
          </CardTitle>
          <CardDescription>
            Manage the main hero section of the landing page
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <Form {...heroForm}>
              <form onSubmit={heroForm.handleSubmit(handleHeroSubmit)} className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-700 mb-2">Hero Text (Fixed)</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>• Refined recipes.</p>
                    <p>• Real ingredients.</p>
                    <p>• Ready in minutes.</p>
                  </div>
                </div>
                
                <FormField
                  control={heroForm.control}
                  name="backgroundImageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <ImageUploader
                        label="Background Image"
                        currentImageUrl={field.value}
                        onImageUploaded={(url) => {
                          field.onChange(url);
                        }}
                      />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={heroForm.control}
                    name="ctaText"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CTA Button Text</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={heroForm.control}
                    name="ctaUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CTA Button URL</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button type="submit" disabled={heroMutation.isPending}>
                  {heroMutation.isPending ? "Saving..." : "Save Hero Section"}
                </Button>
              </form>
            </Form>
          ) : (
            <div className="space-y-2">
              <p><strong>Text:</strong> "Refined recipes. Real ingredients. Ready in minutes." (Fixed)</p>
              <p><strong>Background Image:</strong> {hero?.backgroundImageUrl ? "Set" : "Not set"}</p>
              <p><strong>CTA Text:</strong> {hero?.ctaText || "Get Started"}</p>
              <p><strong>CTA URL:</strong> {hero?.ctaUrl || "/"}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Carousel Meals Component
  const CarouselMealsSection = () => {
    const [editingMeal, setEditingMeal] = useState<any>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    
    const carouselForm = useForm<CarouselMealFormData>({
      resolver: zodResolver(carouselMealSchema),
      defaultValues: {
        name: "",
        description: "",
        imageUrl: "",
        displayOrder: 0,
        isActive: true,
      },
    });

    const carouselMutation = useMutation({
      mutationFn: async ({ data, id }: { data: CarouselMealFormData; id?: number }) => {
        if (id) {
          return await fetch(`/api/admin/landing/carousel-meals/${id}`, {
            method: 'PATCH',
            headers: { 
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(data),
          }).then(res => res.json());
        } else {
          return await fetch('/api/admin/landing/carousel-meals', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(data),
          }).then(res => res.json());
        }
      },
      onSuccess: () => {
        toast({
          title: "Success",
          description: "Carousel meal updated successfully",
        });
        queryClient.refetchQueries({ queryKey: ['/api/admin/landing/carousel-meals'] });
        setEditingMeal(null);
        setShowAddForm(false);
        carouselForm.reset();
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Failed to update carousel meal",
          variant: "destructive",
        });
      },
    });

    const deleteMealMutation = useMutation({
      mutationFn: (id: number) => 
        fetch(`/api/admin/landing/carousel-meals/${id}`, {
          method: 'DELETE',
          credentials: 'include',
        }).then(res => res.json()),
      onSuccess: () => {
        toast({
          title: "Success",
          description: "Meal deleted successfully",
        });
        queryClient.refetchQueries({ queryKey: ['/api/admin/landing/carousel-meals'] });
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Failed to delete meal",
          variant: "destructive",
        });
      },
    });

    const handleCarouselSubmit = (data: CarouselMealFormData) => {
      // Check if we're adding and already have 10 meals
      if (!editingMeal && carouselMeals.length >= 10) {
        toast({
          title: "Limit Reached",
          description: "You can only add a maximum of 10 meals to the carousel",
          variant: "destructive",
        });
        return;
      }

      // Validate that either mealId is selected or name is provided
      if (!editingMeal && !data.mealId && !data.name) {
        toast({
          title: "Error",
          description: "Please select a meal from the database",
          variant: "destructive",
        });
        return;
      }

      carouselMutation.mutate({
        data,
        id: editingMeal?.id,
      });
    };

    const startEdit = (meal: any) => {
      setEditingMeal(meal);
      carouselForm.reset(meal);
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Menu Carousel
            <Button
              onClick={() => {
                setShowAddForm(true);
                carouselForm.reset({
                  mealId: undefined,
                  name: "",
                  description: "",
                  imageUrl: "",
                  displayOrder: carouselMeals.length,
                  isActive: true,
                });
              }}
              size="sm"
              disabled={carouselMeals.length >= 10}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Meal {carouselMeals.length >= 10 && "(Max 10)"}
            </Button>
          </CardTitle>
          <CardDescription>
            Manage the meals shown in the menu carousel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {carouselMeals
              .sort((a: any, b: any) => a.displayOrder - b.displayOrder)
              .map((meal: any) => (
              <div key={meal.id} className="flex items-center justify-between p-4 border rounded">
                <div>
                  <h4 className="font-medium">{meal.name}</h4>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => startEdit(meal)}
                    size="sm"
                    variant="outline"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Meal</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{meal.name}"? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteMealMutation.mutate(meal.id)}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>

          {/* Add/Edit Form */}
          {(showAddForm || editingMeal) && (
            <div className="mt-6 p-4 border rounded">
              <h4 className="font-medium mb-4">
                {editingMeal ? "Edit Meal" : "Add New Meal"}
              </h4>
              <Form {...carouselForm}>
                <form onSubmit={carouselForm.handleSubmit(handleCarouselSubmit)} className="space-y-4">
                  {!editingMeal && (
                    <FormField
                      control={carouselForm.control}
                      name="mealId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Select Meal from Database</FormLabel>
                          <Select 
                            onValueChange={(value) => {
                              const mealId = parseInt(value);
                              field.onChange(mealId);
                              
                              const selectedMeal = allMeals.find(m => m.id === mealId);
                              if (selectedMeal) {
                                carouselForm.setValue("name", selectedMeal.title);
                                carouselForm.setValue("description", selectedMeal.description);
                                carouselForm.setValue("imageUrl", selectedMeal.imageUrl);
                              }
                            }}
                            value={field.value?.toString() || ""}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Choose a meal..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Array.isArray(allMeals) && allMeals.length > 0 ? (
                                allMeals
                                  .filter((meal) => !carouselMeals.some((cm: any) => cm.mealId === meal.id))
                                  .map((meal) => (
                                  <SelectItem key={meal.id} value={meal.id.toString()}>
                                    {meal.title}
                                  </SelectItem>
                                ))
                              ) : (
                                <div className="p-2 text-sm text-gray-500">No meals available</div>
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  
                  <FormField
                    control={carouselForm.control}
                    name="displayOrder"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Display Order</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="number"
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2">
                    <Button type="submit" disabled={carouselMutation.isPending}>
                      {carouselMutation.isPending ? "Saving..." : editingMeal ? "Update Meal" : "Add Meal"}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => {
                        setEditingMeal(null);
                        setShowAddForm(false);
                        carouselForm.reset();
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // FAQs Component
  const FaqsSection = () => {
    const [editingFaq, setEditingFaq] = useState<any>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    
    const faqForm = useForm<FaqFormData>({
      resolver: zodResolver(faqSchema),
      defaultValues: {
        question: "",
        answer: "",
        displayOrder: 0,
        isActive: true,
      },
    });

    const faqMutation = useMutation({
      mutationFn: async ({ data, id }: { data: FaqFormData; id?: number }) => {
        if (id) {
          return await fetch(`/api/admin/landing/faqs/${id}`, {
            method: 'PATCH',
            headers: { 
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(data),
          }).then(res => res.json());
        } else {
          return await fetch('/api/admin/landing/faqs', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(data),
          }).then(res => res.json());
        }
      },
      onSuccess: () => {
        toast({
          title: "Success",
          description: "FAQ updated successfully",
        });
        queryClient.refetchQueries({ queryKey: ['/api/admin/landing/faqs'] });
        setEditingFaq(null);
        setShowAddForm(false);
        faqForm.reset();
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Failed to update FAQ",
          variant: "destructive",
        });
      },
    });

    const deleteFaqMutation = useMutation({
      mutationFn: (id: number) => 
        fetch(`/api/admin/landing/faqs/${id}`, {
          method: 'DELETE',
          credentials: 'include',
        }).then(res => res.json()),
      onSuccess: () => {
        toast({
          title: "Success",
          description: "FAQ deleted successfully",
        });
        queryClient.refetchQueries({ queryKey: ['/api/admin/landing/faqs'] });
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Failed to delete FAQ",
          variant: "destructive",
        });
      },
    });

    const handleFaqSubmit = (data: FaqFormData) => {
      faqMutation.mutate({
        data,
        id: editingFaq?.id,
      });
    };

    const startEdit = (faq: any) => {
      setEditingFaq(faq);
      faqForm.reset(faq);
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            FAQs
            <Button
              onClick={() => setShowAddForm(true)}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add FAQ
            </Button>
          </CardTitle>
          <CardDescription>
            Manage frequently asked questions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {faqs.map((faq: any) => (
              <div key={faq.id} className="p-4 border rounded">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium">{faq.question}</h4>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => startEdit(faq)}
                      size="sm"
                      variant="outline"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete FAQ</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this FAQ? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteFaqMutation.mutate(faq.id)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                <p className="text-sm text-gray-600">{faq.answer}</p>
              </div>
            ))}
          </div>

          {/* Add/Edit Form */}
          {(showAddForm || editingFaq) && (
            <div className="mt-6 p-4 border rounded">
              <h4 className="font-medium mb-4">
                {editingFaq ? "Edit FAQ" : "Add New FAQ"}
              </h4>
              <Form {...faqForm}>
                <form onSubmit={faqForm.handleSubmit(handleFaqSubmit)} className="space-y-4">
                  <FormField
                    control={faqForm.control}
                    name="question"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Question</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter question" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={faqForm.control}
                    name="answer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Answer</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Enter answer" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={faqForm.control}
                    name="displayOrder"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Display Order</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="number"
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2">
                    <Button type="submit" disabled={faqMutation.isPending}>
                      {faqMutation.isPending ? "Saving..." : editingFaq ? "Update FAQ" : "Add FAQ"}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => {
                        setEditingFaq(null);
                        setShowAddForm(false);
                        faqForm.reset();
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Landing Page Management</h1>
        <p className="text-gray-600">Edit and manage the content of your landing page</p>
      </div>

      <div className="space-y-6">
        <HeroSection />
        <CarouselMealsSection />
        <FaqsSection />
      </div>
    </div>
  );
}