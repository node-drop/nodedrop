/**
 * Node styling utilities for consistent status-based styling across all node types
 */

export interface NodeStyleConfig {
  status?: string;
  selected?: boolean;
  disabled?: boolean;
  hasValidationErrors?: boolean;
}

/**
 * Get border classes based on node status
 */
export function getNodeBorderClasses(config: NodeStyleConfig): string {
  const { status, selected, disabled, hasValidationErrors } = config;

  if (disabled) return "border-border/50 opacity-60";
  if (selected)
    return "border-blue-500 ring-2 ring-blue-500/30 dark:border-blue-400 dark:ring-blue-400/30";

  // Validation errors take priority over execution status
  if (hasValidationErrors) return "border-orange-500 dark:border-orange-400";

  switch (status) {
    case "running":
      return "border-transparent"; // Hide border when running - using rotating gradient instead
    case "success":
      return "border-green-500 dark:border-green-400";
    case "error":
      return "border-red-500 dark:border-red-400";
    case "skipped":
      return "border-border/50";
    default:
      return "border-border";
  }
}

/**
 * Get animation classes based on node status
 */
export function getNodeAnimationClasses(status?: string): string {
  switch (status) {
    case "running":
      return "node-running";
    case "success":
      return ""; // Removed glow animation - using icon instead
    case "error":
      return ""; // Removed glow animation - using icon instead
    default:
      return "";
  }
}

/**
 * Get complete node status classes (border + animation)
 * This is a convenience function that combines border and animation classes
 */
export function getNodeStatusClasses(
  status?: string,
  selected?: boolean,
  disabled?: boolean,
  hasValidationErrors?: boolean
): string {
  const config: NodeStyleConfig = { status, selected, disabled, hasValidationErrors };
  const borderClasses = getNodeBorderClasses(config);
  const animationClasses = getNodeAnimationClasses(status);

  return `${borderClasses} ${animationClasses}`.trim();
}
