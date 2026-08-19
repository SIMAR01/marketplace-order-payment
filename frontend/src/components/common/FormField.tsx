import React from 'react';

interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  required = false,
  htmlFor,
  className = '',
  children,
}) => {
  return (
    <div className={`flex flex-col space-y-1.5 w-full ${className}`}>
      <div className="flex justify-between items-center">
        <label
          htmlFor={htmlFor}
          className="text-xs font-semibold uppercase tracking-wider text-slate-400"
        >
          {label}
          {required && <span className="ml-1 text-red-400">*</span>}
        </label>
      </div>
      {children}
      {error && (
        <span className="text-xs text-red-400 font-medium" role="alert">
          {error}
        </span>
      )}
    </div>
  );
};

export default FormField;
