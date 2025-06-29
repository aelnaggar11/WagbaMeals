import { PricingConfig } from "@shared/schema";

// Cache for pricing configurations to avoid repeated API calls
let pricingCache: Map<string, number> | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Initialize pricing cache with default values as fallback
const defaultPricing: Map<string, number> = new Map([
  ['meal_bundle_4_meals', 249],
  ['meal_bundle_5_meals', 239],
  ['meal_bundle_6_meals', 239],
  ['meal_bundle_7_meals', 219],
  ['meal_bundle_8_meals', 219],
  ['meal_bundle_9_meals', 219],
  ['meal_bundle_10_meals', 199],
  ['meal_bundle_11_meals', 199],
  ['meal_bundle_12_meals', 199],
  ['meal_bundle_13_meals', 199],
  ['meal_bundle_14_meals', 199],
  ['meal_bundle_15_meals', 199],
  ['delivery_base_delivery', 0],
  ['delivery_express_delivery', 30]
]);

export class PricingService {
  private static async fetchPricingConfigs(): Promise<Map<string, number>> {
    try {
      const response = await fetch('/api/pricing');
      if (!response.ok) {
        console.warn('Failed to fetch pricing configs, using default pricing');
        return defaultPricing;
      }
      
      const data = await response.json();
      const pricingMap = new Map<string, number>();
      
      data.pricingConfigs.forEach((config: PricingConfig) => {
        const key = `${config.configType}_${config.configKey}`;
        pricingMap.set(key, config.price);
      });
      
      return pricingMap;
    } catch (error) {
      console.warn('Error fetching pricing configs:', error);
      return defaultPricing;
    }
  }

  private static async ensurePricingCache(): Promise<Map<string, number>> {
    const now = Date.now();
    
    // Return cached pricing if it's still valid
    if (pricingCache && (now - cacheTimestamp) < CACHE_DURATION) {
      return pricingCache;
    }
    
    // Fetch fresh pricing data
    pricingCache = await this.fetchPricingConfigs();
    cacheTimestamp = now;
    
    return pricingCache;
  }

  // Clear cache to force refresh (useful after pricing updates)
  static clearCache(): void {
    pricingCache = null;
    cacheTimestamp = 0;
  }

  // Get price for meal count
  static async getPriceForMealCount(mealCount: number): Promise<number> {
    const pricing = await this.ensurePricingCache();
    const key = `meal_bundle_${mealCount}_meals`;
    return pricing.get(key) || defaultPricing.get(key) || 249; // fallback to base price
  }

  // Get delivery cost
  static async getDeliveryPrice(deliveryType: 'base_delivery' | 'express_delivery' = 'base_delivery'): Promise<number> {
    const pricing = await this.ensurePricingCache();
    const key = `delivery_${deliveryType}`;
    return pricing.get(key) || defaultPricing.get(key) || 0;
  }

  // Get all meal bundle pricing (for UI display)
  static async getAllMealPricing(): Promise<Map<number, number>> {
    const pricing = await this.ensurePricingCache();
    const mealPricing = new Map<number, number>();
    
    for (let count = 4; count <= 15; count++) {
      const key = `meal_bundle_${count}_meals`;
      const price = pricing.get(key) || defaultPricing.get(key) || 249;
      mealPricing.set(count, price);
    }
    
    return mealPricing;
  }

  // Calculate discount based on meal count vs base price
  static async calculateDiscount(mealCount: number, basePrice: number): Promise<number> {
    const pricePerMeal = await this.getPriceForMealCount(mealCount);
    return (basePrice - pricePerMeal) * mealCount;
  }

  // Synchronous versions for backward compatibility (uses cached data)
  static getPriceForMealCountSync(mealCount: number): number {
    if (!pricingCache) {
      return defaultPricing.get(`meal_bundle_${mealCount}_meals`) || 249;
    }
    const key = `meal_bundle_${mealCount}_meals`;
    return pricingCache.get(key) || defaultPricing.get(key) || 249;
  }

  static getDeliveryPriceSync(deliveryType: 'base_delivery' | 'express_delivery' = 'base_delivery'): number {
    if (!pricingCache) {
      return defaultPricing.get(`delivery_${deliveryType}`) || 0;
    }
    const key = `delivery_${deliveryType}`;
    return pricingCache.get(key) || defaultPricing.get(key) || 0;
  }
}

// Initialize cache on module load for better UX
PricingService.getAllMealPricing().catch(() => {
  // Silently handle initialization errors
});