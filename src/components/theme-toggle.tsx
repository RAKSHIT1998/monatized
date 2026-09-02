"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

// next-themes has been wired up in the root layout from the start, but
// nothing ever let anyone switch — so the dark palette was unreachable.
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // The server can't know the resolved theme, so render the icon only after
  // mount — otherwise the first paint disagrees with the client and React
  // reports a hydration mismatch. queueMicrotask keeps the setState out of
  // the effect's own synchronous run, same idiom as cart-badge.tsx.
  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      // Both the icon and the label have to wait for mount — the server has
      // no idea which theme will resolve, so anything derived from it
      // mismatches on hydration.
      aria-label={mounted ? (isDark ? "Switch to light theme" : "Switch to dark theme") : "Switch theme"}
    >
      {mounted && (isDark ? <Sun className="size-4" /> : <Moon className="size-4" />)}
    </Button>
  );
}
