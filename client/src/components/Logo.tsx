
import { useCallback } from "react";
import { useLocation } from "wouter";
import logoImage from "@assets/Logo tm.png";

interface LogoProps {
  className?: string;
  color?: "dark" | "light";
}

const Logo = ({ className = "", color = "dark" }: LogoProps) => {
  const [location, navigate] = useLocation();
  
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    // Don't navigate away from checkout page
    if (location === '/checkout') {
      return;
    }
    navigate("/");
  }, [navigate, location]);
  
  return (
    <div 
      className={`flex items-center cursor-pointer ${className}`}
      onClick={handleClick}
      onKeyDown={(e) => e.key === 'Enter' && handleClick(e as any)}
      role="button"
      tabIndex={0}
    >
      <img 
        src={logoImage}
        alt="Wagba" 
        className="h-8"
        style={{ 
          filter: color === "dark" ? "invert(19%) sepia(83%) saturate(2160%) hue-rotate(353deg) brightness(92%) contrast(95%)" : "brightness(0) invert(1)"
        }}
      />
    </div>
  );
};

export default Logo;
