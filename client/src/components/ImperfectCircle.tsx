import React from "react";

interface ImperfectCircleProps {
  className?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  color?: string;
  opacity?: number;
}

const ImperfectCircle: React.FC<ImperfectCircleProps> = ({
  className = "",
  size = "md",
  color = "#A80906",
  opacity = 1,
}) => {
  const sizeClasses = {
    xs: "w-16 h-16",
    sm: "w-24 h-24",
    md: "w-32 h-32",
    lg: "w-48 h-48", 
    xl: "w-64 h-64",
    "2xl": "w-80 h-80",
  };

  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      <svg viewBox="0 0 300 300" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path 
          d="M224.9 275.1C191.5 308.5 134.2 308.5 100.8 275.1C67.4 241.7 67.7 186.3 100.8 152.9C133.9 119.5 191.5 121.5 224.9 154.9C258.3 188.3 258.3 241.7 224.9 275.1Z"
          fill={color}
          opacity={opacity}
        />
      </svg>
    </div>
  );
};

export default ImperfectCircle;
