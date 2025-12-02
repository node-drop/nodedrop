import { createWithEqualityFn } from "zustand/traditional";

interface CopyPasteStore {
  // Copy/paste functions (set by useCopyPaste hook)
  copy: (() => void) | null;
  cut: (() => void) | null;
  paste: (() => void) | null;
  canCopy: boolean;
  canPaste: boolean;

  // Actions to set the functions
  setCopyPasteFunctions: (functions: {
    copy: () => void;
    cut: () => void;
    paste: () => void;
    canCopy: boolean;
    canPaste: boolean;
  }) => void;
}

export const useCopyPasteStore = createWithEqualityFn<CopyPasteStore>((set) => ({
  copy: null,
  cut: null,
  paste: null,
  canCopy: false,
  canPaste: false,

  setCopyPasteFunctions: (functions) => set(functions),
}));
