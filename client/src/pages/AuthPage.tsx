import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Logo from "@/components/Logo";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import ProgressIndicator from "@/components/ProgressIndicator";

interface AuthFormData {
  password: string;
  confirmPassword?: string;
  email: string;
  name?: string;
}

const AuthPage = () => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [returnTo, setReturnTo] = useState<string | null>(null);
  const [formData, setFormData] = useState<AuthFormData>({
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
    if (!formData.email || !formData.password) {
      toast({
        title: "Missing information",
        description: "Please enter both email and password",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await apiRequest('POST', '/api/auth/login', {
        email: formData.email,
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
        description: "Invalid email or password. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleForgotPassword = async () => {
    if (!formData.email) {
      toast({
        title: "Email required",
        description: "Please enter your email address to reset your password",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await apiRequest('POST', '/api/auth/forgot-password', {
        email: formData.email
      });
      
      toast({
        title: "Password reset initiated",
        description: "If your email is in our system, you'll receive password reset instructions shortly.",
      });
    } catch (error) {
      toast({
        title: "Request failed",
        description: "Unable to process your request. Please try again later.",
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
      
      // Invalidate all auth-related queries to refresh auth state
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/user/profile'] });
      
      toast({
        title: "Registration successful",
        description: "Welcome to Wagba! Your account has been created."
      });
      
      // If the user has saved meal selections, create an order and proceed to checkout
      const savedSelections = sessionStorage.getItem('mealSelections');
      
      if (savedSelections) {
        try {
          const selections = JSON.parse(savedSelections);
          
          // Wait a moment for session to be established
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Create the order using the saved selections
          await apiRequest('POST', '/api/orders', {
            weekId: selections.weekId,
            mealCount: selections.mealCount,
            defaultPortionSize: selections.portionSize,
            items: selections.selectedMeals
          });
          
          // Invalidate pending order query to ensure fresh data
          await queryClient.invalidateQueries({ queryKey: ['/api/orders/pending'] });
          
          // Clear the saved selections
          sessionStorage.removeItem('mealSelections');
          
          // Wait another moment before navigation to ensure queries are updated
          await new Promise(resolve => setTimeout(resolve, 300));
          
          // Redirect to checkout
          navigate('/checkout');
        } catch (error) {
          console.error("Error creating order:", error);
          
          // During onboarding (when there are saved selections), always try to proceed to checkout
          // even if order creation fails - the user can create/update their order there
          sessionStorage.removeItem('mealSelections');
          navigate('/checkout');
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
      <div className="mb-8">
        <Link href="/">
          <Logo className="cursor-pointer" />
        </Link>
      </div>
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
                  <Label htmlFor="login-email">Email</Label>
                  <Input 
                    id="login-email" 
                    name="email" 
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter your email address"
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
                <div className="text-right">
                  <button 
                    type="button"
                    className="text-sm text-primary hover:underline"
                    onClick={handleForgotPassword}
                    disabled={isSubmitting}
                  >
                    Forgot password?
                  </button>
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
