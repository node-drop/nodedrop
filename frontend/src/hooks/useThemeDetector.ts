import { useEffect, useState } from "react";

/**
 * Hook to detect and track dark mode changes
 * Listens to changes in the document's classList for 'dark' class
 *
 * @returns {boolean} isDarkMode - Whether dark mode is currently active
 */
export function useThemeDetector() {
  const [isDarkMode, setIsDarkMode] = useState(() =>
    document.documentElement.classList.contains("dark")
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return isDarkMode;
}
