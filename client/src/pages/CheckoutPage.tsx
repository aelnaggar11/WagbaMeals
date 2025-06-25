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

const CheckoutPage = () => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  
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
  
  // Fetch user profile for delivery address
  const { data: userProfile } = useQuery<{
    name: string;
    email: string;
    phone: string;
    address: string;
  }>({
    queryKey: ['/api/user/profile'],
  });

  // Fetch neighborhoods for dropdown
  const { data: neighborhoodsData } = useQuery<{ neighborhoods: Array<{ id: number; name: string; isServiced: boolean }> }>({
    queryKey: ['/api/neighborhoods'],
  });

  const servicedNeighborhoods = neighborhoodsData?.neighborhoods.filter(n => n.isServiced) || [];
  
  // Form state for delivery address
  const [address, setAddress] = useState({
    name: "",
    street: "",
    apartment: "",
    building: "",
    area: "",
    landmark: "",
    phone: ""
  });
  
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
    const preOnboardingNeighborhood = sessionStorage.getItem('preOnboardingNeighborhood');
    console.log('=== NEIGHBORHOOD PRE-POPULATION DEBUG ===');
    console.log('Stored neighborhood:', preOnboardingNeighborhood);
    console.log('Current address.area:', address.area);
    console.log('Serviced neighborhoods loaded:', servicedNeighborhoods.length);
    console.log('Serviced neighborhoods:', servicedNeighborhoods.map(n => n.name));
    
    if (preOnboardingNeighborhood && servicedNeighborhoods.length > 0 && !address.area) {
      // Check if the neighborhood from modal is in our serviced list
      const matchingNeighborhood = servicedNeighborhoods.find(n => n.name === preOnboardingNeighborhood);
      console.log('Matching neighborhood found:', matchingNeighborhood);
      
      if (matchingNeighborhood) {
        console.log('✅ Pre-populating neighborhood:', preOnboardingNeighborhood);
        setAddress(prev => {
          const newAddress = { ...prev, area: preOnboardingNeighborhood };
          console.log('New address state:', newAddress);
          return newAddress;
        });
      } else {
        console.log('❌ Neighborhood not in serviced list');
      }
    } else {
      console.log('❌ Conditions not met:', {
        hasStoredNeighborhood: !!preOnboardingNeighborhood,
        hasServicedNeighborhoods: servicedNeighborhoods.length > 0,
        addressAreaEmpty: !address.area
      });
    }
    console.log('=== END DEBUG ===');
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
            
            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Method</CardTitle>
              </CardHeader>
              <CardContent>
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
                    <span>EGP 0.00</span>
                  </div>
                  {pendingOrder.discount > 0 && (
                    <div className="flex justify-between text-accent">
                      <span>Discount</span>
                      <span>-EGP {pendingOrder.discount.toFixed(0)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg pt-4 border-t">
                    <span>Total</span>
                    <span className="text-primary">EGP {pendingOrder.total.toFixed(0)}</span>
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
