import { db } from '../../db/client';
import { variables } from '../../db/schema/variables';
import { VariableServiceDrizzle } from '../../services/VariableService.drizzle';
import { eq, and } from 'drizzle-orm';

describe('VariableService with Drizzle', () => {
  let variableService: VariableServiceDrizzle;
  let testUserId: string;
  let testVariableIds: string[] = [];

  beforeAll(async () => {
    variableService = new VariableServiceDrizzle();
    testUserId = `test-user-${Date.now()}`;
  });

  afterEach(async () => {
    // Clean up test variables after each test
    for (const varId of testVariableIds) {
      try {
        await db.delete(variables).where(eq(variables.id, varId));
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    testVariableIds = [];
  });

  describe('createVariable', () => {
    it('should create a global variable', async () => {
      const key = `test_var_${Date.now()}`;
      const value = 'test_value';
      const description = 'Test variable';

      const variable = await variableService.createVariable(
        testUserId,
        key,
        value,
        description,
        'GLOBAL'
      );

      testVariableIds.push(variable.id);

      expect(variable).toBeDefined();
      expect(variable.key).toBe(key);
      expect(variable.value).toBe(value);
      expect(variable.description).toBe(description);
      expect(variable.scope).toBe('GLOBAL');
      expect(variable.userId).toBe(testUserId);
      expect(variable.workflowId).toBeNull();
    });

    it('should create a local variable with workflow ID', async () => {
      const key = `local_var_${Date.now()}`;
      const value = 'local_value';
      const workflowId = `workflow-${Date.now()}`;

      const variable = await variableService.createVariable(
        testUserId,
        key,
        value,
        undefined,
        'LOCAL',
        workflowId
      );

      testVariableIds.push(variable.id);

      expect(variable).toBeDefined();
      expect(variable.key).toBe(key);
      expect(variable.value).toBe(value);
      expect(variable.scope).toBe('LOCAL');
      expect(variable.workflowId).toBe(workflowId);
    });

    it('should reject local variable without workflow ID', async () => {
      const key = `invalid_local_${Date.now()}`;

      await expect(
        variableService.createVariable(
          testUserId,
          key,
          'value',
          undefined,
          'LOCAL'
        )
      ).rejects.toThrow('Local variables must be associated with a workflow');
    });

    it('should reject global variable with workflow ID', async () => {
      const key = `invalid_global_${Date.now()}`;

      await expect(
        variableService.createVariable(
          testUserId,
          key,
          'value',
          undefined,
          'GLOBAL',
          'workflow-123'
        )
      ).rejects.toThrow('Global variables cannot be associated with a specific workflow');
    });

    it('should reject invalid variable key format', async () => {
      const invalidKeys = ['123invalid', 'invalid-key', 'invalid key', 'invalid@key'];

      for (const key of invalidKeys) {
        await expect(
          variableService.createVariable(testUserId, key, 'value')
        ).rejects.toThrow('Variable key must contain only letters, numbers, underscores, and dots');
      }
    });

    it('should accept valid variable key formats', async () => {
      const validKeys = ['valid_key', 'validKey', 'valid.key', '_valid', 'VALID_KEY_123'];

      for (const key of validKeys) {
        const variable = await variableService.createVariable(
          testUserId,
          key,
          'value'
        );
        testVariableIds.push(variable.id);
        expect(variable.key).toBe(key);
      }
    });

    it('should reject duplicate key in same scope', async () => {
      const key = `duplicate_${Date.now()}`;

      await variableService.createVariable(testUserId, key, 'value1');

      await expect(
        variableService.createVariable(testUserId, key, 'value2')
      ).rejects.toThrow('A variable with this key already exists');
    });

    it('should allow same key in different scopes', async () => {
      const key = `same_key_${Date.now()}`;
      const workflowId = `workflow-${Date.now()}`;

      const globalVar = await variableService.createVariable(
        testUserId,
        key,
        'global_value',
        undefined,
        'GLOBAL'
      );

      const localVar = await variableService.createVariable(
        testUserId,
        key,
        'local_value',
        undefined,
        'LOCAL',
        workflowId
      );

      testVariableIds.push(globalVar.id, localVar.id);

      expect(globalVar.scope).toBe('GLOBAL');
      expect(localVar.scope).toBe('LOCAL');
    });

    it('should support workspace scoping', async () => {
      const key = `workspace_var_${Date.now()}`;
      const workspaceId = `workspace-${Date.now()}`;

      const variable = await variableService.createVariable(
        testUserId,
        key,
        'value',
        undefined,
        'GLOBAL',
        undefined,
        { workspaceId }
      );

      testVariableIds.push(variable.id);

      expect(variable.workspaceId).toBe(workspaceId);
    });
  });

  describe('getVariable', () => {
    it('should retrieve variable by ID', async () => {
      const key = `get_var_${Date.now()}`;
      const created = await variableService.createVariable(
        testUserId,
        key,
        'test_value'
      );
      testVariableIds.push(created.id);

      const retrieved = await variableService.getVariable(created.id, testUserId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.key).toBe(key);
      expect(retrieved?.value).toBe('test_value');
    });

    it('should return null for non-existent variable', async () => {
      const retrieved = await variableService.getVariable('non-existent-id', testUserId);
      expect(retrieved).toBeNull();
    });

    it('should return null for variable from different user', async () => {
      const key = `other_user_var_${Date.now()}`;
      const created = await variableService.createVariable(
        testUserId,
        key,
        'value'
      );
      testVariableIds.push(created.id);

      const retrieved = await variableService.getVariable(created.id, 'different-user');
      expect(retrieved).toBeNull();
    });

    it('should respect workspace scoping', async () => {
      const key = `workspace_scoped_${Date.now()}`;
      const workspaceId = `workspace-${Date.now()}`;

      const created = await variableService.createVariable(
        testUserId,
        key,
        'value',
        undefined,
        'GLOBAL',
        undefined,
        { workspaceId }
      );
      testVariableIds.push(created.id);

      const retrieved = await variableService.getVariable(created.id, testUserId, {
        workspaceId,
      });
      expect(retrieved).toBeDefined();

      const notRetrieved = await variableService.getVariable(created.id, testUserId, {
        workspaceId: 'different-workspace',
      });
      expect(notRetrieved).toBeNull();
    });
  });

  describe('getVariableByKey', () => {
    it('should retrieve variable by key', async () => {
      const key = `key_lookup_${Date.now()}`;
      const created = await variableService.createVariable(
        testUserId,
        key,
        'test_value'
      );
      testVariableIds.push(created.id);

      const retrieved = await variableService.getVariableByKey(key, testUserId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.key).toBe(key);
      expect(retrieved?.value).toBe('test_value');
    });

    it('should return null for non-existent key', async () => {
      const retrieved = await variableService.getVariableByKey('non-existent-key', testUserId);
      expect(retrieved).toBeNull();
    });
  });

  describe('getVariables', () => {
    it('should retrieve all variables for user', async () => {
      const key1 = `var1_${Date.now()}`;
      const key2 = `var2_${Date.now()}`;

      const var1 = await variableService.createVariable(testUserId, key1, 'value1');
      const var2 = await variableService.createVariable(testUserId, key2, 'value2');
      testVariableIds.push(var1.id, var2.id);

      const variables = await variableService.getVariables(testUserId);

      expect(Array.isArray(variables)).toBe(true);
      expect(variables.length).toBeGreaterThanOrEqual(2);
      expect(variables.some((v) => v.key === key1)).toBe(true);
      expect(variables.some((v) => v.key === key2)).toBe(true);
    });

    it('should filter by scope', async () => {
      const globalKey = `global_${Date.now()}`;
      const localKey = `local_${Date.now()}`;
      const workflowId = `workflow-${Date.now()}`;

      const globalVar = await variableService.createVariable(
        testUserId,
        globalKey,
        'global_value',
        undefined,
        'GLOBAL'
      );

      const localVar = await variableService.createVariable(
        testUserId,
        localKey,
        'local_value',
        undefined,
        'LOCAL',
        workflowId
      );

      testVariableIds.push(globalVar.id, localVar.id);

      const globalVars = await variableService.getVariables(testUserId, undefined, 'GLOBAL');
      const localVars = await variableService.getVariables(testUserId, undefined, 'LOCAL');

      expect(globalVars.some((v) => v.key === globalKey)).toBe(true);
      expect(globalVars.some((v) => v.key === localKey)).toBe(false);

      expect(localVars.some((v) => v.key === localKey)).toBe(true);
      expect(localVars.some((v) => v.key === globalKey)).toBe(false);
    });

    it('should filter by workflow ID for local variables', async () => {
      const workflowId1 = `workflow1-${Date.now()}`;
      const workflowId2 = `workflow2-${Date.now()}`;

      const var1 = await variableService.createVariable(
        testUserId,
        `var1_${Date.now()}`,
        'value1',
        undefined,
        'LOCAL',
        workflowId1
      );

      const var2 = await variableService.createVariable(
        testUserId,
        `var2_${Date.now()}`,
        'value2',
        undefined,
        'LOCAL',
        workflowId2
      );

      testVariableIds.push(var1.id, var2.id);

      const workflow1Vars = await variableService.getVariables(
        testUserId,
        undefined,
        'LOCAL',
        workflowId1
      );

      expect(workflow1Vars.some((v) => v.id === var1.id)).toBe(true);
      expect(workflow1Vars.some((v) => v.id === var2.id)).toBe(false);
    });

    it('should search by key and description', async () => {
      const key = `searchable_${Date.now()}`;
      const description = 'This is a searchable variable';

      const variable = await variableService.createVariable(
        testUserId,
        key,
        'value',
        description
      );
      testVariableIds.push(variable.id);

      const byKey = await variableService.getVariables(testUserId, 'searchable');
      expect(byKey.some((v) => v.id === variable.id)).toBe(true);

      const byDescription = await variableService.getVariables(testUserId, 'searchable variable');
      expect(byDescription.some((v) => v.id === variable.id)).toBe(true);
    });

    it('should return variables sorted by key', async () => {
      const var1 = await variableService.createVariable(testUserId, `z_var_${Date.now()}`, 'value');
      const var2 = await variableService.createVariable(testUserId, `a_var_${Date.now()}`, 'value');
      testVariableIds.push(var1.id, var2.id);

      const result = await variableService.getVariables(testUserId);
      const keys = result.map((v) => v.key);

      const var1Index = keys.indexOf(var1.key);
      const var2Index = keys.indexOf(var2.key);

      expect(var2Index).toBeLessThan(var1Index);
    });
  });

  describe('updateVariable', () => {
    it('should update variable value', async () => {
      const key = `update_var_${Date.now()}`;
      const created = await variableService.createVariable(testUserId, key, 'original_value');
      testVariableIds.push(created.id);

      const updated = await variableService.updateVariable(created.id, testUserId, {
        value: 'new_value',
      });

      expect(updated.value).toBe('new_value');
      expect(updated.key).toBe(key);
    });

    it('should update variable key', async () => {
      const oldKey = `old_key_${Date.now()}`;
      const newKey = `new_key_${Date.now()}`;
      const created = await variableService.createVariable(testUserId, oldKey, 'value');
      testVariableIds.push(created.id);

      const updated = await variableService.updateVariable(created.id, testUserId, {
        key: newKey,
      });

      expect(updated.key).toBe(newKey);
    });

    it('should update variable description', async () => {
      const key = `desc_var_${Date.now()}`;
      const created = await variableService.createVariable(testUserId, key, 'value', 'old description');
      testVariableIds.push(created.id);

      const updated = await variableService.updateVariable(created.id, testUserId, {
        description: 'new description',
      });

      expect(updated.description).toBe('new description');
    });

    it('should reject invalid key format on update', async () => {
      const key = `valid_key_${Date.now()}`;
      const created = await variableService.createVariable(testUserId, key, 'value');
      testVariableIds.push(created.id);

      await expect(
        variableService.updateVariable(created.id, testUserId, {
          key: 'invalid-key',
        })
      ).rejects.toThrow('Variable key must contain only letters, numbers, underscores, and dots');
    });

    it('should reject duplicate key on update', async () => {
      const key1 = `key1_${Date.now()}`;
      const key2 = `key2_${Date.now()}`;

      const var1 = await variableService.createVariable(testUserId, key1, 'value1');
      const var2 = await variableService.createVariable(testUserId, key2, 'value2');
      testVariableIds.push(var1.id, var2.id);

      await expect(
        variableService.updateVariable(var1.id, testUserId, {
          key: key2,
        })
      ).rejects.toThrow('A variable with this key already exists');
    });

    it('should return null for non-existent variable', async () => {
      await expect(
        variableService.updateVariable('non-existent-id', testUserId, {
          value: 'new_value',
        })
      ).rejects.toThrow('Variable not found');
    });
  });

  describe('deleteVariable', () => {
    it('should delete a variable', async () => {
      const key = `delete_var_${Date.now()}`;
      const created = await variableService.createVariable(testUserId, key, 'value');

      await variableService.deleteVariable(created.id, testUserId);

      const retrieved = await variableService.getVariable(created.id, testUserId);
      expect(retrieved).toBeNull();
    });

    it('should throw error for non-existent variable', async () => {
      await expect(
        variableService.deleteVariable('non-existent-id', testUserId)
      ).rejects.toThrow('Variable not found');
    });

    it('should throw error when deleting variable from different user', async () => {
      const key = `other_user_delete_${Date.now()}`;
      const created = await variableService.createVariable(testUserId, key, 'value');
      testVariableIds.push(created.id);

      await expect(
        variableService.deleteVariable(created.id, 'different-user')
      ).rejects.toThrow('Variable not found');
    });
  });

  describe('getVariableValue', () => {
    it('should retrieve variable value by key', async () => {
      const key = `value_lookup_${Date.now()}`;
      const value = 'test_value_123';

      await variableService.createVariable(testUserId, key, value);

      const retrieved = await variableService.getVariableValue(key, testUserId);

      expect(retrieved).toBe(value);
    });

    it('should return null for non-existent key', async () => {
      const retrieved = await variableService.getVariableValue('non-existent-key', testUserId);
      expect(retrieved).toBeNull();
    });
  });

  describe('getVariablesForExecution', () => {
    it('should return global variables as key-value pairs', async () => {
      const key1 = `exec_var1_${Date.now()}`;
      const key2 = `exec_var2_${Date.now()}`;

      await variableService.createVariable(testUserId, key1, 'value1');
      await variableService.createVariable(testUserId, key2, 'value2');

      const result = await variableService.getVariablesForExecution(testUserId);

      expect(result[key1]).toBe('value1');
      expect(result[key2]).toBe('value2');
    });

    it('should include both global and local variables for workflow', async () => {
      const globalKey = `global_exec_${Date.now()}`;
      const localKey = `local_exec_${Date.now()}`;
      const workflowId = `workflow-${Date.now()}`;

      const globalVar = await variableService.createVariable(
        testUserId,
        globalKey,
        'global_value',
        undefined,
        'GLOBAL'
      );

      const localVar = await variableService.createVariable(
        testUserId,
        localKey,
        'local_value',
        undefined,
        'LOCAL',
        workflowId
      );

      testVariableIds.push(globalVar.id, localVar.id);

      const result = await variableService.getVariablesForExecution(testUserId, workflowId);

      expect(result[globalKey]).toBe('global_value');
      expect(result[localKey]).toBe('local_value');
    });

    it('should not include local variables without workflow ID', async () => {
      const globalKey = `global_only_${Date.now()}`;
      const localKey = `local_only_${Date.now()}`;
      const workflowId = `workflow-${Date.now()}`;

      const globalVar = await variableService.createVariable(
        testUserId,
        globalKey,
        'global_value',
        undefined,
        'GLOBAL'
      );

      const localVar = await variableService.createVariable(
        testUserId,
        localKey,
        'local_value',
        undefined,
        'LOCAL',
        workflowId
      );

      testVariableIds.push(globalVar.id, localVar.id);

      const result = await variableService.getVariablesForExecution(testUserId);

      expect(result[globalKey]).toBe('global_value');
      expect(result[localKey]).toBeUndefined();
    });
  });

  describe('bulkUpsertVariables', () => {
    it('should create new variables', async () => {
      const vars = [
        { key: `bulk1_${Date.now()}`, value: 'value1', description: 'desc1' },
        { key: `bulk2_${Date.now()}`, value: 'value2', description: 'desc2' },
      ];

      const result = await variableService.bulkUpsertVariables(testUserId, vars);

      testVariableIds.push(...result.map((v) => v.id));

      expect(result.length).toBe(2);
      expect(result[0].key).toBe(vars[0].key);
      expect(result[1].key).toBe(vars[1].key);
    });

    it('should update existing variables', async () => {
      const key = `bulk_update_${Date.now()}`;
      const created = await variableService.createVariable(testUserId, key, 'original_value');
      testVariableIds.push(created.id);

      const result = await variableService.bulkUpsertVariables(testUserId, [
        { key, value: 'updated_value', description: 'new description' },
      ]);

      expect(result.length).toBe(1);
      expect(result[0].value).toBe('updated_value');
      expect(result[0].description).toBe('new description');
    });

    it('should reject invalid keys', async () => {
      const vars = [
        { key: 'invalid-key', value: 'value1' },
      ];

      await expect(
        variableService.bulkUpsertVariables(testUserId, vars)
      ).rejects.toThrow('Invalid variable key');
    });
  });

  describe('replaceVariablesInText', () => {
    it('should replace global variable references', async () => {
      const key = `replace_var_${Date.now()}`;
      await variableService.createVariable(testUserId, key, 'replaced_value');

      const text = `This is a $vars.${key} in text`;
      const result = await variableService.replaceVariablesInText(text, testUserId);

      expect(result).toBe('This is a replaced_value in text');
    });

    it('should handle non-existent variable references', async () => {
      const text = 'This is a $vars.non_existent in text';
      const result = await variableService.replaceVariablesInText(text, testUserId);

      expect(result).toBe('This is a $vars.non_existent in text');
    });

    it('should replace variables with special characters using bracket notation', async () => {
      const key = `special.var.name_${Date.now()}`;
      await variableService.createVariable(testUserId, key, 'special_value');

      const text = `Value: $vars['${key}']`;
      const result = await variableService.replaceVariablesInText(text, testUserId);

      expect(result).toBe('Value: special_value');
    });
  });

  describe('getVariableStats', () => {
    it('should return variable statistics', async () => {
      const key1 = `stat_var1_${Date.now()}`;
      const key2 = `stat.var2_${Date.now()}`;

      await variableService.createVariable(testUserId, key1, 'value1');
      await variableService.createVariable(testUserId, key2, 'value2');

      const stats = await variableService.getVariableStats(testUserId);

      expect(stats.totalVariables).toBeGreaterThanOrEqual(2);
      expect(stats.keysWithDots).toBeGreaterThanOrEqual(1);
      expect(typeof stats.recentlyUpdated).toBe('number');
    });
  });
});
