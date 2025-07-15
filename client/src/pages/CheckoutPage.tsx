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
import { PricingService } from "@/lib/pricingService";

const CheckoutPage = () => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderType, setOrderType] = useState<"trial" | "subscription">("subscription");
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [deliveryFee, setDeliveryFee] = useState(0);
  
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
      // Always navigate back to account page for checkout
      navigate('/account');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [navigate]);

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
    
    setIsSubmitting(true);
    
    try {
      await apiRequest('POST', '/api/orders/checkout', {
        orderId: pendingOrder?.id,
        paymentMethod,
        orderType,
        address,
        deliveryNotes
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      
      toast({
        title: "Order placed successfully!",
        description: "Your meals will be delivered on the scheduled delivery date.",
        variant: "default"
      });
      
      // Redirect to account page
      navigate('/account');
    } catch (error) {
      toast({
        title: "Error placing order",
        description: "There was a problem processing your order. Please try again.",
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
          onClick={() => window.history.back()}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Account
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
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input 
                      id="phone" 
                      name="phone" 
                      value={address.phone} 
                      onChange={handleAddressChange} 
                      placeholder="Phone number for delivery" 
                      required
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
                      <div className="text-blue-600 font-medium">💰 Save 10% on all orders</div>
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
                        <TabsTrigger value="instapay">InstaPay (+7%)</TabsTrigger>
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
                      
                      <TabsContent value="instapay">
                        <p className="text-gray-600">Pay securely using InstaPay. A 7% processing fee will be added to your total.</p>
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
