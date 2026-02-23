import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-primary/15 bg-background px-3 py-2 text-base ring-offset-background",
          // Ensure text is always visible: dark text on light bg, light text on dark bg
          "text-foreground dark:text-foreground",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          "placeholder:text-muted-foreground",
          "transition-all duration-300",
          "focus-visible:outline-none focus-visible:border-primary/40",
          "focus-visible:ring-2 focus-visible:ring-primary/20",
          "focus-visible:shadow-[0_0_15px_hsl(var(--primary)/0.15)]",
          "disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
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
