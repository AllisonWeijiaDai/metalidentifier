import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  isLoading, 
  icon, 
  className = '', 
  disabled,
  ...props 
}) => {
  // Limbo Styling: High contrast, monochrome, slightly rough
  const baseStyles = "inline-flex items-center justify-center px-6 py-4 font-typewriter tracking-widest uppercase text-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed border-2";
  
  const variants = {
    // Solid Black with White Border. Hover -> Invert.
    primary: "bg-black text-neutral-200 border-neutral-200 hover:bg-neutral-200 hover:text-black hover:border-white shadow-[0_0_20px_rgba(255,255,255,0.1)]",
    
    // Transparent with thin border.
    secondary: "bg-transparent text-neutral-500 border-neutral-800 hover:text-neutral-200 hover:border-neutral-500",
    
    // Danger is just monochrome in Limbo world.
    danger: "bg-black text-neutral-400 border-neutral-600 hover:bg-neutral-900 hover:text-white hover:border-white",
    
    // Ghost
    ghost: "bg-transparent border-transparent text-neutral-500 hover:text-neutral-300"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin text-white" />}
      {!isLoading && icon && <span className="mr-3">{icon}</span>}
      {children}
    </button>
  );
};