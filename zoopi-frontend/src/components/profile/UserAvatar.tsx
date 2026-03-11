import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  className?: string;
  showStatus?: boolean;
}

export function UserAvatar({ src, name, className, showStatus = false }: UserAvatarProps) {
  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .substring(0, 2)
    : "??";

  return (
    <div className="relative inline-block">
      <Avatar 
        className={cn(
          "h-10 w-10 border-2 border-primary/20 transition-all duration-300 hover:border-primary hover:shadow-glow-accent",
          className
        )}
      >
        <AvatarImage src={src || ""} alt={name || "User"} className="object-cover" />
        <AvatarFallback className="bg-secondary text-foreground font-medium">
          {initials}
        </AvatarFallback>
      </Avatar>
      
      {showStatus && (
        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-success animate-pulse" />
      )}
    </div>
  );
}