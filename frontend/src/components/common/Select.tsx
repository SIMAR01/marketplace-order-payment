import React, { forwardRef } from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', error = false, disabled, children, ...props }, ref) => {
    const baseStyles =
      'w-full px-4 py-2.5 bg-slate-800/80 border text-slate-100 rounded-lg outline-none transition-all duration-200 disabled:opacity-50 disabled:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 appearance-none';

    const stateStyles = error
      ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
      : 'border-slate-700 hover:border-slate-600 focus:border-indigo-500';

    return (
      <div className="relative w-full">
        <select
          ref={ref}
          disabled={disabled}
          className={`${baseStyles} ${stateStyles} pr-10 ${className}`}
          {...props}
        >
          {children}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
          <svg
            className="fill-current h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
          >
            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
          </svg>
        </div>
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;
