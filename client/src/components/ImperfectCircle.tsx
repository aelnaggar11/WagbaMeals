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
    <div className={`${sizeClasses[size]} ${className} animate-rotate-slow`}>
      <img 
        src="/attached_assets/imperfect circle.png" 
        alt="Imperfect Circle" 
        className="w-full h-full object-contain"
        style={{ opacity }}
      />
    </div>
  );
};

export default ImperfectCircle;
