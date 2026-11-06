import type { FormFieldProps } from "@/lib/types";

const FormField = ({ id, label, hint, error, children }: FormFieldProps) => (
  <div className="flex flex-col gap-1.5">
    <label htmlFor={id} className="text-sm font-medium text-ink-1">
      {label}
    </label>
    {children}
    {hint && !error && (
      <p id={`${id}-hint`} className="text-sm text-ink-2">
        {hint}
      </p>
    )}
    {error && (
      <p id={`${id}-error`} role="alert" className="text-sm text-danger-ink">
        {error}
      </p>
    )}
  </div>
);

export default FormField;
