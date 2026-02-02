import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string;
  onChange: (value: string) => void;
  /** Optional prefix like "R$" */
  prefix?: string;
}

/**
 * Formats a numeric string to Brazilian currency format (1.234,56)
 */
function formatToBRL(value: string): string {
  // Remove all non-numeric characters
  const numericOnly = value.replace(/\D/g, '');
  
  if (!numericOnly) return '';
  
  // Pad with zeros if needed (minimum 3 digits for XX,X format)
  const paddedValue = numericOnly.padStart(3, '0');
  
  // Split into integer and decimal parts
  const decimalPart = paddedValue.slice(-2);
  const integerPart = paddedValue.slice(0, -2).replace(/^0+/, '') || '0';
  
  // Add thousand separators (dots)
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  
  return `${formattedInteger},${decimalPart}`;
}

/**
 * Parses a BRL formatted string to a float number
 */
export function parseBRLToNumber(value: string): number {
  if (!value) return 0;
  // Remove dots (thousand separators) and replace comma with dot (decimal separator)
  const normalized = value.replace(/\./g, '').replace(',', '.');
  return parseFloat(normalized) || 0;
}

/**
 * Converts a number to BRL formatted string
 */
export function numberToBRL(value: number): string {
  if (value === 0) return '';
  // Convert to cents string and format
  const cents = Math.round(value * 100).toString();
  return formatToBRL(cents);
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onChange, prefix = 'R$', ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;
      const formatted = formatToBRL(rawValue);
      onChange(formatted);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Allow: backspace, delete, tab, escape, enter, arrows
      const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
      if (allowedKeys.includes(e.key)) return;
      
      // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
      if (e.ctrlKey || e.metaKey) return;
      
      // Only allow numeric input
      if (!/^\d$/.test(e.key)) {
        e.preventDefault();
      }
    };

    return (
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">
            {prefix}
          </span>
        )}
        <Input
          {...props}
          ref={ref}
          type="text"
          inputMode="numeric"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className={cn(prefix ? 'pl-10' : '', className)}
          placeholder="0,00"
        />
      </div>
    );
  }
);

CurrencyInput.displayName = 'CurrencyInput';

export { CurrencyInput };
