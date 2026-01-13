import { useTheme, type ColorScheme } from "@/context/ThemeContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Palette } from "lucide-react";

const colorSchemes: Array<{
  value: ColorScheme;
  label: string;
  color: string;
}> = [
  { value: "default", label: "Default (Purple)", color: "bg-purple-500" },
  { value: "blue", label: "Blue", color: "bg-blue-500" },
  { value: "green", label: "Green", color: "bg-green-500" },
  { value: "orange", label: "Orange", color: "bg-orange-500" },
  { value: "red", label: "Red", color: "bg-red-500" },
  { value: "purple", label: "Purple", color: "bg-purple-600" },
];

export const ThemeSelector = () => {
  const { colorScheme, setColorScheme } = useTheme();

  const currentScheme = colorSchemes.find((s) => s.value === colorScheme);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="p-2 hover:bg-secondary rounded-lg transition-colors"
          aria-label="Select theme"
        >
          <Palette className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-sm font-semibold">
          Color Scheme
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {colorSchemes.map((scheme) => (
          <DropdownMenuItem
            key={scheme.value}
            onClick={() => setColorScheme(scheme.value)}
            className="flex items-center gap-2 cursor-pointer"
          >
            <div className={`h-3 w-3 rounded-full ${scheme.color}`} />
            <span className="flex-1">{scheme.label}</span>
            {colorScheme === scheme.value && (
              <span className="text-xs font-semibold text-primary">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
