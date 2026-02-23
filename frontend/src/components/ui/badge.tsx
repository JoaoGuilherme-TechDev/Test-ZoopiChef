import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground shadow-[0_0_8px_hsla(265,90%,62%,0.4)] hover:shadow-[0_0_12px_hsla(265,90%,62%,0.6)] hover:bg-primary/90",
        secondary: "border-[hsla(265,90%,62%,0.2)] bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:border-[hsla(265,90%,62%,0.4)]",
        destructive: "border-transparent bg-destructive text-destructive-foreground shadow-[0_0_8px_hsla(0,75%,55%,0.4)] hover:bg-destructive/90",
        outline: "text-foreground border-[hsla(265,90%,62%,0.3)] hover:border-[hsla(265,90%,62%,0.5)] hover:bg-primary/10",
        success: "border-transparent bg-success text-success-foreground shadow-[0_0_8px_hsla(155,85%,50%,0.4)]",
        warning: "border-transparent bg-warning text-warning-foreground shadow-[0_0_8px_hsla(45,100%,55%,0.4)]",
        info: "border-transparent bg-info text-info-foreground shadow-[0_0_8px_hsla(200,95%,55%,0.4)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(({ className, variant, ...props }, ref) => {
  return <div ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />;
});
Badge.displayName = "Badge";

export { Badge, badgeVariants };

