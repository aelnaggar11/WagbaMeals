import { useState } from 'react';
import { DeliverySlot } from '@shared/schema';

interface DeliverySlotSelectorProps {
  value: DeliverySlot;
  onChange: (slot: DeliverySlot) => void;
  className?: string;
}

export default function DeliverySlotSelector({ value, onChange, className = "" }: DeliverySlotSelectorProps) {
  console.log('DeliverySlotSelector render:', { value });
  
  return (
    <div className={`space-y-3 ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-3">
        Choose your delivery time
      </label>
      
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => {
            console.log('Morning button clicked');
            onChange('morning');
          }}
          className={`p-4 rounded-lg border-2 transition-all ${
            value === 'morning'
              ? 'border-primary bg-primary/5 text-primary'
              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
          }`}
        >
          <div className="text-center">
            <div className="text-lg font-semibold mb-1">Morning</div>
            <div className="text-sm opacity-75">9:00 AM - 12:00 PM</div>
          </div>
        </button>
        
        <button
          type="button"
          onClick={() => {
            console.log('Evening button clicked');
            onChange('evening');
          }}
          className={`p-4 rounded-lg border-2 transition-all ${
            value === 'evening'
              ? 'border-primary bg-primary/5 text-primary'
              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
          }`}
        >
          <div className="text-center">
            <div className="text-lg font-semibold mb-1">Evening</div>
            <div className="text-sm opacity-75">6:00 PM - 9:00 PM</div>
          </div>
        </button>
      </div>
    </div>
  );
}