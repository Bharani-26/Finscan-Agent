import React, { useState, useEffect } from 'react';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { Phone, AlertCircle, CheckCircle2 } from 'lucide-react';

const PhoneNumberInput = ({ 
  value, 
  onChange, 
  disabled = false, 
  defaultCountry = 'IN',
  onErrorChange 
}) => {
  const [touched, setTouched] = useState(false);

  // Check if number is valid (optional field: empty is allowed, non-empty must be valid)
  const isValid = !value || (typeof value === 'string' && isValidPhoneNumber(value));

  useEffect(() => {
    if (onErrorChange) {
      onErrorChange(!isValid);
    }
  }, [isValid, onErrorChange]);

  const handleChange = (newValue) => {
    setTouched(true);
    onChange(newValue || '');
  };

  const handleBlur = () => {
    setTouched(true);
  };

  return (
    <div style={{ width: '100%' }}>
      <div style={{ position: 'relative' }}>
        <PhoneInput
          international
          defaultCountry={defaultCountry}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          placeholder="Enter phone number"
          className="custom-phone-input"
        />
      </div>

      {/* Inline Validation Error */}
      {touched && value && !isValid && (
        <div style={{
          marginTop: '0.4rem',
          fontSize: '0.8rem',
          color: '#FCA5A5',
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem'
        }}>
          <AlertCircle size={14} style={{ flexShrink: 0 }} />
          <span>Please enter a valid phone number for the selected country</span>
        </div>
      )}
    </div>
  );
};

export { isValidPhoneNumber };
export default PhoneNumberInput;
