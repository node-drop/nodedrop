import { PrismaClient } from "@prisma/client";
import { AppError } from "../utils/errors";
import { logger } from "../utils/logger";

export interface VariableData {
  key: string;
  value: string;
  description?: string;
  scope?: "GLOBAL" | "LOCAL";
  workflowId?: string;
}

export interface Variable {
  id: string;
  key: string;
  value: string;
  description?: string | null;
  scope: "GLOBAL" | "LOCAL";
  workflowId?: string | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export class VariableService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Create a new variable
   */
  async createVariable(
    userId: string,
    key: string,
    value: string,
    description?: string,
    scope: "GLOBAL" | "LOCAL" = "GLOBAL",
    workflowId?: string
  ): Promise<Variable> {
    // Validate variable key format (alphanumeric, underscore, dot allowed)
    if (!this.isValidVariableKey(key)) {
      throw new AppError(
        "Variable key must contain only letters, numbers, underscores, and dots",
        400
      );
    }

    // Validate scope and workflowId combination
    if (scope === "LOCAL" && !workflowId) {
      throw new AppError(
        "Local variables must be associated with a workflow",
        400
      );
    }

    if (scope === "GLOBAL" && workflowId) {
      throw new AppError(
        "Global variables cannot be associated with a specific workflow",
        400
      );
    }

    // Check if variable key already exists for this user in the same scope
    const whereClause: any = {
      key,
      userId,
      scope,
    };

    if (scope === "LOCAL") {
      whereClause.workflowId = workflowId;
    } else {
      whereClause.workflowId = null;
    }

    const existingVariable = await this.prisma.variable.findFirst({
      where: whereClause,
    });

    if (existingVariable) {
      const scopeText =
        scope === "LOCAL" ? `in workflow ${workflowId}` : "globally";
      throw new AppError(
        `A variable with this key already exists ${scopeText}`,
        400
      );
    }

    const variable = await this.prisma.variable.create({
      data: {
        key,
        value,
        description,
        scope,
        workflowId: scope === "LOCAL" ? workflowId : null,
        userId,
      },
    });

    logger.info(`Variable created: ${key} for user ${userId}`);

    return variable;
  }

  /**
   * Get variable by ID
   */
  async getVariable(id: string, userId: string): Promise<Variable | null> {
    const variable = await this.prisma.variable.findFirst({
      where: {
        id,
        userId,
      },
    });

    return variable;
  }

  /**
   * Get variable by key
   */
  async getVariableByKey(
    key: string,
    userId: string
  ): Promise<Variable | null> {
    const variable = await this.prisma.variable.findFirst({
      where: {
        key,
        userId,
      },
    });

    return variable;
  }

  /**
   * Get all variables for a user
   */
  async getVariables(
    userId: string,
    search?: string,
    scope?: "GLOBAL" | "LOCAL",
    workflowId?: string
  ): Promise<Variable[]> {
    const whereClause: any = { userId };

    if (scope) {
      whereClause.scope = scope;

      if (scope === "LOCAL" && workflowId) {
        whereClause.workflowId = workflowId;
      } else if (scope === "GLOBAL") {
        whereClause.workflowId = null;
      }
    }

    if (search) {
      whereClause.OR = [
        { key: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const variables = await this.prisma.variable.findMany({
      where: whereClause,
      orderBy: {
        key: "asc",
      },
    });

    return variables;
  }

  /**
   * Update variable
   */
  async updateVariable(
    id: string,
    userId: string,
    updates: {
      key?: string;
      value?: string;
      description?: string | null;
    }
  ): Promise<Variable> {
    const existingVariable = await this.prisma.variable.findFirst({
      where: { id, userId },
    });

    if (!existingVariable) {
      throw new AppError("Variable not found", 404);
    }

    // Check key conflicts if key is being updated
    if (updates.key && updates.key !== existingVariable.key) {
      if (!this.isValidVariableKey(updates.key)) {
        throw new AppError(
          "Variable key must contain only letters, numbers, underscores, and dots",
          400
        );
      }

      const keyConflict = await this.prisma.variable.findFirst({
        where: {
          key: updates.key,
          userId,
          id: { not: id },
        },
      });

      if (keyConflict) {
        throw new AppError("A variable with this key already exists", 400);
      }
    }

    const updateData: any = {};

    if (updates.key) {
      updateData.key = updates.key;
    }

    if (updates.value !== undefined) {
      updateData.value = updates.value;
    }

    if (updates.description !== undefined) {
      updateData.description = updates.description;
    }

    const variable = await this.prisma.variable.update({
      where: { id },
      data: updateData,
    });

    logger.info(`Variable updated: ${variable.key} for user ${userId}`);

    return variable;
  }

  /**
   * Delete variable
   */
  async deleteVariable(id: string, userId: string): Promise<void> {
    const variable = await this.prisma.variable.findFirst({
      where: { id, userId },
    });

    if (!variable) {
      throw new AppError("Variable not found", 404);
    }

    await this.prisma.variable.delete({
      where: { id },
    });

    logger.info(`Variable deleted: ${variable.key} for user ${userId}`);
  }

  /**
   * Get variable value by key for workflow execution
   */
  async getVariableValue(key: string, userId: string): Promise<string | null> {
    const variable = await this.getVariableByKey(key, userId);
    return variable ? variable.value : null;
  }

  /**
   * Get all variables as key-value pairs for workflow execution
   * Includes both global variables and local variables for the specific workflow
   */
  async getVariablesForExecution(
    userId: string,
    workflowId?: string
  ): Promise<Record<string, string>> {
    const variableMap: Record<string, string> = {};

    // Get global variables
    const globalVariables = await this.getVariables(
      userId,
      undefined,
      "GLOBAL"
    );
    for (const variable of globalVariables) {
      variableMap[variable.key] = variable.value;
    }

    // Get local variables for the specific workflow (if workflowId provided)
    if (workflowId) {
      const localVariables = await this.getVariables(
        userId,
        undefined,
        "LOCAL",
        workflowId
      );
      for (const variable of localVariables) {
        variableMap[variable.key] = variable.value;
      }
    }

    return variableMap;
  }

  /**
   * Bulk create or update variables
   */
  async bulkUpsertVariables(
    userId: string,
    variables: Array<{ key: string; value: string; description?: string }>
  ): Promise<Variable[]> {
    const results: Variable[] = [];

    for (const varData of variables) {
      if (!this.isValidVariableKey(varData.key)) {
        throw new AppError(
          `Invalid variable key "${varData.key}". Keys must contain only letters, numbers, underscores, and dots`,
          400
        );
      }

      const existingVariable = await this.getVariableByKey(varData.key, userId);

      if (existingVariable) {
        // Update existing variable
        const updated = await this.updateVariable(existingVariable.id, userId, {
          value: varData.value,
          description: varData.description,
        });
        results.push(updated);
      } else {
        // Create new variable
        const created = await this.createVariable(
          userId,
          varData.key,
          varData.value,
          varData.description
        );
        results.push(created);
      }
    }

    return results;
  }

  /**
   * Validate variable key format
   */
  private isValidVariableKey(key: string): boolean {
    // Allow alphanumeric characters, underscores, and dots
    // Must start with a letter or underscore
    return /^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(key);
  }

  /**
   * Replace variable references in text with their values
   * Format:
   *   - $vars.variableName (global variables)
   *   - $local.variableName (local/workflow-specific variables)
   *   - $vars['variable.name'] (global with special chars)
   *   - $local['variable.name'] (local with special chars)
   */
  async replaceVariablesInText(
    text: string,
    userId: string,
    workflowId?: string
  ): Promise<string> {
    // Get global variables
    const globalVariables = await this.getVariablesForExecution(userId);

    // Get local variables for the workflow if workflowId is provided
    const localVariables: Record<string, string> = {};
    if (workflowId) {
      const locals = await this.getVariables(
        userId,
        undefined,
        "LOCAL",
        workflowId
      );
      for (const variable of locals) {
        localVariables[variable.key] = variable.value;
      }
    }

    let result = text;

    // Replace $vars.variableName pattern (global variables)
    result = result.replace(
      /\$vars\.([a-zA-Z_][a-zA-Z0-9_.]*)/g,
      (match, varName) => {
        return globalVariables[varName] !== undefined
          ? globalVariables[varName]
          : match;
      }
    );

    // Replace $local.variableName pattern (local variables)
    result = result.replace(
      /\$local\.([a-zA-Z_][a-zA-Z0-9_.]*)/g,
      (match, varName) => {
        return localVariables[varName] !== undefined
          ? localVariables[varName]
          : match;
      }
    );

    // Replace $vars['variable.name'] pattern for global variables with special characters
    result = result.replace(/\$vars\['([^']+)'\]/g, (match, varName) => {
      return globalVariables[varName] !== undefined
        ? globalVariables[varName]
        : match;
    });

    // Replace $local['variable.name'] pattern for local variables with special characters
    result = result.replace(/\$local\['([^']+)'\]/g, (match, varName) => {
      return localVariables[varName] !== undefined
        ? localVariables[varName]
        : match;
    });

    // Replace $vars["variable.name"] pattern for global variables with special characters
    result = result.replace(/\$vars\["([^"]+)"\]/g, (match, varName) => {
      return globalVariables[varName] !== undefined
        ? globalVariables[varName]
        : match;
    });

    // Replace $local["variable.name"] pattern for local variables with special characters
    result = result.replace(/\$local\["([^"]+)"\]/g, (match, varName) => {
      return localVariables[varName] !== undefined
        ? localVariables[varName]
        : match;
    });

    return result;
  }

  /**
   * Get statistics about variables usage
   */
  async getVariableStats(userId: string): Promise<{
    totalVariables: number;
    recentlyUpdated: number;
    keysWithDots: number;
  }> {
    const variables = await this.getVariables(userId);
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    return {
      totalVariables: variables.length,
      recentlyUpdated: variables.filter((v) => v.updatedAt > oneDayAgo).length,
      keysWithDots: variables.filter((v) => v.key.includes(".")).length,
    };
  }
}
