/**
 * Validates Egyptian mobile phone numbers
 * Egyptian mobile numbers format: +20 1XXXXXXXXX (11 digits total, 10 after country code)
 * Mobile numbers start with 1 followed by 9 digits
 */
export function validateEgyptianPhoneNumber(phone: string): { 
  isValid: boolean; 
  error?: string; 
  normalizedPhone?: string;
} {
  if (!phone) {
    return { isValid: false, error: 'Phone number is required' };
  }

  // Remove all non-digit characters and normalize
  const digitsOnly = phone.replace(/\D/g, '');
  
  // Handle different input formats
  let normalizedDigits = digitsOnly;
  
  // If starts with 20 (country code without +), remove it
  if (digitsOnly.startsWith('20') && digitsOnly.length === 12) {
    normalizedDigits = digitsOnly.substring(2);
  }
  
  // If starts with 0020, remove it
  if (digitsOnly.startsWith('0020') && digitsOnly.length === 14) {
    normalizedDigits = digitsOnly.substring(4);
  }

  // Check if it's exactly 10 digits and starts with 1
  if (normalizedDigits.length !== 10) {
    return { 
      isValid: false, 
      error: 'Egyptian mobile numbers must be 10 digits long' 
    };
  }

  if (!normalizedDigits.startsWith('1')) {
    return { 
      isValid: false, 
      error: 'Egyptian mobile numbers must start with 1' 
    };
  }

  // Additional validation for Egyptian mobile network prefixes
  const prefix = normalizedDigits.substring(0, 3);
  const validPrefixes = [
    '100', '101', '106', '109', '111', '112', '114', '115', '120', '121', '122', '123', '127', '128',
    '155', '156', '157', '158', '159', '150', '151', '152', '154'
  ];
  
  if (!validPrefixes.includes(prefix)) {
    return { 
      isValid: false, 
      error: 'Invalid Egyptian mobile network prefix' 
    };
  }

  return { 
    isValid: true, 
    normalizedPhone: `+20${normalizedDigits}` 
  };
}

/**
 * Formats Egyptian phone number for display
 */
export function formatEgyptianPhoneNumber(phone: string): string {
  const validation = validateEgyptianPhoneNumber(phone);
  if (validation.isValid && validation.normalizedPhone) {
    const digits = validation.normalizedPhone.substring(3); // Remove +20
    return `+20 ${digits.substring(0, 3)} ${digits.substring(3, 6)} ${digits.substring(6)}`;
  }
  return phone;
}