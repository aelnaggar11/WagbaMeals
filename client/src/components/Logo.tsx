
import { useCallback } from "react";
import { useLocation } from "wouter";

interface LogoProps {
  className?: string;
  color?: "dark" | "light";
}

const Logo = ({ className = "", color = "dark" }: LogoProps) => {
  const [, navigate] = useLocation();
  
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    navigate("/");
  }, [navigate]);
  
  return (
    <div 
      className={`flex items-center cursor-pointer ${className}`}
      onClick={handleClick}
      onKeyDown={(e) => e.key === 'Enter' && handleClick(e as any)}
      role="button"
      tabIndex={0}
    >
      <img 
        src="/attached_assets/image_1747602753968.png" 
        alt="Wagba" 
        className="h-8"
        style={{ filter: `brightness(0) saturate(100%) invert(8%) sepia(78%) saturate(5436%) hue-rotate(356deg) brightness(95%) contrast(94%)` }}
      />
    </div>
  );
};

export default Logo;
