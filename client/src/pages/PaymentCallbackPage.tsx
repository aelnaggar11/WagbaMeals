import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

type PaymentStatus = "processing" | "success" | "error";

export default function PaymentCallbackPage() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<PaymentStatus>("processing");
  const [message, setMessage] = useState("Processing your payment...");

  useEffect(() => {
    async function verifyPayment() {
      try {
        // Get all URL parameters from Paymob
        const urlParams = new URLSearchParams(window.location.search);
        
        // Call our backend API to verify the payment
        const response = await fetch(`/api/payments/paymob/response?${urlParams.toString()}`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();

        if (response.ok && data.success) {
          setStatus("success");
          setMessage("Payment completed successfully!");
          
          // Redirect to account page after 2 seconds
          setTimeout(() => {
            // Try to break out of iframe if present, otherwise use regular navigation
            try {
              if (window.top && window.top !== window) {
                window.top.location.href = '/account';
              } else {
                window.location.href = '/account';
              }
            } catch {
              // Fallback if iframe access is blocked
              window.location.href = '/account';
            }
          }, 2000);
        } else {
          throw new Error(data.message || "Payment verification failed");
        }
      } catch (error) {
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "An error occurred while processing your payment");
        
        // Redirect to account page after 4 seconds even on error
        setTimeout(() => {
          try {
            if (window.top && window.top !== window) {
              window.top.location.href = '/account';
            } else {
              window.location.href = '/account';
            }
          } catch {
            window.location.href = '/account';
          }
        }, 4000);
      }
    }

    verifyPayment();
  }, [setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800">
      <div className="bg-white rounded-2xl shadow-2xl p-12 max-w-md w-full mx-4">
        <div className="flex flex-col items-center text-center space-y-6">
          {/* Icon */}
          {status === "processing" && (
            <Loader2 className="w-16 h-16 text-purple-600 animate-spin" />
          )}
          {status === "success" && (
            <CheckCircle2 className="w-16 h-16 text-green-500" />
          )}
          {status === "error" && (
            <XCircle className="w-16 h-16 text-red-500" />
          )}

          {/* Title */}
          <h1 className={`text-2xl font-bold ${
            status === "processing" ? "text-gray-900" :
            status === "success" ? "text-green-600" :
            "text-red-600"
          }`}>
            {status === "processing" && "Processing Payment"}
            {status === "success" && "Payment Successful!"}
            {status === "error" && "Payment Error"}
          </h1>

          {/* Message */}
          <p className="text-gray-600 text-base">
            {message}
          </p>

          {/* Additional info based on status */}
          {status === "processing" && (
            <p className="text-sm text-gray-500">
              Please wait while we verify your payment...
            </p>
          )}
          {status === "success" && (
            <p className="text-sm text-gray-500">
              Redirecting you to your account...
            </p>
          )}
          {status === "error" && (
            <p className="text-sm text-gray-500">
              You will be redirected to your account shortly.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
