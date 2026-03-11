import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { cn } from "@/lib/utils"
import { useAlert } from "@/modules/alerts"
import { AlertTriangle } from "lucide-react"

const Tabs = TabsPrimitive.Root
const TabsList = React.forwardRef<React.ElementRef<typeof TabsPrimitive.List>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>>(({ className, ...props }, ref) => (
  <TabsPrimitive.List ref={ref} className={cn("inline-flex h-10 items-center justify-center rounded-xl bg-muted p-1 text-muted-foreground", className)} {...props} />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & { value: string }
>(({ className, value, children, ...props }, ref) => {
  const { targetTab } = useAlert();
  const hasError = targetTab === value;

  return (
    <TabsPrimitive.Trigger
      ref={ref}
      value={value}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2 text-sm font-bold uppercase tracking-widest ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow",
        // FORCE RED na Tab
        hasError && "!text-red-500 !border !border-red-500/50 !bg-red-500/10 animate-pulse",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-2">
        {children}
        {hasError && <AlertTriangle className="h-3 w-3 animate-bounce" />}
      </div>
    </TabsPrimitive.Trigger>
  )
})
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName
const TabsContent = TabsPrimitive.Content
export { Tabs, TabsList, TabsTrigger, TabsContent }