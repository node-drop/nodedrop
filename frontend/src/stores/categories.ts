import { workflowService } from "@/services/workflow";
import { devtools } from "zustand/middleware";
import { createWithEqualityFn } from "zustand/traditional";

interface CategoriesStore {
  // State
  categories: string[];
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;

  // Actions
  loadCategories: () => Promise<void>;
  addCategory: (category: string) => void;
  removeCategory: (category: string) => void;
  clearError: () => void;
}

export const useCategoriesStore = createWithEqualityFn<CategoriesStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      categories: [],
      isLoading: false,
      error: null,
      lastFetched: null,

      // Actions
      loadCategories: async () => {
        const { isLoading, lastFetched } = get();
        
        // Prevent duplicate requests if already loading or recently fetched (within 30 seconds)
        if (isLoading || (lastFetched && Date.now() - lastFetched < 30000)) {
          return;
        }

        set({ isLoading: true, error: null });
        try {
          const categories = await workflowService.getAvailableCategories();
          set({ 
            categories, 
            lastFetched: Date.now(),
            error: null 
          });
        } catch (error: any) {
          console.error("[Categories Store] Failed to load categories:", error);
          set({ 
            error: error.message || "Failed to load categories",
            categories: [] 
          });
        } finally {
          set({ isLoading: false });
        }
      },

      addCategory: (category: string) => {
        const { categories } = get();
        if (!categories.includes(category)) {
          set({ categories: [...categories, category].sort() });
        }
      },

      removeCategory: (category: string) => {
        const { categories } = get();
        set({ categories: categories.filter(c => c !== category) });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    { name: "CategoriesStore" }
  )
);