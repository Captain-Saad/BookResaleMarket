import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Checkbox from "@/components/ui/checkbox";
import FormField from "@/components/ui/form-field";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import Switch from "@/components/ui/switch";
import Textarea from "@/components/ui/textarea";

const CONDITIONS = [
  { value: "new", label: "New" },
  { value: "like-new", label: "Like new" },
  { value: "very-good", label: "Very good" },
  { value: "good", label: "Good" },
  { value: "acceptable", label: "Acceptable" },
] as const;

const meta = {
  title: "Primitives/Form controls",
  component: Input,
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TextInput: Story = {
  render: () => (
    <div className="flex w-80 flex-col gap-2">
      <label htmlFor="story-title" className="text-sm font-medium text-ink-1">
        Title
      </label>
      <Input id="story-title" placeholder="e.g. Pride and Prejudice" />
    </div>
  ),
};

export const Invalid: Story = {
  render: () => (
    <div className="flex w-80 flex-col gap-2">
      <label htmlFor="story-isbn" className="text-sm font-medium text-ink-1">
        ISBN
      </label>
      <Input
        id="story-isbn"
        defaultValue="12345"
        aria-invalid
        aria-describedby="story-isbn-error"
      />
      <p id="story-isbn-error" className="text-sm text-danger-ink">
        ISBN must have 10 or 13 digits.
      </p>
    </div>
  ),
};

export const TextArea: Story = {
  render: () => (
    <div className="flex w-80 flex-col gap-2">
      <label htmlFor="story-notes" className="text-sm font-medium text-ink-1">
        Condition notes
      </label>
      <Textarea id="story-notes" placeholder="Any marks, notes or wear?" />
    </div>
  ),
};

export const SelectControl: Story = {
  render: () => (
    <div className="flex w-80 flex-col gap-2">
      <label htmlFor="story-grade" className="text-sm font-medium text-ink-1">
        Condition
      </label>
      <Select id="story-grade" placeholder="Choose a grade" options={CONDITIONS} />
    </div>
  ),
};

export const CheckboxAndSwitch: Story = {
  render: () => (
    <div className="flex flex-col gap-4 text-ink-1">
      <div className="flex items-center gap-3">
        <Checkbox id="story-terms" />
        <label htmlFor="story-terms">I accept the seller terms</label>
      </div>
      <div className="flex items-center gap-3">
        <Switch id="story-notify" defaultChecked />
        <label htmlFor="story-notify">Email me when it sells</label>
      </div>
    </div>
  ),
};

export const FieldWithLabel: Story = {
  render: () => (
    <div className="flex max-w-sm flex-col gap-4">
      <FormField id="story-field-hint" label="Password" hint="At least 8 characters.">
        <Input id="story-field-hint" type="password" aria-describedby="story-field-hint-hint" />
      </FormField>
      <FormField id="story-field-error" label="Email" error="Enter a valid email address.">
        <Input id="story-field-error" aria-invalid aria-describedby="story-field-error-error" />
      </FormField>
    </div>
  ),
};
