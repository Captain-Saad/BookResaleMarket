import type { ComponentProps } from "react";
import { cn, fieldClassName } from "@/lib/utils";

const Textarea = ({ className, rows = 4, ...props }: ComponentProps<"textarea">) => (
  <textarea rows={rows} className={cn(fieldClassName, "py-3", className)} {...props} />
);

export default Textarea;
