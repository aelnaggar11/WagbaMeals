import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  label?: string;
  className?: string;
  error?: string;
}

const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChange,
  disabled = false,
  required = false,
  placeholder = "1XXXXXXXXX",
  label = "Phone Number",
  className,
  error
}) => {
  const [phoneNumber, setPhoneNumber] = useState('');

  // Initialize phone number from value
  useEffect(() => {
    if (value) {
      // Remove +20 if present and extract the 10-digit number
      const cleanValue = value.replace(/^\+20/, '').replace(/\D/g, '');
      setPhoneNumber(cleanValue);
    }
  }, [value]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Only allow digits and limit to 10 characters
    const digitsOnly = inputValue.replace(/\D/g, '');
    const limitedDigits = digitsOnly.slice(0, 10);
    
    setPhoneNumber(limitedDigits);
    
    // Pass the complete Egyptian format to parent
    if (limitedDigits.length === 10) {
      onChange(`+20${limitedDigits}`);
    } else {
      onChange(limitedDigits ? `+20${limitedDigits}` : '');
    }
  };

  const isValid = phoneNumber.length === 10 && /^1[0-9]{9}$/.test(phoneNumber);
  const showError = error || (phoneNumber.length > 0 && !isValid && phoneNumber.length < 10);

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label htmlFor="phone-input">
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
      )}
      
      <div className="flex">
        {/* Country Code Display */}
        <div className="flex items-center px-3 py-2 bg-gray-50 border border-r-0 border-gray-300 rounded-l-md text-sm font-medium text-gray-700">
          +20
        </div>
        
        {/* Phone Number Input */}
        <Input
          id="phone-input"
          type="tel"
          value={phoneNumber}
          onChange={handlePhoneChange}
          disabled={disabled}
          placeholder={placeholder}
          className={cn(
            "rounded-l-none flex-1",
            showError && "border-red-500 focus:border-red-500",
            isValid && phoneNumber.length === 10 && "border-green-500 focus:border-green-500"
          )}
          maxLength={10}
        />
      </div>
      
      {/* Validation Messages */}
      {showError && (
        <p className="text-sm text-red-600">
          {error || (phoneNumber.length > 0 && phoneNumber.length < 10 
            ? `Enter ${10 - phoneNumber.length} more digit${10 - phoneNumber.length === 1 ? '' : 's'}`
            : "Phone number must start with 1 and be 10 digits long"
          )}
        </p>
      )}
      
      {isValid && (
        <p className="text-sm text-green-600">
          ✓ Valid Egyptian mobile number
        </p>
      )}
      
      {phoneNumber.length === 0 && (
        <p className="text-sm text-gray-500">
          Enter your Egyptian mobile number (10 digits starting with 1)
        </p>
      )}
    </div>
  );
};

export default PhoneInput;