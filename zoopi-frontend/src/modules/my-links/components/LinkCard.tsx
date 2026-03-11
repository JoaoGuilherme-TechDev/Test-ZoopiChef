import { LucideIcon, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

export interface SystemLink {
  id: string;
  name: string;
  description: string;
  path: string;
  icon: LucideIcon;
  category: "customer" | "internal";
}

interface LinkCardProps {
  link: SystemLink;
  publicBaseUrl: string;
}

export function LinkCard({ link, publicBaseUrl }: LinkCardProps) {
  const handleCopy = (text: string) => {
    const fullUrl = text.startsWith("http") ? text : `${publicBaseUrl}${text}`;
    navigator.clipboard.writeText(fullUrl);
    toast.success("Link copiado para a área de transferência!");
  };

  return (
    <Card className="group hover:border-primary/50 transition-all duration-300 overflow-hidden bg-card/50 backdrop-blur-sm">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300">
            <link.icon className="h-6 w-6" />
          </div>
          <div className="flex-1 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-foreground group-hover:text-primary transition-colors">
                {link.name}
              </h4>
              {link.category === "customer" && (
                <span className="text-[8px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Público
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-1">
              {link.description}
            </p>
            <div className="mt-4 flex items-center gap-2">
              <div className="flex-1 bg-muted/50 rounded-lg px-3 py-2 text-[10px] font-mono text-muted-foreground truncate border border-border/50">
                {`${publicBaseUrl}${link.path}`}
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => handleCopy(link.path)}
                className="h-9 w-9 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                asChild
                className="h-9 w-9 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
              >
                <a href={link.path} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
