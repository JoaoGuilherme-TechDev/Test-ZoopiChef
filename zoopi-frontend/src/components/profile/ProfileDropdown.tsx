/* eslint-disable @typescript-eslint/no-explicit-any */
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/use-profile";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, UserCircle } from "lucide-react";

export function ProfileDropdown() {
  const { user, signOut } = useAuth(); 
  const { profile } = useProfile();
  const navigate = useNavigate();

  const backendUrl = "http://localhost:3000";

  // Sincronização de dados com fallback para metadados antigos
  const displayAvatar = profile?.avatar_url 
    ? (profile.avatar_url.startsWith('http') ? profile.avatar_url : `${backendUrl}${profile.avatar_url}`)
    : (user as any)?.user_metadata?.avatar_url;

  const displayName = profile?.full_name || (user as any)?.user_metadata?.full_name || "Usuário";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative h-9 w-9 rounded-full border border-primary/30 hover:border-primary/60 transition-all outline-none overflow-hidden group">
          <Avatar className="h-full w-full">
            <AvatarImage src={displayAvatar} alt={displayName} className="object-cover" />
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
              {displayName.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        className="w-56 bg-popover/80 dark:bg-black/90 backdrop-blur-xl border border-border/50 text-popover-foreground shadow-xl rounded-2xl p-2" 
        align="end" 
        sideOffset={8}
      >
        <DropdownMenuLabel className="font-normal p-3">
          <div className="flex flex-col space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-primary">Conta</p>
            <p className="text-sm font-bold leading-none truncate">{displayName}</p>
            <p className="text-[10px] leading-none text-muted-foreground truncate">{user?.email}</p>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator className="bg-border/50 mx-2" />
        
        <div className="space-y-1">
          <DropdownMenuItem 
            onClick={() => navigate("/settings/profile")} 
            className="flex items-center p-3 rounded-xl cursor-pointer hover:bg-accent dark:hover:bg-primary/20 focus:bg-accent dark:focus:bg-primary/20 transition-colors group"
          >
            <UserCircle className="mr-3 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="font-medium">Configurar Perfil</span>
          </DropdownMenuItem>
        </div>

        <DropdownMenuSeparator className="bg-border/50 mx-2" />
        
        <div className="pt-1">
          <DropdownMenuItem 
            onClick={() => signOut()} 
            className="flex items-center p-3 rounded-xl cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10 hover:bg-destructive/10 transition-colors group"
          >
            <LogOut className="mr-3 h-4 w-4 opacity-70 group-hover:opacity-100" />
            <span className="font-bold">Sair do Sistema</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}