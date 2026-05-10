import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

export function ThemeToggleFloat() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="fixed right-3 top-3 z-50 grid h-10 w-10 place-items-center rounded-full border border-border bg-card/90 text-foreground shadow-lg backdrop-blur hover:bg-accent hover:text-accent-foreground md:right-4 md:top-4"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}