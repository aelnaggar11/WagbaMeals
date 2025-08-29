import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Neighborhood } from "@shared/schema";
import { Loader2, CheckCircle, XCircle, Check, X } from "lucide-react";

interface PreOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (email: string) => void;
}

interface ValidationResponse {
  success: boolean;
  message: string;
  redirectToLogin?: boolean;
}

const PreOnboardingModal = ({ isOpen, onClose, onSuccess }: PreOnboardingModalProps) => {
  const [email, setEmail] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [invitationCode, setInvitationCode] = useState("");
  const [step, setStep] = useState<"form" | "success" | "rejected">("form");
  const [rejectionMessage, setRejectionMessage] = useState("");
  const [neighborhoodError, setNeighborhoodError] = useState("");
  const [emailError, setEmailError] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Clear existing authentication state before validation
  const clearAuthMutation = useMutation({
    mutationFn: async () => {
      try {
        await apiRequest('POST', '/api/auth/logout');
        console.log('Previous authentication state cleared successfully');
      } catch (error) {
        // Ignore logout errors - might not be logged in
        console.log('Logout attempt (expected if no existing session):', error);
      }
      
      // Also clear authentication cookies from browser
      document.cookie = 'wagba_auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax';
      document.cookie = 'connect.sid=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax';
      
      // Clear authentication tokens from localStorage (these are used in Authorization headers)
      localStorage.removeItem('wagba_auth_token');
      localStorage.removeItem('wagba_admin_token');
      
      console.log('Browser authentication cookies and localStorage tokens cleared');
    },
    onSuccess: () => {
      // Clear all cached queries to ensure fresh state
      queryClient.clear();
      console.log('Query cache cleared for fresh onboarding experience');
    }
  });

  // Fetch all neighborhoods (not just serviced ones)
  const { data: neighborhoodsData } = useQuery<{ neighborhoods: Neighborhood[] }>({
    queryKey: ['/api/neighborhoods'],
    enabled: isOpen,
  });

  const neighborhoods = neighborhoodsData?.neighborhoods || [];

  // Validation mutation
  const validateMutation = useMutation({
    mutationFn: async (data: { email: string; neighborhood: string; invitationCode: string }) => {
      console.log('Sending validation request:', data);
      const response = await apiRequest('POST', '/api/pre-onboarding/validate', data);
      console.log('Validation response:', response);
      return response as ValidationResponse;
    },
    onSuccess: (data) => {
      console.log('Success handler called with:', data);
      console.log('Storing neighborhood value:', neighborhood);
      
      if (data.success) {
        setStep("success");
        // Clear any previous errors
        setEmailError("");
        
        // Store email and neighborhood in localStorage for persistence across navigation
        localStorage.setItem('preOnboardingEmail', email);
        localStorage.setItem('preOnboardingNeighborhood', neighborhood);
        sessionStorage.setItem('preOnboardingEmail', email);
        sessionStorage.setItem('preOnboardingNeighborhood', neighborhood);
        
        // Verify storage immediately
        const storedNeighborhood = localStorage.getItem('preOnboardingNeighborhood');
        console.log('Verified stored neighborhood in localStorage:', storedNeighborhood);
        
        // Auto-redirect after 2 seconds, but preserve sessionStorage
        setTimeout(() => {
          // Double-check storage before redirect
          const finalCheck = localStorage.getItem('preOnboardingNeighborhood');
          console.log('Final storage check before redirect (localStorage):', finalCheck);
          handleSuccess();
        }, 2000);
      } else if (data.redirectToLogin) {
        // Show inline error instead of redirecting
        setEmailError("This email is already registered. Please use a different email or login with your existing account.");
      } else {
        setStep("rejected");
        setRejectionMessage(data.message);
      }
    },
    onError: (error) => {
      console.error('Validation error:', error);
      toast({
        title: "Error",
        description: "Failed to validate your information. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setNeighborhoodError("");
    
    if (!email || !neighborhood || !invitationCode) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields to continue.",
        variant: "destructive",
      });
      return;
    }

    // Check if selected neighborhood is serviced
    const selectedNeighborhood = neighborhoods.find(n => n.name === neighborhood);
    if (selectedNeighborhood && !selectedNeighborhood.isServiced) {
      setNeighborhoodError(`Sorry, we don't currently deliver to ${neighborhood}. We've added you to our waitlist and will notify you when we expand service to your area.`);
      // Still proceed with validation to add to waitlist
    }

    // First clear any existing authentication state, then validate
    console.log('Clearing existing authentication state before onboarding...');
    clearAuthMutation.mutate(undefined, {
      onSettled: () => {
        // Proceed with validation regardless of logout success/failure
        console.log('Proceeding with new user validation...');
        validateMutation.mutate({ email, neighborhood, invitationCode });
      }
    });
  };

  const handleSuccess = () => {
    onSuccess(email);
    onClose();
  };

  const handleRejectionClose = () => {
    onClose();
  };

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setEmail("");
      setNeighborhood("");
      setInvitationCode("");
      setStep("form");
      setRejectionMessage("");
      setNeighborhoodError("");
      setEmailError("");
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            {step === "form" && "Join Wagba"}
            {step === "success" && "Welcome to Wagba!"}
            {step === "rejected" && "We're Not There Yet"}
          </DialogTitle>
        </DialogHeader>

        {step === "form" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  // Clear email error when user starts typing
                  if (emailError) setEmailError("");
                }}
                placeholder="your@email.com"
                required
                className={emailError ? "border-red-500" : ""}
              />
              {emailError && (
                <p className="text-sm text-red-600 mt-1">{emailError}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="neighborhood">Neighborhood</Label>
              <Select value={neighborhood} onValueChange={setNeighborhood} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select your neighborhood" />
                </SelectTrigger>
                <SelectContent>
                  {neighborhoods.map((n) => (
                    <SelectItem key={n.id} value={n.name}>
                      {n.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {neighborhoodError && (
                <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                  {neighborhoodError}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="invitationCode">Invitation Code</Label>
              <Input
                id="invitationCode"
                type="text"
                value={invitationCode}
                onChange={(e) => setInvitationCode(e.target.value.toUpperCase())}
                placeholder="Enter invitation code"
                required
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={validateMutation.isPending}
                className="flex-1"
              >
                {validateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  "Continue"
                )}
              </Button>
            </div>
          </form>
        )}

        {step === "success" && (
          <div className="text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold text-green-700">Welcome to Wagba!</h3>
              <p className="text-gray-600 mt-2">
                Great! You're eligible for Wagba. Redirecting you to meal plans...
              </p>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-gray-500">Taking you to the next step</span>
            </div>
          </div>
        )}

        {step === "rejected" && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <X className="w-8 h-8 text-red-600" />
            </div>
            <p className="text-gray-600">
              {rejectionMessage}
            </p>
            <Button onClick={handleRejectionClose} variant="outline" className="w-full">
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PreOnboardingModal;