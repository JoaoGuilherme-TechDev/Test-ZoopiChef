/* eslint-disable @typescript-eslint/no-empty-object-type */
import * as React from "react";
import { cn } from "@/lib/utils";
import { useAlert } from "@/modules/alerts";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, name, id, onChange, ...props }, ref) => {
    const { errorFields, clearErrors } = useAlert();
    
    // Verifica se este campo falhou na validação do servidor
    const isInvalid = (name && errorFields.includes(name)) || (id && errorFields.includes(id));

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (isInvalid) clearErrors(); 
      if (onChange) onChange(e);
    };

    return (
      <input
        type={type}
        name={name}
        id={id}
        ref={ref}
        onChange={handleChange}
        className={cn(
          "flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          // Se estiver inválido, aplicamos o visual de alerta "Gênio"
          isInvalid && [
            "!border-red-500 !ring-red-500/40 !ring-2",
            "bg-red-500/5 animate-shake shadow-[0_0_15px_rgba(239,68,68,0.3)]",
            "text-red-500 placeholder:text-red-300"
          ],
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
export { Input };