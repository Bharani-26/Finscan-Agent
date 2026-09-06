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

      {touched && value && !isValid && (
        <div className="flex items-center gap-2 text-red-400" style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>
          <AlertCircle size={14} />
          <span>Please enter a valid phone number for the selected country</span>
        </div>
      )}
    </div>
  );
};

export { isValidPhoneNumber };
export default PhoneNumberInput;
