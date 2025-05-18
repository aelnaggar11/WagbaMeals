import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";

const Navigation = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [location] = useLocation();
  
  const { data: user } = useQuery<User | null>({
    queryKey: ['/api/auth/me'],
  });

  const isActive = (path: string) => {
    return location === path;
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
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
    <header className="sticky top-0 z-50 bg-white shadow-md">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center">
          <Logo />
        </div>
        
        <nav className="hidden md:flex space-x-8">
          <NavLink 
            href="/#how-it-works"
            className={`text-gray-700 hover:text-primary font-medium ${isActive("/#how-it-works") ? "text-primary" : ""}`}
          >
            How It Works
          </NavLink>
          <NavLink 
            href="/meal-plans"
            className={`text-gray-700 hover:text-primary font-medium ${isActive("/meal-plans") ? "text-primary" : ""}`}
          >
            Pricing
          </NavLink>
          <NavLink 
            href="/menu/current"
            className={`text-gray-700 hover:text-primary font-medium ${location.startsWith("/menu") ? "text-primary" : ""}`}
          >
            Menu
          </NavLink>
          <NavLink 
            href="/about"
            className={`text-gray-700 hover:text-primary font-medium ${isActive("/about") ? "text-primary" : ""}`}
          >
            About Us
          </NavLink>
        </nav>
        
        <div className="flex items-center space-x-4">
          {user ? (
            <>
              <NavLink 
                href="/account"
                className="hidden md:inline-block text-accent-foreground hover:text-primary font-medium"
              >
                My Account
              </NavLink>
              {user.isAdmin && (
                <NavLink
                  href="/admin"
                  className="hidden md:inline-block text-accent-foreground hover:text-primary font-medium"
                >
                  Admin
                </NavLink>
              )}
            </>
          ) : (
            <NavLink
              href="/auth"
              className="hidden md:inline-block text-accent-foreground hover:text-primary font-medium"
            >
              Log In
            </NavLink>
          )}
          
          <Link href={user ? "/account" : "/auth"}>
            <Button variant="default" className="bg-primary hover:bg-primary/90 text-white">
              {user ? "My Meals" : "Sign Up"}
            </Button>
          </Link>
          
          <button className="md:hidden text-gray-700 focus:outline-none" onClick={toggleMobileMenu}>
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>
      
      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t">
          <div className="container mx-auto px-4 py-3 flex flex-col space-y-4">
            <NavLink
              href="/#how-it-works"
              className="text-gray-700 hover:text-primary font-medium py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              How It Works
            </NavLink>
            <NavLink
              href="/meal-plans"
              className="text-gray-700 hover:text-primary font-medium py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Pricing
            </NavLink>
            <NavLink
              href="/menu/current"
              className="text-gray-700 hover:text-primary font-medium py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Menu
            </NavLink>
            <NavLink
              href="/about"
              className="text-gray-700 hover:text-primary font-medium py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              About Us
            </NavLink>
            <NavLink
              href="/auth"
              className="text-accent-foreground hover:text-primary font-medium py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Log In
            </NavLink>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navigation;
