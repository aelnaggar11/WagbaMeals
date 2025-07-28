import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import { useQuery } from "@tanstack/react-query";
import { User, Admin } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import PreOnboardingModal from "@/components/PreOnboardingModal";

const Navigation = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showPreOnboardingModal, setShowPreOnboardingModal] = useState(false);
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  
  const { data: user } = useQuery<User | null>({
    queryKey: ['/api/auth/me'],
  });

  const { data: admin } = useQuery<Admin | null>({
    queryKey: ['/api/admin/auth/me'],
  });

  const isActive = (path: string) => {
    return location === path;
  };

  // Only show admin controls when on admin routes
  const isOnAdminRoute = location.startsWith('/admin');
  const showAdminNav = admin && isOnAdminRoute;

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const handleLogout = async () => {
    try {
      if (showAdminNav) {
        // Admin logout when on admin routes
        await apiRequest('POST', '/api/admin/auth/logout', {});
        queryClient.invalidateQueries({ queryKey: ['/api/admin/auth/me'] });
      } else {
        // User logout (for regular users or admins on user-facing pages)
        await apiRequest('POST', '/api/auth/logout', {});
        queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      }
      
      // Clear stored authentication tokens
      localStorage.removeItem('wagba_auth_token');
      localStorage.removeItem('wagba_admin_token');
      
      // Clear all queries to ensure proper logout
      queryClient.clear();
      
      // Show success message
      toast({
        title: "Logged Out",
        description: "You have successfully logged out."
      });
      
      // Navigate home
      navigate('/');
      
      // Force a page reload to clear any auth state in memory
      window.location.href = '/';
    } catch (error) {
      // Even if logout fails, clear the tokens and redirect
      localStorage.removeItem('wagba_auth_token');
      localStorage.removeItem('wagba_admin_token');
      queryClient.clear();
      
      toast({
        title: "Error",
        description: "There was an error logging out. Please try again.",
        variant: "destructive"
      });
      
      // Still redirect to clear any problematic state
      window.location.href = '/';
    }
  };

  // This is a workaround for wouter's Link component to avoid nesting <a> tags
  // It renders children directly without adding any extra DOM elements
  const NavLink = ({ href, className, onClick, children }: { 
    href: string; 
    className?: string; 
    onClick?: () => void;
    children: React.ReactNode;
  }) => (
    <Link href={href}>
      <span 
        className={`cursor-pointer ${className}`} 
        onClick={onClick}
        role="link"
        tabIndex={0}
      >
        {children}
      </span>
    </Link>
  );

  return (
    <header 
      className="sticky top-0 z-50 shadow-md relative"
      style={{ 
        backgroundColor: '#A80906',
        backgroundImage: 'url("/attached_assets/Header BG Pattern_1753742643683.png")',
        backgroundRepeat: 'repeat',
        backgroundSize: '30px 30px',
        backgroundBlendMode: 'overlay',
        opacity: 0.9
      }}
    >
      <div className="container mx-auto px-4 py-3 flex justify-between items-center relative z-10">
        <div className="flex items-center">
          <Logo color="light" />
        </div>
        
        <nav className="hidden md:flex space-x-8">
        </nav>
        
        <div className="flex items-center space-x-4">
          {showAdminNav ? (
            <>
              <span className="text-sm text-white font-medium">
                Admin
              </span>
              <Button 
                variant="outline" 
                className="text-white border-white hover:bg-white hover:text-primary font-medium"
                onClick={handleLogout}
              >
                Log Out
              </Button>
            </>
          ) : user ? (
            <>
              <NavLink 
                href="/account"
                className="text-white hover:text-gray-200 font-medium"
              >
                My Account
              </NavLink>
              <Button 
                variant="ghost" 
                className="text-white hover:bg-white hover:text-primary font-medium"
                onClick={handleLogout}
              >
                Logout
              </Button>
            </>
          ) : (
            <>
              <NavLink
                href="/auth?tab=login&skip_progress=true"
                className="text-white hover:text-gray-200 font-medium"
              >
                Login
              </NavLink>
              <Button 
                variant="default" 
                className="bg-white text-primary hover:bg-gray-100"
                onClick={() => setShowPreOnboardingModal(true)}
              >
                Get Started
              </Button>
            </>
          )}
        </div>
      </div>
      
      {/* Pre-onboarding Modal */}
      <PreOnboardingModal
        isOpen={showPreOnboardingModal}
        onClose={() => setShowPreOnboardingModal(false)}
        onSuccess={(email) => {
          navigate('/meal-plans');
        }}
      />
    </header>
  );
};

export default Navigation;
