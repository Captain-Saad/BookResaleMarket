import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import { catalogParams, filterPrice } from "@/lib/catalog";
import type { CatalogFiltersProps } from "@/lib/types";
import { fieldClassName } from "@/lib/utils";

const CatalogFilters = ({
  copy,
  filters,
  prefix,
  error,
  onSubmit,
  onReset,
}: CatalogFiltersProps) => (
  <form key={catalogParams(filters).toString()} onSubmit={onSubmit} className="flex flex-col gap-5">
    {error && (
      <p role="alert" className="text-sm text-danger-ink">
        {error}
      </p>
    )}
    <label className="flex flex-col gap-2 text-sm text-ink-2" htmlFor={`${prefix}-isbn`}>
      {copy.isbn}
      <Input id={`${prefix}-isbn`} name="isbn" defaultValue={filters.isbn ?? ""} maxLength={32} />
    </label>
    <label className="flex flex-col gap-2 text-sm text-ink-2" htmlFor={`${prefix}-author`}>
      {copy.author}
      <Input
        id={`${prefix}-author`}
        name="author"
        defaultValue={filters.author ?? ""}
        maxLength={200}
      />
    </label>
    <label className="flex flex-col gap-2 text-sm text-ink-2" htmlFor={`${prefix}-condition`}>
      {copy.condition}
      <select
        id={`${prefix}-condition`}
        className={`${fieldClassName} min-h-11`}
        name="condition"
        defaultValue={filters.condition ?? ""}
      >
        <option value="">{copy.any}</option>
        {copy.conditions.map(({ value, label }) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
    <label className="flex flex-col gap-2 text-sm text-ink-2" htmlFor={`${prefix}-fulfillment`}>
      {copy.fulfillment}
      <select
        id={`${prefix}-fulfillment`}
        className={`${fieldClassName} min-h-11`}
        name="fulfillment"
        defaultValue={filters.fulfillment ?? ""}
      >
        <option value="">{copy.any}</option>
        {copy.fulfillments.map(({ value, label }) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
    <label className="flex flex-col gap-2 text-sm text-ink-2" htmlFor={`${prefix}-currency`}>
      {copy.currency}
      <select
        id={`${prefix}-currency`}
        className={`${fieldClassName} min-h-11`}
        aria-describedby={`${prefix}-currency-help`}
        name="currency"
        defaultValue={filters.currency ?? ""}
      >
        <option value="">{copy.any}</option>
        {copy.currencies.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
    </label>
    <p id={`${prefix}-currency-help`} className="text-xs text-ink-2">
      {copy.currencyHelp}
    </p>
    <div className="grid grid-cols-2 gap-3">
      <label
        className="flex min-w-0 flex-col gap-2 text-sm text-ink-2"
        htmlFor={`${prefix}-min-price`}
      >
        {copy.minPrice}
        <Input
          id={`${prefix}-min-price`}
          name="min_price"
          inputMode="decimal"
          defaultValue={filterPrice(filters.min_price)}
        />
      </label>
      <label
        className="flex min-w-0 flex-col gap-2 text-sm text-ink-2"
        htmlFor={`${prefix}-max-price`}
      >
        {copy.maxPrice}
        <Input
          id={`${prefix}-max-price`}
          name="max_price"
          inputMode="decimal"
          defaultValue={filterPrice(filters.max_price)}
        />
      </label>
    </div>
    <Button type="submit">{copy.apply}</Button>
    <Button variant="ghost" onClick={onReset}>
      {copy.reset}
    </Button>
  </form>
);
export default CatalogFilters;
