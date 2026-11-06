import FormField from "@/components/ui/form-field";
import Input from "@/components/ui/input";
import type { FormFieldsProps } from "@/lib/types";

const FormFields = ({ form, fields, idPrefix }: FormFieldsProps) => (
  <>
    {fields.map(({ name, label, type, autoComplete, hint }) => {
      const id = `${idPrefix}-${name}`;
      const error = form.formState.errors[name]?.message;
      const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
      return (
        <FormField key={name} id={id} label={label} hint={hint} error={error}>
          <Input
            id={id}
            type={type}
            autoComplete={autoComplete}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            {...form.register(name)}
          />
        </FormField>
      );
    })}
  </>
);

export default FormFields;
