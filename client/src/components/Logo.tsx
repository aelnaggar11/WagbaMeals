import { useCallback } from "react";
import { useLocation } from "wouter";

interface LogoProps {
  className?: string;
  color?: "dark" | "light";
}

/**
 * Logo component that can be used throughout the application
 * No Link wrapping to avoid DOM nesting issues
 */
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
      role="button"
      tabIndex={0}
    >
      <svg width="120" height="30" viewBox="0 0 140 35" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12.5 5L5 20H20L12.5 5Z" fill={color === "dark" ? "#1E1B4B" : "#FFFFFF"} />
        <path d="M25 5L17.5 20H32.5L25 5Z" fill={color === "dark" ? "#1E1B4B" : "#FFFFFF"} />
        <path d="M37.5 5L30 20H45L37.5 5Z" fill={color === "dark" ? "#1E1B4B" : "#FFFFFF"} />
        <path d="M48 5H58C61.3137 5 64 7.68629 64 11V14C64 17.3137 61.3137 20 58 20H48V5Z" fill={color === "dark" ? "#1E1B4B" : "#FFFFFF"} />
        <path d="M69 5H84L79 12.5H69V5Z" fill={color === "dark" ? "#1E1B4B" : "#FFFFFF"} />
        <path d="M69 12.5H79L74 20H69V12.5Z" fill={color === "dark" ? "#1E1B4B" : "#FFFFFF"} />
        <path d="M89 5H99C102.314 5 105 7.68629 105 11V14C105 17.3137 102.314 20 99 20H89V5Z" fill={color === "dark" ? "#1E1B4B" : "#FFFFFF"} />
        <path d="M110 5H120C123.314 5 126 7.68629 126 11V14C126 17.3137 123.314 20 120 20H110V5Z" fill={color === "dark" ? "#1E1B4B" : "#FFFFFF"} />
        <text x="128" y="11" fontSize="10" fontFamily="Arial" fontWeight="bold" fill={color === "dark" ? "#1E1B4B" : "#FFFFFF"}>TM</text>
      </svg>
    </div>
  );
};

export default Logo;
