/**
 * Node shape utilities for determining visual appearance based on execution capability
 */

import type { NodeType } from "@/types";

export type NodeShape = "trigger" | "rectangle" | "diamond" | "hexagon";

export interface NodeShapeStyle {
  borderRadius: number;
  shape: NodeShape;
  className?: string;
}

/**
 * Get node shape configuration based on execution capability
 */
export function getNodeShapeStyle(
  nodeTypeDefinition: NodeType | undefined
): NodeShapeStyle {
  const capability = nodeTypeDefinition?.executionCapability;

  switch (capability) {
    case "trigger":
      // Trigger nodes: Rounded/pill shape
      return {
        borderRadius: 32,
        shape: "trigger",
        className: "node-shape-trigger",
      };

    case "condition":
      // Condition nodes: Diamond shape
      return {
        borderRadius: 4,
        shape: "diamond",
        className: "node-shape-diamond",
      };

    case "transform":
      // Transform nodes: Hexagon/beveled shape
      return {
        borderRadius: 6,
        shape: "hexagon",
        className: "node-shape-hexagon",
      };

    case "action":
    default:
      // Action nodes and default: Standard rectangle
      return {
        borderRadius: 8,
        shape: "rectangle",
        className: "node-shape-rectangle",
      };
  }
}

/**
 * Get border radius based on execution capability (simplified)
 */
export function getNodeBorderRadius(
  executionCapability?: "trigger" | "action" | "transform" | "condition"
): number {
  switch (executionCapability) {
    case "trigger":
      return 32; // Pill shape
    case "condition":
      return 4; // Sharp corners for diamond
    case "transform":
      return 6; // Slightly rounded for hexagon
    case "action":
    default:
      return 8; // Standard rounded rectangle
  }
}

/**
 * Check if node should use special shape rendering
 */
export function requiresSpecialShapeRendering(shape: NodeShape): boolean {
  return shape === "diamond" || shape === "hexagon";
}

/**
 * Get CSS classes for node shape
 */
export function getNodeShapeClasses(
  nodeTypeDefinition: NodeType | undefined,
  additionalClasses?: string
): string {
  const shapeStyle = getNodeShapeStyle(nodeTypeDefinition);
  const classes = [shapeStyle.className];

  if (additionalClasses) {
    classes.push(additionalClasses);
  }

  return classes.filter(Boolean).join(" ");
}
