import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: [
          "bg-primary text-primary-foreground",
          "shadow-[0_0_10px_hsl(var(--primary)/0.3)]",
          "hover:bg-primary/90 hover:shadow-[0_0_20px_hsl(var(--primary)/0.4)]",
          "active:scale-[0.98]",
        ].join(" "),
        destructive: [
          "bg-destructive text-destructive-foreground",
          "shadow-[0_0_10px_hsl(var(--destructive)/0.3)]",
          "hover:bg-destructive/90 hover:shadow-[0_0_20px_hsl(var(--destructive)/0.4)]",
          "active:scale-[0.98]",
        ].join(" "),
        outline: [
          "border border-primary/20 bg-background",
          "shadow-[0_0_1px_hsl(var(--primary)/0.2)]",
          "hover:border-primary/40 hover:bg-accent/50 hover:text-accent-foreground",
          "hover:shadow-[0_0_15px_hsl(var(--primary)/0.15)]",
        ].join(" "),
        secondary: [
          "bg-secondary text-secondary-foreground",
          "border border-primary/10",
          "hover:bg-secondary/80 hover:border-primary/20",
          "hover:shadow-[0_0_10px_hsl(var(--primary)/0.1)]",
        ].join(" "),
        ghost: [
          "hover:bg-accent/50 hover:text-accent-foreground",
          "hover:shadow-[0_0_10px_hsl(var(--accent)/0.1)]",
        ].join(" "),
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-lg px-8",
        icon: "h-10 w-10",
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
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
