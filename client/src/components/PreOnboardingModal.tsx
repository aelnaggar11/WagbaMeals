import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Neighborhood } from "@shared/schema";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

interface PreOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (email: string) => void;
}

interface ValidationResponse {
  success: boolean;
  message: string;
}

const PreOnboardingModal = ({ isOpen, onClose, onSuccess }: PreOnboardingModalProps) => {
  const [email, setEmail] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [invitationCode, setInvitationCode] = useState("");
  const [step, setStep] = useState<"form" | "success" | "rejected">("form");
  const [rejectionMessage, setRejectionMessage] = useState("");
  const { toast } = useToast();

  // Fetch serviced neighborhoods
  const { data: neighborhoodsData } = useQuery<{ neighborhoods: Neighborhood[] }>({
    queryKey: ['/api/neighborhoods/serviced'],
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
      if (data.success) {
        setStep("success");
        // Store email in sessionStorage for later use
        sessionStorage.setItem('preOnboardingEmail', email);
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
    
    if (!email || !neighborhood || !invitationCode) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }

    validateMutation.mutate({ email, neighborhood, invitationCode });
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
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
              />
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
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-gray-600">
              Great! You're eligible for Wagba. Let's get you set up with an account.
            </p>
            <Button onClick={handleSuccess} className="w-full">
              Continue to Sign Up
            </Button>
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