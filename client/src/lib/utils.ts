import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { PricingService } from "./pricingService";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return `EGP ${amount.toFixed(0)}`;
}

export function calculateDiscount(mealCount: number, basePrice: number): number {
  // Apply quantity-based discounts using dynamic pricing
  const pricePerMeal = PricingService.getPriceForMealCountSync(mealCount);
  return (basePrice - pricePerMeal) * mealCount;
}

export function getPriceForMealCount(mealCount: number): number {
  // Use dynamic pricing service with fallback
  return PricingService.getPriceForMealCountSync(mealCount);
}

export function formatDate(date: Date | string): string {
  if (typeof date === 'string') {
    date = new Date(date);
  }
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date);
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

// Convert order status to badge style
export function getStatusClass(status: string): string {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'confirmed':
      return 'bg-blue-100 text-blue-800';
    case 'delivered':
      return 'bg-green-100 text-green-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

// Check if a deadline has passed
export function hasDeadlinePassed(deadline: string | Date): boolean {
  const deadlineDate = typeof deadline === 'string' ? new Date(deadline) : deadline;
  return new Date() > deadlineDate;
}

// Generate SVG path for imperfect circle
export function getImperfectCirclePath(): string {
  return "M224.9 275.1C191.5 308.5 134.2 308.5 100.8 275.1C67.4 241.7 67.7 186.3 100.8 152.9C133.9 119.5 191.5 121.5 224.9 154.9C258.3 188.3 258.3 241.7 224.9 275.1Z";
}
