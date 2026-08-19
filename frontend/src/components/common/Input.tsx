import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', error = false, disabled, ...props }, ref) => {
    const baseStyles =
      'w-full px-4 py-2.5 bg-slate-800/80 border text-slate-100 rounded-lg outline-none transition-all duration-200 placeholder-slate-500 disabled:opacity-50 disabled:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20';

    const stateStyles = error
      ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
      : 'border-slate-700 hover:border-slate-600 focus:border-indigo-500';

    return (
      <input
        ref={ref}
        disabled={disabled}
        className={`${baseStyles} ${stateStyles} ${className}`}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

export default Input;
