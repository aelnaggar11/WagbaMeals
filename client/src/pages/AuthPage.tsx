import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import ProgressIndicator from "@/components/ProgressIndicator";

interface AuthFormData {
  username: string;
  password: string;
  confirmPassword?: string;
  email?: string;
  name?: string;
}

const AuthPage = () => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [returnTo, setReturnTo] = useState<string | null>(null);
  const [formData, setFormData] = useState<AuthFormData>({
    username: "",
    password: "",
    confirmPassword: "",
    email: "",
    name: ""
  });
  
  // Get the return URL from query params if available
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const returnToPath = params.get('returnTo');
    if (returnToPath) {
      setReturnTo(returnToPath);
    }
  }, []);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleLogin = async () => {
    // Validation
    if (!formData.username || !formData.password) {
      toast({
        title: "Missing information",
        description: "Please enter both username and password",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await apiRequest('POST', '/api/auth/login', {
        username: formData.username,
        password: formData.password
      });
      
      // Invalidate queries to refresh auth state
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      
      toast({
        title: "Login successful",
        description: "Welcome back to Wagba!"
      });
      
      // Redirect to return URL if available, otherwise to account page
      if (returnTo) {
        navigate(returnTo);
      } else {
        navigate('/account');
      }
    } catch (error) {
      toast({
        title: "Login failed",
        description: "Invalid username or password. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleRegister = async () => {
    // Validation
    if (!formData.password || !formData.email) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }
    
    if (formData.password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Generate a unique username from the email
      const username = formData.email.split('@')[0] + '_' + Math.floor(Math.random() * 10000);
      
      await apiRequest('POST', '/api/auth/register', {
        username: username,
        password: formData.password,
        email: formData.email,
        name: formData.email.split('@')[0], // Use part of email as name
        isAdmin: false
      });
      
      // Invalidate queries to refresh auth state
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      
      toast({
        title: "Registration successful",
        description: "Welcome to Wagba! Your account has been created."
      });
      
      // If the user has saved meal selections, create an order and proceed to checkout
      const savedSelections = sessionStorage.getItem('mealSelections');
      
      if (savedSelections) {
        try {
          const selections = JSON.parse(savedSelections);
          
          // Create the order using the saved selections
          await apiRequest('POST', '/api/orders', {
            weekId: selections.weekId,
            mealCount: selections.mealCount,
            defaultPortionSize: selections.portionSize,
            items: selections.selectedMeals
          });
          
          // Clear the saved selections
          sessionStorage.removeItem('mealSelections');
          
          // Redirect to checkout
          navigate('/checkout');
        } catch (error) {
          console.error("Error creating order:", error);
          
          // Redirect to return URL if available or meal selection as fallback
          if (returnTo) {
            navigate(returnTo);
          } else {
            navigate('/menu/current');
          }
        }
      } else {
        // No saved selections, redirect to return URL if available or meal plans as fallback
        if (returnTo) {
          navigate(returnTo);
        } else {
          navigate('/meal-plans');
        }
      }
    } catch (error) {
      toast({
        title: "Registration failed",
        description: "Username or email already exists. Please try again with different credentials.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Define the checkout steps
  const steps = [
    { id: 1, label: "Choose Your Plan" },
    { id: 2, label: "Your Selections" },
    { id: 3, label: "Create Account" },
    { id: 4, label: "Complete Checkout" }
  ];

  // Check if we should skip progress indicators (direct login)
  const params = new URLSearchParams(window.location.search);
  const skipProgress = params.get('skip_progress') === 'true';

  return (
    <div className="container mx-auto px-4 py-8">
      {!skipProgress && <ProgressIndicator steps={steps} currentStep={3} />}
      
      <div className="max-w-md mx-auto">
        <Tabs defaultValue="register" className="w-full">
          <TabsList className="grid grid-cols-2 mb-6">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>Welcome Back</CardTitle>
                <CardDescription>Login to manage your meal plans and orders</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-username">Username</Label>
                  <Input 
                    id="login-username" 
                    name="username" 
                    value={formData.username}
                    onChange={handleInputChange}
                    placeholder="Enter your username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input 
                    id="login-password" 
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Enter your password"
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full bg-primary hover:bg-primary/90 text-white"
                  onClick={handleLogin}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Logging in..." : "Log In"}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="register">
            <Card>
              <CardHeader>
                <CardTitle>Create an Account</CardTitle>
                <CardDescription>Sign up to start ordering delicious healthy meals</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-email">Email</Label>
                  <Input 
                    id="register-email" 
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter your email address"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password">Password</Label>
                  <Input 
                    id="register-password" 
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Choose a password (min. 6 characters)"
                    required
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full bg-primary hover:bg-primary/90 text-white"
                  onClick={handleRegister}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Creating Account..." : "Create Account"}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AuthPage;
