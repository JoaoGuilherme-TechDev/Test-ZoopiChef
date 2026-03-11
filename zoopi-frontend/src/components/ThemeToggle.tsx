import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-10 w-10 rounded-full bg-white/5 border border-white/10 text-foreground hover:bg-white/10 transition-all duration-300"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
    >
      <div className="relative h-5 w-5">
        <motion.div
          initial={false}
          animate={{ 
            rotate: theme === "dark" ? 0 : 90,
            opacity: theme === "dark" ? 1 : 0,
            scale: theme === "dark" ? 1 : 0
          }}
          className="absolute inset-0 flex items-center justify-center text-yellow-400"
        >
          <Sun size={20} fill="currentColor" />
        </motion.div>
        
        <motion.div
          initial={false}
          animate={{ 
            rotate: theme === "light" ? 0 : -90,
            opacity: theme === "light" ? 1 : 0,
            scale: theme === "light" ? 1 : 0
          }}
          className="absolute inset-0 flex items-center justify-center text-blue-400"
        >
          <Moon size={20} fill="currentColor" />
        </motion.div>
      </div>
      <span className="sr-only">Alternar tema</span>
    </Button>
  );
}