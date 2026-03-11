// ================================================================
// FILE: waiter/components/shared/PageHeader.tsx
// Reusable sticky header with back button, collapsible search,
// optional refresh button, and optional badge slots.
// Used by all waiter sub-pages.
// ================================================================

import { ArrowLeft, Search, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PageHeaderProps {
  title: string;
  subtitle: string;
  searchOpen: boolean;
  searchTerm: string;
  searchPlaceholder: string;
  onSearchToggle: () => void;
  onSearchChange: (value: string) => void;
  onBack: () => void;
  onRefresh?: () => void;
  badges?: React.ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  searchOpen,
  searchTerm,
  searchPlaceholder,
  onSearchToggle,
  onSearchChange,
  onBack,
  onRefresh,
  badges,
}: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-10 bg-background/90 backdrop-blur-sm border-b border-border/50">
      <div className="container mx-auto px-4 h-16 flex items-center gap-2">

        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-xl shrink-0"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="flex-1 min-w-0">
          {searchOpen ? (
            <Input
              autoFocus
              placeholder={searchPlaceholder}
              className="h-9 rounded-xl border-border/60 bg-muted/30 text-sm"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          ) : (
            <div>
              <h1 className="text-base font-bold leading-tight">{title}</h1>
              <p className="text-xs text-muted-foreground leading-tight">{subtitle}</p>
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-xl shrink-0"
          onClick={onSearchToggle}
        >
          {searchOpen ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
        </Button>

        {onRefresh && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-xl shrink-0"
            onClick={onRefresh}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}

        {badges && !searchOpen && badges}

      </div>
    </header>
  );
}