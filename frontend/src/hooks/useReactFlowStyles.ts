import { useMemo } from "react";
import { useThemeDetector } from "./useThemeDetector";

/**
 * Hook to generate theme-aware styles for ReactFlow components
 * Returns edge styles and connection line styles based on current theme
 *
 * @returns Object containing edgeStyle and connectionLineStyle
 */
export function useReactFlowStyles() {
  const isDarkMode = useThemeDetector();

  const edgeStyle = useMemo(
    () => ({
      stroke: isDarkMode ? "hsl(var(--border))" : "#b1b1b7",
      strokeWidth: 2,
    }),
    [isDarkMode]
  );

  const connectionLineStyle = useMemo(
    () => ({
      stroke: isDarkMode ? "hsl(var(--primary))" : "#5865f2",
      strokeWidth: 2,
    }),
    [isDarkMode]
  );

  return {
    edgeStyle,
    connectionLineStyle,
    isDarkMode,
  };
}
