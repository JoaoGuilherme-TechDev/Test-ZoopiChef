import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  FileX,
  Database,
  ShoppingCart,
  Users,
  Package,
  DollarSign,
  BarChart3,
  Calendar,
  Inbox,
  Search,
  AlertCircle,
} from "lucide-react";

const ICONS = {
  file: FileX,
  database: Database,
  cart: ShoppingCart,
  users: Users,
  package: Package,
  money: DollarSign,
  chart: BarChart3,
  calendar: Calendar,
  inbox: Inbox,
  search: Search,
  alert: AlertCircle,
} as const;

type IconType = keyof typeof ICONS;

interface EmptyStateProps {
  icon?: IconType;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  children?: ReactNode;
}

export function EmptyState({
  icon = "inbox",
  title,
  description,
  action,
  className,
  children,
}: EmptyStateProps) {
  const IconComponent = ICONS[icon];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center animate-in fade-in-50 duration-500",
        className
      )}
    >
      <div className="relative mb-4">
        <div className="absolute inset-0 bg-primary/10 blur-2xl rounded-full" />
        <div className="relative w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <IconComponent className="w-8 h-8 text-muted-foreground" />
        </div>
      </div>
      
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {title}
      </h3>
      
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-4">
          {description}
        </p>
      )}
      
      {action && (
        <Button onClick={action.onClick} variant="outline" className="mt-2">
          {action.label}
        </Button>
      )}
      
      {children}
    </div>
  );
}

interface EmptySearchResultProps {
  query: string;
  onClear?: () => void;
}

export function EmptySearchResult({ query, onClear }: EmptySearchResultProps) {
  return (
    <EmptyState
      icon="search"
      title="Nenhum resultado encontrado"
      description={`Não encontramos resultados para "${query}". Tente usar termos diferentes.`}
      action={onClear ? { label: "Limpar busca", onClick: onClear } : undefined}
    />
  );
}

interface EmptyDataProps {
  type?: "table" | "list" | "chart";
  entity?: string;
}

export function EmptyData({ type = "table", entity = "dados" }: EmptyDataProps) {
  const descriptions: Record<string, string> = {
    table: `Nenhum ${entity} encontrado. Comece adicionando novos registros.`,
    list: `A lista de ${entity} está vazia.`,
    chart: `Não há ${entity} suficientes para exibir o gráfico.`,
  };

  return (
    <EmptyState
      icon="database"
      title={`Sem ${entity}`}
      description={descriptions[type]}
    />
  );
}
