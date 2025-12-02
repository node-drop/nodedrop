import { createWithEqualityFn } from "zustand/traditional";

interface NodeInsertionContext {
  sourceNodeId: string;
  targetNodeId: string;
  sourceOutput?: string;
  targetInput?: string;
}

interface AddNodeDialogStore {
  isOpen: boolean;
  position?: { x: number; y: number };
  insertionContext?: NodeInsertionContext;

  openDialog: (
    position?: { x: number; y: number },
    insertionContext?: NodeInsertionContext
  ) => void;
  closeDialog: () => void;
}

export const useAddNodeDialogStore = createWithEqualityFn<AddNodeDialogStore>((set) => ({
  isOpen: false,
  position: undefined,
  insertionContext: undefined,

  openDialog: (position, insertionContext) =>
    set({ isOpen: true, position, insertionContext }),
  closeDialog: () =>
    set({ isOpen: false, position: undefined, insertionContext: undefined }),
}));
