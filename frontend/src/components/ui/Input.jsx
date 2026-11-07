import { forwardRef } from 'react';

export const Field = ({
  label,
  required = false,
  hint,
  error,
  children,
  className = '',
  id,
}) => {
  return (
    <div className={`flex flex-col ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-medium text-ink mb-1.5"
        >
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      {children}
      {hint && !error && (
        <p className="text-xs text-muted mt-1">{hint}</p>
      )}
      {error && (
        <p className="text-xs text-red-600 mt-1">{error}</p>
      )}
    </div>
  );
};

export const Input = forwardRef(function Input(
  {
    label,
    required,
    hint,
    error,
    id,
    icon: Icon,
    rightSlot,
    className = '',
    containerClassName = '',
    ...props
  },
  ref
) {
  const inputId = id || props.name;

  return (
    <Field
      label={label}
      required={required}
      hint={hint}
      error={error}
      id={inputId}
      className={containerClassName}
    >
      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-3.5 pointer-events-none text-muted">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full px-3.5 py-2.5 bg-surface border rounded-lg text-sm text-ink placeholder:text-muted/60 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent disabled:bg-canvas disabled:text-muted ${
            error ? 'border-red-300 focus:ring-red-500' : 'border-border'
          } ${Icon ? 'pl-10' : ''} ${rightSlot ? 'pr-10' : ''} ${className}`}
          {...props}
        />
        {rightSlot && (
          <div className="absolute right-3 flex items-center">
            {rightSlot}
          </div>
        )}
      </div>
    </Field>
  );
});

export const Select = forwardRef(function Select(
  {
    label,
    required,
    hint,
    error,
    id,
    icon: Icon,
    children,
    className = '',
    containerClassName = '',
    ...props
  },
  ref
) {
  const selectId = id || props.name;

  return (
    <Field
      label={label}
      required={required}
      hint={hint}
      error={error}
      id={selectId}
      className={containerClassName}
    >
      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-3.5 pointer-events-none text-muted">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`w-full px-3.5 py-2.5 bg-surface border rounded-lg text-sm text-ink transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent disabled:bg-canvas disabled:text-muted cursor-pointer ${
            error ? 'border-red-300 focus:ring-red-500' : 'border-border'
          } ${Icon ? 'pl-10' : ''} ${className}`}
          {...props}
        >
          {children}
        </select>
      </div>
    </Field>
  );
});

