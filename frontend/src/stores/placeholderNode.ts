import { createWithEqualityFn } from "zustand/traditional";

interface NodeInsertionContext {
  sourceNodeId: string;
  targetNodeId: string;
  sourceOutput?: string;
  targetInput?: string;
}

interface PlaceholderNodeStore {
  // Popover state (no actual placeholder node needed)
  placeholderPosition: { x: number; y: number } | null;
  insertionContext: NodeInsertionContext | null;
  isPopoverOpen: boolean;

  // Actions
  showPlaceholder: (
    position: { x: number; y: number },
    insertionContext?: NodeInsertionContext
  ) => void;
  hidePlaceholder: () => void;
}

export const usePlaceholderNodeStore = createWithEqualityFn<PlaceholderNodeStore>((set) => ({
  placeholderPosition: null,
  insertionContext: null,
  isPopoverOpen: false,

  showPlaceholder: (position, insertionContext) =>
    set({
      placeholderPosition: position,
      insertionContext: insertionContext || null,
      isPopoverOpen: true,
    }),

  hidePlaceholder: () =>
    set({
      placeholderPosition: null,
      insertionContext: null,
      isPopoverOpen: false,
    }),
}));
