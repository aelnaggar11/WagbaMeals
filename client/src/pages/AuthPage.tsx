import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Logo from "@/components/Logo";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, EyeOff } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import ProgressIndicator from "@/components/ProgressIndicator";
import PreOnboardingModal from "@/components/PreOnboardingModal";

interface AuthFormData {
  password: string;
  confirmPassword?: string;
  email: string;
}

const AuthPage = () => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [returnTo, setReturnTo] = useState<string | null>(null);
  const [defaultTab, setDefaultTab] = useState<string>("register");
  const [showPreOnboardingModal, setShowPreOnboardingModal] = useState(false);
  const [isDirectLoginAccess, setIsDirectLoginAccess] = useState(false);
  const [formData, setFormData] = useState<AuthFormData>({
    password: "",
    confirmPassword: "",
    email: ""
  });
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  // Check if user is already authenticated
  const { data: user } = useQuery<{ id: number } | null>({
    queryKey: ['/api/auth/me'],
  });

  // Redirect authenticated users back to menu selection if they're in onboarding flow
  // BUT NOT during active registration/login to prevent redirect race conditions
  useEffect(() => {
    if (user && !isSubmitting) {
      const params = new URLSearchParams(window.location.search);
      const fromSelection = params.get("fromSelection");
      const weekId = params.get("weekId");
      const mealCount = params.get("mealCount");
      const portionSize = params.get("portionSize");
      
      // If user is authenticated and this is from meal selection (onboarding flow)
      if (fromSelection === "true" && weekId && mealCount && portionSize) {
        console.log('Authenticated user detected in onboarding flow, redirecting to menu selection...');
        navigate(`/menu/${weekId}?fromPlan=true&mealCount=${mealCount}&portionSize=${portionSize}`);
        return;
      }
    }
  }, [user, navigate, isSubmitting]);
  
  // Handle browser back button properly
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const params = new URLSearchParams(window.location.search);
      // Check if we're in onboarding flow
      if (params.get("fromSelection") && params.get("mealCount")) {
        // Navigate back to menu selection
        const weekId = params.get("weekId") || "current";
        const mealCount = params.get("mealCount");
        const portionSize = params.get("portionSize");
        navigate(`/menu/${weekId}?fromPlan=true&mealCount=${mealCount}&portionSize=${portionSize}`);
        return;
      }
      // For other cases, let default behavior handle it
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [navigate]);

  // Get the return URL from query params and pre-populate email if available
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const returnToPath = params.get('returnTo');
    if (returnToPath) {
      setReturnTo(returnToPath);
    }
    
    // Check for login tab parameter
    const tabParam = params.get('tab');
    const skipProgress = params.get('skip_progress');
    
    if (tabParam === 'login') {
      setDefaultTab('login');
    } else if (tabParam === 'register') {
      setDefaultTab('register');
    }
    
    // Check if this is direct login access (skip_progress=true)
    if (skipProgress === 'true') {
      setIsDirectLoginAccess(true);
    }

    // Pre-populate email from pre-onboarding modal (don't clear it yet - only clear after successful registration)
    const preOnboardingEmail = sessionStorage.getItem('preOnboardingEmail');
    if (preOnboardingEmail) {
      setFormData(prev => ({
        ...prev,
        email: preOnboardingEmail
      }));
    }
  }, []);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent, action: 'login' | 'register') => {
    if (e.key === 'Enter' && !isSubmitting) {
      e.preventDefault();
      if (action === 'login') {
        handleLogin();
      } else {
        handleRegister();
      }
    }
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
      const response = await apiRequest('POST', '/api/auth/login', {
        email: formData.email,
        password: formData.password
      });
      
      // Store token as backup authentication method
      if (response && response.token) {
        localStorage.setItem('wagba_auth_token', response.token);
      }
      
      // Invalidate queries to refresh auth state
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/user/profile'] });
      
      toast({
        title: "Login successful",
        description: "Welcome back to Wagba!"
      });

      // Clear pre-onboarding email after successful login
      sessionStorage.removeItem('preOnboardingEmail');
      sessionStorage.removeItem('preOnboardingNeighborhood');
      
      // Wait for auth state to update
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Pre-fetch the user data to ensure authentication is working
      try {
        await queryClient.fetchQuery({ queryKey: ['/api/auth/me'] });
      } catch (error) {
        console.log('Auth prefetch failed, proceeding anyway:', error);
      }
      
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
      
      const registrationResponse = await apiRequest('POST', '/api/auth/register', {
        username: username,
        password: formData.password,
        email: formData.email,
        name: formData.email.split('@')[0], // Use part of email as temporary name
        isAdmin: false
      });
      
      // Store authentication token immediately for reliable session handling
      if (registrationResponse && registrationResponse.token) {
        localStorage.setItem('wagba_auth_token', registrationResponse.token);
      }
      
      // Invalidate all auth-related queries to refresh auth state
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/user/profile'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/orders/pending'] });
      
      toast({
        title: "Registration successful",
        description: "Welcome to Wagba! Your account has been created."
      });

      // Clear pre-onboarding email after successful registration
      sessionStorage.removeItem('preOnboardingEmail');
      sessionStorage.removeItem('preOnboardingNeighborhood');
      
      // Check for saved meal selections (sessionStorage first, then backend as fallback)
      let savedSelections = null;
      const sessionStorageSelections = sessionStorage.getItem('mealSelections');
      
      if (sessionStorageSelections) {
        try {
          savedSelections = JSON.parse(sessionStorageSelections);
        } catch (error) {
          console.error('Error parsing sessionStorage selections:', error);
        }
      }

      // If no sessionStorage selections, check backend storage
      if (!savedSelections) {
        try {
          // Wait a moment for session to be established
          await new Promise(resolve => setTimeout(resolve, 500));
          const backendSelections = await apiRequest('GET', '/api/temp/meal-selections');
          if (backendSelections) {
            savedSelections = backendSelections;
          }
        } catch (error) {
          console.log('No backend selections found, proceeding without order creation');
        }
      }
      
      if (savedSelections) {
        try {
          // The order should already be created by the registration endpoint
          // if the selections were stored in backend storage
          // But we'll create it here as fallback for sessionStorage selections
          
          if (sessionStorageSelections) {
            // Create order only if selections came from sessionStorage
            await apiRequest('POST', '/api/orders', {
              weekId: savedSelections.weekId,
              mealCount: savedSelections.mealCount,
              defaultPortionSize: savedSelections.portionSize,
              items: savedSelections.selectedMeals
            });
          }
          
          // Invalidate all relevant queries to ensure fresh auth state
          await queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
          await queryClient.invalidateQueries({ queryKey: ['/api/orders/pending'] });
          await queryClient.invalidateQueries({ queryKey: ['/api/user/profile'] });
          
          // Clear the saved selections
          sessionStorage.removeItem('mealSelections');
          
          // Wait longer for authentication and order state to stabilize
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          // Pre-fetch the user data to ensure authentication is working
          try {
            const authData = await queryClient.fetchQuery({ queryKey: ['/api/auth/me'] });
            if (!authData) {
              throw new Error('Authentication failed');
            }
          } catch (error) {
            console.log('Auth prefetch failed, proceeding anyway:', error);
          }
          
          // Force a page reload to ensure clean state before redirect
          setTimeout(() => {
            window.location.href = '/checkout';
          }, 500);
        } catch (error) {
          console.error("Error handling order after registration:", error);
          
          // During onboarding, always try to proceed to checkout
          sessionStorage.removeItem('mealSelections');
          navigate('/checkout');
        }
      } else {
        // No saved selections, wait for auth state to update then redirect to account
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Pre-fetch the user data to ensure authentication is working
        try {
          const authData = await queryClient.fetchQuery({ queryKey: ['/api/auth/me'] });
          if (!authData) {
            throw new Error('Authentication failed');
          }
        } catch (error) {
          console.log('Auth prefetch failed, proceeding anyway:', error);
        }
        
        // Force a page reload to ensure clean state before redirect
        setTimeout(() => {
          if (returnTo) {
            window.location.href = returnTo;
          } else {
            window.location.href = '/account';
          }
        }, 500);
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

  // Handle tab change for direct login access
  const handleTabChange = (value: string) => {
    if (isDirectLoginAccess && value === 'register') {
      // Show pre-onboarding modal instead of allowing direct registration
      setShowPreOnboardingModal(true);
      return; // Don't change the tab
    }
    setDefaultTab(value);
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
      
      {/* Back Button for onboarding flow */}
      {!skipProgress && (
        <div className="flex justify-start mb-4">
          <Button 
            variant="ghost" 
            className="flex items-center text-gray-600"
            onClick={() => {
              const params = new URLSearchParams(window.location.search);
              const returnTo = params.get('returnTo');
              if (returnTo) {
                window.location.href = returnTo;
              } else {
                window.location.href = '/menu/current';
              }
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Menu
          </Button>
        </div>
      )}
      
      <div className="max-w-md mx-auto">
        <Tabs value={defaultTab} onValueChange={handleTabChange} className="w-full">
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
                    onKeyPress={(e) => handleKeyPress(e, 'login')}
                    placeholder="Enter your email address"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <div className="relative">
                    <Input 
                      id="login-password" 
                      name="password"
                      type={showLoginPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={handleInputChange}
                      onKeyPress={(e) => handleKeyPress(e, 'login')}
                      placeholder="Enter your password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                    >
                      {showLoginPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
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
                    onKeyPress={(e) => handleKeyPress(e, 'register')}
                    placeholder="Enter your email address"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-password">Password</Label>
                  <div className="relative">
                    <Input 
                      id="register-password" 
                      name="password"
                      type={showRegisterPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={handleInputChange}
                      onKeyPress={(e) => handleKeyPress(e, 'register')}
                      placeholder="Choose a password (min. 6 characters)"
                      className="pr-10"
                      required
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                    >
                      {showRegisterPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
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
      
      {/* Pre-onboarding Modal */}
      <PreOnboardingModal
        isOpen={showPreOnboardingModal}
        onClose={() => setShowPreOnboardingModal(false)}
        onSuccess={(email) => {
          setShowPreOnboardingModal(false);
          navigate('/meal-plans');
        }}
      />
    </div>
  );
};

export default AuthPage;
