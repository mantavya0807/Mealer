import React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Select items...",
  className = ""
}) {
  const [open, setOpen] = React.useState(false);
  const selected = value.map(v => v.value);

  return (
    <div className={`relative ${className}`}>
      <div
        onClick={() => setOpen(!open)}
        className="flex min-h-10 w-full items-center justify-between rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-gray-200 cursor-pointer"
      >
        <div className="flex gap-1 flex-wrap">
          {value.length === 0 && <span className="text-gray-400">{placeholder}</span>}
          {value.map((item) => (
            <span
              key={item.value}
              className="bg-gray-600 rounded-md px-2 py-1"
            >
              {item.label}
            </span>
          ))}
        </div>
        <ChevronsUpDown className="h-4 w-4 opacity-50" />
      </div>

      {open && (
        <div className="absolute z-10 w-full mt-1 p-1 bg-gray-800 border border-gray-700 rounded-md shadow-lg">
          {options.map((option) => (
            <div
              key={option.value}
              className={`flex items-center px-2 py-1.5 text-sm text-gray-200 rounded cursor-pointer hover:bg-gray-700 ${
                selected.includes(option.value) ? 'bg-gray-700' : ''
              }`}
              onClick={() => {
                const newValue = selected.includes(option.value)
                  ? value.filter(v => v.value !== option.value)
                  : [...value, option];
                onChange(newValue);
              }}
            >
              <Check
                className={`mr-2 h-4 w-4 ${
                  selected.includes(option.value) ? "opacity-100" : "opacity-0"
                }`}
              />
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}