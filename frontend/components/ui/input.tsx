import type { ComponentProps } from "react";
import { cn, fieldClassName } from "@/lib/utils";

const Input = ({ className, type = "text", ...props }: ComponentProps<"input">) => (
  <input type={type} className={cn(fieldClassName, "min-h-11", className)} {...props} />
);

export default Input;
