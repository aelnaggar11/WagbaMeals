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

  return (
    <header className="sticky top-0 z-50 bg-white shadow-md">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center">
          <Logo linkWrapped={true} />
        </div>
        
        <nav className="hidden md:flex space-x-8">
          <Link href="/#how-it-works">
            <a className={`text-gray-700 hover:text-primary font-medium ${isActive("/#how-it-works") ? "text-primary" : ""}`}>
              How It Works
            </a>
          </Link>
          <Link href="/meal-plans">
            <a className={`text-gray-700 hover:text-primary font-medium ${isActive("/meal-plans") ? "text-primary" : ""}`}>
              Pricing
            </a>
          </Link>
          <Link href="/menu/current">
            <a className={`text-gray-700 hover:text-primary font-medium ${location.startsWith("/menu") ? "text-primary" : ""}`}>
              Menu
            </a>
          </Link>
          <Link href="/about">
            <a className={`text-gray-700 hover:text-primary font-medium ${isActive("/about") ? "text-primary" : ""}`}>
              About Us
            </a>
          </Link>
        </nav>
        
        <div className="flex items-center space-x-4">
          {user ? (
            <>
              <Link href="/account">
                <a className="hidden md:inline-block text-accent-foreground hover:text-primary font-medium">
                  My Account
                </a>
              </Link>
              {user.isAdmin && (
                <Link href="/admin">
                  <a className="hidden md:inline-block text-accent-foreground hover:text-primary font-medium">
                    Admin
                  </a>
                </Link>
              )}
            </>
          ) : (
            <Link href="/auth">
              <a className="hidden md:inline-block text-accent-foreground hover:text-primary font-medium">
                Log In
              </a>
            </Link>
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
            <Link href="/#how-it-works">
              <a className="text-gray-700 hover:text-primary font-medium py-2" onClick={() => setMobileMenuOpen(false)}>
                How It Works
              </a>
            </Link>
            <Link href="/meal-plans">
              <a className="text-gray-700 hover:text-primary font-medium py-2" onClick={() => setMobileMenuOpen(false)}>
                Pricing
              </a>
            </Link>
            <Link href="/menu/current">
              <a className="text-gray-700 hover:text-primary font-medium py-2" onClick={() => setMobileMenuOpen(false)}>
                Menu
              </a>
            </Link>
            <Link href="/about">
              <a className="text-gray-700 hover:text-primary font-medium py-2" onClick={() => setMobileMenuOpen(false)}>
                About Us
              </a>
            </Link>
            <Link href="/auth">
              <a className="text-accent-foreground hover:text-primary font-medium py-2" onClick={() => setMobileMenuOpen(false)}>
                Log In
              </a>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navigation;
