import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "block w-full rounded-[12px] border-2 border-border-default bg-neutral-primary px-[14px] py-[12px] text-[16px] text-heading transition-[border-color,box-shadow] duration-150 ease-out",
          "placeholder:text-body-subtle",
          "hover:border-border-default-strong",
          "focus-visible:outline-none focus-visible:border-border-brand focus-visible:ring-2 focus-visible:ring-brand-soft",
          "disabled:bg-disabled disabled:text-fg-disabled disabled:cursor-not-allowed",
          "aria-[invalid=true]:border-border-danger aria-[invalid=true]:focus-visible:ring-danger-soft",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
