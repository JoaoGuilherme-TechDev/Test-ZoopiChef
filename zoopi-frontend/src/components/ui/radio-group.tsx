import React, { createContext, useContext } from "react";
import { cn } from "@/lib/utils";
 
type RadioGroupContextType = {
  value: string | undefined;
  onValueChange?: (val: string) => void;
};
 
const RadioGroupContext = createContext<RadioGroupContextType>({
  value: undefined,
});
 
interface RadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  onValueChange?: (val: string) => void;
}
 
export function RadioGroup({ value, onValueChange, className, children, ...rest }: RadioGroupProps) {
  return (
    <RadioGroupContext.Provider value={{ value, onValueChange }}>
      <div className={cn("space-y-2", className)} {...rest}>
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
}
 
interface RadioGroupItemProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string;
}
 
export function RadioGroupItem({ value, id, className, ...rest }: RadioGroupItemProps) {
  const ctx = useContext(RadioGroupContext);
  const checked = ctx.value === value;
 
  return (
    <input
      type="radio"
      id={id}
      className={cn("sr-only", className)}
      checked={checked}
      onChange={() => ctx.onValueChange?.(value)}
      {...rest}
    />
  );
}
