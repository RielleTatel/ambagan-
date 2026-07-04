import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[12px] font-bold uppercase tracking-[0.8px] border-2 transition-[background-color,transform,box-shadow] duration-100 ease-out focus-visible:outline-none focus-visible:ring-4 disabled:pointer-events-none disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-[18px] [&_svg]:shrink-0 active:translate-y-[2px]",
  {
    variants: {
      variant: {
        default:
          "bg-brand text-white border-transparent btn-shadow-brand hover:bg-brand-medium focus-visible:ring-brand-soft active:[box-shadow:0_2px_0_var(--shadow-brand)]",
        brand:
          "bg-brand text-white border-transparent btn-shadow-brand hover:bg-brand-medium focus-visible:ring-brand-soft active:[box-shadow:0_2px_0_var(--shadow-brand)]",
        secondary:
          "bg-neutral-primary text-body border-border-default btn-shadow-secondary hover:bg-warm-bg hover:text-heading focus-visible:ring-warm-bg active:[box-shadow:0_2px_0_var(--shadow-secondary)]",
        tertiary:
          "bg-neutral-primary text-fg-brand border-border-default btn-shadow-secondary hover:bg-brand-softer focus-visible:ring-brand-soft active:[box-shadow:0_2px_0_var(--shadow-secondary)]",
        accent:
          "bg-accent text-white border-transparent [box-shadow:0_4px_0_var(--shadow-accent)] hover:bg-accent-medium focus-visible:ring-accent-soft active:[box-shadow:0_2px_0_var(--shadow-accent)]",
        danger:
          "bg-danger text-white border-transparent btn-shadow-danger hover:opacity-90 focus-visible:ring-danger-soft active:[box-shadow:0_2px_0_var(--shadow-danger)]",
        ghost:
          "bg-transparent text-heading border-transparent hover:bg-warm-bg focus-visible:ring-warm-bg active:translate-y-0",
        link: "bg-transparent text-fg-brand border-transparent underline-offset-4 hover:underline active:translate-y-0",
        outline:
          "bg-neutral-primary text-body border-border-default btn-shadow-secondary hover:bg-warm-bg hover:text-heading focus-visible:ring-warm-bg active:[box-shadow:0_2px_0_var(--shadow-secondary)]",
      },
      size: {
        xs: "text-[12px] px-[14px] py-[8px]",
        sm: "text-[13px] px-[16px] py-[10px]",
        default: "text-[15px] px-[20px] py-[14px]",
        lg: "text-[16px] px-[28px] py-[16px]",
        xl: "text-[17px] px-[32px] py-[18px]",
        icon: "size-10 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const disabledStyle = disabled
      ? "!bg-disabled !text-fg-disabled !border-border-default !shadow-none !translate-y-0"
      : "";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }), disabledStyle)}
        ref={ref}
        disabled={disabled}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
