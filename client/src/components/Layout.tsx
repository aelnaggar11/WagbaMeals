
import { ReactNode } from "react";
import { useLocation } from "wouter";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const [location] = useLocation();
  
  // Hide navbar on flow pages
  const hideNavbar = [
    '/meal-plans',
    '/menu',
    '/auth',
    '/checkout'
  ].some(path => location.startsWith(path));

  return (
    <div className="flex flex-col min-h-screen">
      {!hideNavbar && <Navigation />}
      <main className="flex-grow">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
