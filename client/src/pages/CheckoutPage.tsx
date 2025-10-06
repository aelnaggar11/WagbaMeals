import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Order } from "@shared/schema";
import ProgressIndicator from "@/components/ProgressIndicator";
import PhoneInput from "@/components/PhoneInput";
import { PricingService } from "@/lib/pricingService";

const CheckoutPage = () => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderType, setOrderType] = useState<"trial" | "subscription">("subscription");
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [paymentConfirmationImage, setPaymentConfirmationImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // Fetch current order with enhanced retry and error handling for onboarding
  const { data: pendingOrder, isLoading, error, refetch } = useQuery<Order>({
    queryKey: ['/api/orders/pending'],
    retry: (failureCount, error) => {
      // During onboarding, retry authentication errors more aggressively
      if (error?.message?.includes('401') && failureCount < 5) {
        return true;
      }
      return failureCount < 3;
    },
    retryDelay: attemptIndex => Math.min(500 * 2 ** attemptIndex, 5000),
    refetchOnWindowFocus: true,
    staleTime: 0, // Always fetch fresh data for pending orders
  });

  // Fetch delivery fee using React Query for better caching and updates
  const { data: deliveryFeeData } = useQuery<{ pricingConfigs: any[] }>({
    queryKey: ['/api/pricing'],
    staleTime: 0, // Always fetch fresh pricing data
  });
  
  // Fetch user profile for delivery address and trial status
  const { data: userProfile } = useQuery<{
    name: string;
    email: string;
    phone: string;
    address: string;
    hasUsedTrialBox: boolean;
    userType: string;
  }>({
    queryKey: ['/api/user/profile'],
  });

  // Fetch neighborhoods for dropdown
  const { data: neighborhoodsData } = useQuery<{ neighborhoods: Array<{ id: number; name: string; isServiced: boolean }> }>({
    queryKey: ['/api/neighborhoods'],
  });

  const servicedNeighborhoods = neighborhoodsData?.neighborhoods.filter(n => n.isServiced) || [];
  
  // Auto-set order type to subscription if user has already used trial box
  useEffect(() => {
    if (userProfile?.hasUsedTrialBox) {
      setOrderType("subscription");
      setPaymentMethod("card"); // Force card payment for subscription
    }
  }, [userProfile?.hasUsedTrialBox]);
  
  // Initialize address state with neighborhood from localStorage (persistent across navigation)
  const [address, setAddress] = useState(() => {
    const storedNeighborhood = localStorage.getItem('preOnboardingNeighborhood') || sessionStorage.getItem('preOnboardingNeighborhood');
    console.log('CheckoutPage initializing with stored neighborhood:', storedNeighborhood);
    return {
      name: "",
      street: "",
      apartment: "",
      building: "",
      area: storedNeighborhood || "",
      landmark: "",
      phone: ""
    };
  });
  
  // Handle browser back button properly
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // Check if user has completed onboarding
      const hasCompletedOnboarding = userProfile?.hasUsedTrialBox || userProfile?.userType === 'subscriber';
      
      if (hasCompletedOnboarding) {
        // Returning user - go to account page
        navigate('/account');
      } else {
        // First-time user in onboarding - go back to menu selection with preserved parameters
        const weekId = pendingOrder?.weekId || 'current';
        const mealCount = pendingOrder?.mealCount || 10;
        const portionSize = pendingOrder?.defaultPortionSize || 'standard';
        navigate(`/menu/${weekId}?mealCount=${mealCount}&portionSize=${portionSize}&fromPlan=true`);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [navigate, userProfile, pendingOrder]);

  // Update delivery fee when pricing data changes
  useEffect(() => {
    if (deliveryFeeData?.pricingConfigs) {
      const baseDeliveryConfig = deliveryFeeData.pricingConfigs.find(
        config => config.configType === 'delivery' && config.configKey === 'base_delivery'
      );
      setDeliveryFee(baseDeliveryConfig?.price || 0);
    }
  }, [deliveryFeeData]);

  // Check and set neighborhood on component mount
  useEffect(() => {
    const storedNeighborhood = localStorage.getItem('preOnboardingNeighborhood') || sessionStorage.getItem('preOnboardingNeighborhood');
    console.log('=== CHECKOUT PAGE MOUNT DEBUG ===');
    console.log('Stored neighborhood (localStorage):', localStorage.getItem('preOnboardingNeighborhood'));
    console.log('Stored neighborhood (sessionStorage):', sessionStorage.getItem('preOnboardingNeighborhood'));
    console.log('Current address.area:', address.area);
    
    // Force set the neighborhood if we have it stored but address.area is empty
    if (storedNeighborhood && !address.area) {
      console.log('Force setting neighborhood from storage:', storedNeighborhood);
      setAddress(prev => ({ ...prev, area: storedNeighborhood }));
    }
  }, []);

  // Enhanced auto-retry with authentication state monitoring
  useEffect(() => {
    if (error && !pendingOrder && !isLoading) {
      // If it's an auth error, also try to refresh the auth state
      if (error.message?.includes('401')) {
        queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      }
      
      const timer = setTimeout(() => {
        refetch();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [error, pendingOrder, isLoading, refetch, queryClient]);

  // Update address form with user profile data when available
  useEffect(() => {
    if (userProfile?.address) {
      try {
        const savedAddress = JSON.parse(userProfile.address);
        setAddress({
          ...address,
          ...savedAddress
        });
      } catch (e) {
        console.error("Error parsing saved address:", e);
      }
    }
    
    if (userProfile?.phone) {
      setAddress({
        ...address,
        phone: userProfile.phone
      });
    }
  }, [userProfile]);

  // Pre-populate neighborhood from pre-onboarding modal
  useEffect(() => {
    const preOnboardingNeighborhood = localStorage.getItem('preOnboardingNeighborhood') || sessionStorage.getItem('preOnboardingNeighborhood');
    
    if (preOnboardingNeighborhood && servicedNeighborhoods.length > 0 && !address.area) {
      // Check if the neighborhood from modal is in our serviced list
      const matchingNeighborhood = servicedNeighborhoods.find(n => n.name === preOnboardingNeighborhood);
      
      if (matchingNeighborhood) {
        console.log('✅ Pre-populating neighborhood from localStorage:', preOnboardingNeighborhood);
        setAddress(prev => ({ ...prev, area: preOnboardingNeighborhood }));
      }
    }
  }, [servicedNeighborhoods]);
  
  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAddress({
      ...address,
      [name]: value
    });
  };

  const handleNeighborhoodChange = (value: string) => {
    setAddress({
      ...address,
      area: value
    });
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file",
          variant: "destructive"
        });
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 5MB",
          variant: "destructive"
        });
        return;
      }
      
      setPaymentConfirmationImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleSubmitOrder = async () => {
    // Validation
    if (!address.street || !address.area || !address.phone) {
      toast({
        title: "Missing information",
        description: "Please fill in all required delivery information",
        variant: "destructive"
      });
      return;
    }
    
    // InstaPay specific validation
    if (paymentMethod === "instapay" && !paymentConfirmationImage) {
      toast({
        title: "Payment confirmation required",
        description: "Please upload your InstaPay payment confirmation image",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('orderId', pendingOrder?.id?.toString() || '');
      formData.append('paymentMethod', paymentMethod);
      formData.append('orderType', orderType);
      formData.append('address', JSON.stringify(address));
      formData.append('deliveryNotes', deliveryNotes);
      
      if (paymentConfirmationImage) {
        formData.append('paymentConfirmationImage', paymentConfirmationImage);
      }
      
      const response = await fetch('/api/orders/checkout', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        // Try to get error details from response
        let errorMessage = 'There was a problem processing your order. Please try again.';
        let errorTitle = 'Error placing order';
        
        if (response.status === 401) {
          errorTitle = 'Authentication required';
          errorMessage = 'Your session has expired. Please refresh the page and try again.';
          console.error('Checkout failed: 401 Unauthorized - Session expired or invalid');
        } else {
          try {
            const errorData = await response.json();
            if (errorData.message) {
              errorMessage = errorData.message;
            }
            console.error('Checkout failed:', response.status, errorData);
          } catch (e) {
            console.error('Checkout failed with status:', response.status);
          }
        }
        
        toast({
          title: errorTitle,
          description: errorMessage,
          variant: "destructive"
        });
        return;
      }
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      
      if (paymentMethod === "instapay") {
        toast({
          title: "Order submitted successfully!",
          description: "Your payment is being processed. You'll receive confirmation once verified.",
          variant: "default"
        });
      } else {
        toast({
          title: "Order placed successfully!",
          description: "Your meals will be delivered on the scheduled delivery date.",
          variant: "default"
        });
      }
      
      // Redirect to account page
      navigate('/account');
    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: "Error placing order",
        description: error instanceof Error ? error.message : "There was a problem processing your order. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }
  
  // Handle authentication errors and provide retry options
  if (error && !isLoading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">Unable to Load Order</h1>
          <p className="text-gray-600 mb-6">
            We're having trouble loading your order. This might be a temporary issue.
          </p>
          <div className="space-y-3">
            <Button onClick={() => refetch()} className="w-full">
              Try Again
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/menu/current')}
              className="w-full"
            >
              Browse Menu
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!pendingOrder && !isLoading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">No Pending Order</h1>
          <p className="text-gray-600 mb-6">You don't have any orders ready for checkout.</p>
          <div className="space-y-3">
            <Button onClick={() => refetch()} className="w-full">
              Refresh
            </Button>
            <Button onClick={() => navigate('/menu/current')}>Browse Menu</Button>
          </div>
        </div>
      </div>
    );
  }
  
  // Define the checkout steps
  const steps = [
    { id: 1, label: "Choose Your Plan" },
    { id: 2, label: "Your Selections" },
    { id: 3, label: "Create Account" },
    { id: 4, label: "Complete Checkout" }
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <ProgressIndicator steps={steps} currentStep={4} />
      {/* Back Button */}
      <div className="flex justify-start mb-4 mt-6">
        <Button 
          variant="ghost" 
          className="flex items-center text-gray-600"
          onClick={() => {
            // Check if user has completed onboarding
            const hasCompletedOnboarding = userProfile?.hasUsedTrialBox || userProfile?.userType === 'subscriber';
            
            if (hasCompletedOnboarding) {
              // Returning user - go to account page
              navigate('/account');
            } else {
              // First-time user in onboarding - go back to menu selection with preserved parameters
              const weekId = pendingOrder?.weekId || 'current';
              const mealCount = pendingOrder?.mealCount || 10;
              const portionSize = pendingOrder?.defaultPortionSize || 'standard';
              navigate(`/menu/${weekId}?mealCount=${mealCount}&portionSize=${portionSize}&fromPlan=true`);
            }
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {(userProfile?.hasUsedTrialBox || userProfile?.userType === 'subscriber') ? 'Back to Account' : 'Back to Menu'}
        </Button>
      </div>
      <div className="max-w-4xl mx-auto mt-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Delivery Information */}
            <Card>
              <CardHeader>
                <CardTitle>Delivery Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input 
                    id="name" 
                    name="name" 
                    value={address.name || ''} 
                    onChange={handleAddressChange} 
                    placeholder="Enter your full name"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="street">Street Address *</Label>
                    <Input 
                      id="street" 
                      name="street" 
                      value={address.street} 
                      onChange={handleAddressChange} 
                      placeholder="Street name" 
                      required
                    />
                  </div>
                  </div>
                
                <div className="space-y-2">
                  <Label htmlFor="area">Neighborhood *</Label>
                  <Select value={address.area} onValueChange={handleNeighborhoodChange} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your neighborhood" />
                    </SelectTrigger>
                    <SelectContent>
                      {servicedNeighborhoods.map((neighborhood) => (
                        <SelectItem key={neighborhood.id} value={neighborhood.name}>
                          {neighborhood.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <PhoneInput
                      value={address.phone}
                      onChange={(value) => setAddress(prev => ({ ...prev, phone: value }))}
                      required
                      label="Phone Number"
                      placeholder="1XXXXXXXXX"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="deliveryNotes">Delivery Notes (Optional)</Label>
                  <Textarea 
                    id="deliveryNotes" 
                    value={deliveryNotes} 
                    onChange={e => setDeliveryNotes(e.target.value)} 
                    placeholder="Any special instructions for delivery"
                    className="min-h-[100px]"
                  />
                </div>
              </CardContent>
            </Card>
            
            {/* Order Type Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Choose Your Order Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {/* Trial Box Option */}
                  <div 
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      orderType === 'trial' 
                        ? 'border-primary bg-primary/5' 
                        : 'border-gray-200 hover:border-gray-300'
                    } ${
                      userProfile?.hasUsedTrialBox ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    onClick={() => !userProfile?.hasUsedTrialBox && setOrderType('trial')}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-lg">Trial Box</h3>
                      {orderType === 'trial' && (
                        <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      {userProfile?.hasUsedTrialBox 
                        ? 'You have already used your trial box' 
                        : 'Try our service for the first time with flexible payment options'
                      }
                    </p>
                    <div className="text-sm">
                      <div className="text-green-600 font-medium">✓ Card or InstaPay accepted</div>
                      <div className="text-green-600 font-medium">✓ One-time purchase</div>
                      <div className="text-green-600 font-medium">✓ No commitment</div>
                      <div className="text-orange-600 font-medium">⚠ Available only once</div>
                    </div>
                  </div>

                  {/* Subscription Option */}
                  <div 
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      orderType === 'subscription' 
                        ? 'border-primary bg-primary/5' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setOrderType('subscription')}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-lg">Subscription</h3>
                      {orderType === 'subscription' && (
                        <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      Join our weekly meal delivery service with recurring orders
                    </p>
                    <div className="text-sm">
                      <div className="text-green-600 font-medium">✓ Credit card required</div>
                      <div className="text-green-600 font-medium">✓ Weekly recurring delivery</div>
                      <div className="text-green-600 font-medium">✓ Skip or pause anytime</div>
                      <div className="text-blue-600 font-medium">💰 Save 10% on your first order</div>
                    </div>
                  </div>
                </div>

                {/* Payment Method based on Order Type */}
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Payment Method</h4>
                  
                  {orderType === 'trial' && !userProfile?.hasUsedTrialBox ? (
                    <Tabs 
                      defaultValue="card" 
                      value={paymentMethod}
                      onValueChange={setPaymentMethod}
                      className="w-full"
                    >
                      <TabsList className="grid grid-cols-2 mb-4">
                        <TabsTrigger value="card">Credit Card</TabsTrigger>
                        <TabsTrigger value="instapay">InstaPay </TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="card" className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="cardNumber">Card Number</Label>
                            <Input id="cardNumber" placeholder="1234 5678 9012 3456" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="cardName">Name on Card</Label>
                            <Input id="cardName" placeholder="John Doe" />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="expiryDate">Expiry Date</Label>
                            <Input id="expiryDate" placeholder="MM/YY" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="cvv">CVV</Label>
                            <Input id="cvv" placeholder="123" />
                          </div>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="instapay" className="space-y-4">
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <h4 className="font-medium mb-2">InstaPay Payment Instructions</h4>
                          <div className="text-sm text-gray-700 space-y-2">
                            <p>1. Send payment to InstaPay account: <strong>wagba.food</strong></p>
                            <p>2. Upload your payment confirmation screenshot below</p>
                            <p>3. Your order will be processed once payment is verified</p>
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="paymentConfirmation">Payment Confirmation Screenshot *</Label>
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                              <input
                                type="file"
                                id="paymentConfirmation"
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="hidden"
                              />
                              <label
                                htmlFor="paymentConfirmation"
                                className="cursor-pointer flex flex-col items-center space-y-2"
                              >
                                {imagePreview ? (
                                  <div className="space-y-2">
                                    <img 
                                      src={imagePreview} 
                                      alt="Payment confirmation preview" 
                                      className="max-w-full max-h-32 object-contain rounded"
                                    />
                                    <p className="text-sm text-green-600">Image uploaded successfully</p>
                                    <p className="text-xs text-gray-500">Click to change image</p>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                    <p className="text-sm text-gray-600">Click to upload payment confirmation</p>
                                    <p className="text-xs text-gray-500">PNG, JPG up to 5MB</p>
                                  </div>
                                )}
                              </label>
                            </div>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center mb-2">
                          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center mr-3">
                            <div className="w-4 h-4 bg-white rounded-full"></div>
                          </div>
                          <span className="font-medium">Credit Card</span>
                        </div>
                        <p className="text-sm text-gray-600">Subscription orders require a credit card for recurring payments</p>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="cardNumber">Card Number</Label>
                            <Input id="cardNumber" placeholder="1234 5678 9012 3456" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="cardName">Name on Card</Label>
                            <Input id="cardName" placeholder="John Doe" />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="expiryDate">Expiry Date</Label>
                            <Input id="expiryDate" placeholder="MM/YY" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="cvv">CVV</Label>
                            <Input id="cvv" placeholder="123" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Order Summary */}
          {pendingOrder && (
            <div>
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>EGP {pendingOrder.subtotal.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Fee</span>
                    <span>EGP {deliveryFee.toFixed(2)}</span>
                  </div>
                  {pendingOrder.discount > 0 && (
                    <div className="flex justify-between text-accent">
                      <span>Discount</span>
                      <span>-EGP {pendingOrder.discount.toFixed(0)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg pt-4 border-t">
                    <span>Total</span>
                    <span className="text-primary">EGP {(pendingOrder.total + deliveryFee).toFixed(0)}</span>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full bg-primary hover:bg-primary/90 text-white"
                  onClick={handleSubmitOrder}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Processing..." : "Place Order"}
                </Button>
              </CardFooter>
            </Card>
          </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
