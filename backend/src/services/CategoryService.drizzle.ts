import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { categories } from '../db/schema/categories';
import { workflows } from '../db/schema/workflows';
import { AppError } from '../utils/errors';

export class CategoryServiceDrizzle {
  constructor() {}

  async getAvailableCategories(userId: string) {
    try {
      // Get categories from the database
      const categoryList = await db.query.categories.findMany({
        where: eq(categories.active, true),
        orderBy: (cat) => cat.name,
      });

      // If no categories found in database, return some defaults
      if (categoryList.length === 0) {
        return [
          "automation",
          "integration",
          "communication",
          "data-processing",
          "other",
        ];
      }

      // Return just the category names for the API response
      return categoryList.map((category) => category.name);
    } catch (error) {
      console.error("Error getting available categories:", error);
      throw new AppError(
        "Failed to get available categories",
        500,
        "CATEGORIES_FETCH_ERROR"
      );
    }
  }

  async createCategory(
    userId: string,
    categoryData: {
      name: string;
      displayName: string;
      description?: string;
      color?: string;
      icon?: string;
    }
  ) {
    try {
      // Check if category already exists
      const existingCategory = await db.query.categories.findFirst({
        where: eq(categories.name, categoryData.name),
      });

      if (existingCategory) {
        throw new AppError(
          "Category with this name already exists",
          400,
          "CATEGORY_EXISTS"
        );
      }

      // Create the category
      const [category] = await db
        .insert(categories)
        .values({
          name: categoryData.name.toLowerCase().replace(/\s+/g, "-"),
          displayName: categoryData.displayName,
          description: categoryData.description,
          color: categoryData.color || "#6B7280",
          icon: categoryData.icon || "📁",
          active: true,
        })
        .returning();

      return category;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error("Error creating category:", error);
      throw new AppError(
        "Failed to create category",
        500,
        "CATEGORY_CREATE_ERROR"
      );
    }
  }

  async deleteCategory(userId: string, categoryName: string) {
    try {
      // Check if category exists
      const category = await db.query.categories.findFirst({
        where: eq(categories.name, categoryName),
      });

      if (!category) {
        throw new AppError("Category not found", 404, "CATEGORY_NOT_FOUND");
      }

      // Check if any workflows are using this category
      const workflowsWithCategory = await db.query.workflows.findFirst({
        where: eq(workflows.category, categoryName),
      });

      if (workflowsWithCategory) {
        throw new AppError(
          "Cannot delete category that is being used by workflows",
          400,
          "CATEGORY_IN_USE"
        );
      }

      // Delete the category
      await db.delete(categories).where(eq(categories.name, categoryName));

      return { message: "Category deleted successfully" };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error("Error deleting category:", error);
      throw new AppError(
        "Failed to delete category",
        500,
        "CATEGORY_DELETE_ERROR"
      );
    }
  }
}
