import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronsUpDown, User } from 'lucide-react';

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Select items...",
  className = ""
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const selected = value.map(v => v.value || v);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div
        onClick={() => setOpen(!open)}
        className="flex min-h-10 w-full items-center justify-between rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-gray-200 cursor-pointer"
      >
        <div className="flex gap-1 flex-wrap">
          {value.length === 0 ? (
            <span className="text-gray-400">{placeholder}</span>
          ) : (
            value.map((item) => (
              <span
                key={item.value || item}
                className="bg-gray-600 rounded-md px-2 py-1 flex items-center"
              >
                <User className="h-3 w-3 mr-1" />
                {item.label || item}
              </span>
            ))
          )}
        </div>
        <ChevronsUpDown className="h-4 w-4 opacity-50" />
      </div>

      {open && (
        <div className="absolute z-10 w-full mt-1 p-1 bg-gray-800 border border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto">
          {options.map((option) => {
            const optionValue = option.value || option;
            const optionLabel = option.label || option;
            
            return (
              <div
                key={optionValue}
                className={`flex items-center px-2 py-1.5 text-sm text-gray-200 rounded cursor-pointer hover:bg-gray-700 ${
                  selected.includes(optionValue) ? 'bg-gray-700' : ''
                }`}
                onClick={() => {
                  const newValue = selected.includes(optionValue)
                    ? value.filter(v => (v.value || v) !== optionValue)
                    : [...value, option];
                  onChange(newValue);
                }}
              >
                <Check
                  className={`mr-2 h-4 w-4 ${
                    selected.includes(optionValue) ? "opacity-100" : "opacity-0"
                  }`}
                />
                <User className="h-3 w-3 mr-1 opacity-70" />
                {optionLabel}
              </div>
            );
          })}
          
          {options.length === 0 && (
            <div className="px-2 py-2 text-sm text-gray-400 text-center">
              No options available
            </div>
          )}
        </div>
      )}
    </div>
  );
}