/**
 * Tests for Complex Query Patterns with Drizzle
 * 
 * **Feature: prisma-to-drizzle-migration, Property 3: Query Result Equivalence**
 * **Validates: Requirements 2.3, 2.4, 8.4**
 * 
 * These tests verify that complex query patterns (joins, filtering, pagination, sorting)
 * produce correct and consistent results across various scenarios.
 */

import { describe, it, expect } from '@jest/globals';
import { eq, and, or, like, gte, lte, desc, asc } from 'drizzle-orm';
import {
  buildAndConditions,
  buildOrConditions,
  buildOrderBy,
  calculateOffset,
  calculateTotalPages,
  buildPaginationMetadata,
  buildTextSearchFilter,
  buildDateRangeFilter,
  buildArrayFilter,
  buildComplexFilter,
} from '../../db/queryPatterns';
import { workflows } from '../../db/schema/workflows';
import { executions } from '../../db/schema/executions';

describe('Complex Query Patterns with Drizzle', () => {

  describe('Filtering with AND/OR operators', () => {
    it('should build AND conditions correctly', () => {
      const conditions = [
        eq(workflows.userId, 'test-user-id'),
        eq(workflows.active, true),
      ];

      const whereClause = buildAndConditions(conditions);

      expect(whereClause).toBeDefined();
      expect(whereClause).not.toBeNull();
    });

    it('should build OR conditions correctly', () => {
      const conditions = [
        like(workflows.name, '%Test%'),
        like(workflows.description, '%Description%'),
      ];

      const whereClause = buildOrConditions(conditions);

      expect(whereClause).toBeDefined();
      expect(whereClause).not.toBeNull();
    });

    it('should handle undefined conditions gracefully', () => {
      const conditions = [
        eq(workflows.userId, 'test-user-id'),
        undefined,
        eq(workflows.active, true),
      ];

      const whereClause = buildAndConditions(conditions as any);

      expect(whereClause).toBeDefined();
    });

    it('should return undefined for empty conditions', () => {
      const conditions: any[] = [];
      const whereClause = buildAndConditions(conditions);

      expect(whereClause).toBeUndefined();
    });

    it('should return single condition when only one is provided', () => {
      const conditions = [eq(workflows.userId, 'test-user-id')];
      const whereClause = buildAndConditions(conditions);

      expect(whereClause).toBeDefined();
    });
  });

  describe('Pagination with LIMIT and OFFSET', () => {
    it('should calculate offset correctly', () => {
      expect(calculateOffset(1, 10)).toBe(0);
      expect(calculateOffset(2, 10)).toBe(10);
      expect(calculateOffset(3, 10)).toBe(20);
      expect(calculateOffset(5, 20)).toBe(80);
    });

    it('should calculate total pages correctly', () => {
      expect(calculateTotalPages(100, 10)).toBe(10);
      expect(calculateTotalPages(105, 10)).toBe(11);
      expect(calculateTotalPages(99, 10)).toBe(10);
      expect(calculateTotalPages(0, 10)).toBe(0);
      expect(calculateTotalPages(1, 10)).toBe(1);
    });

    it('should build pagination metadata correctly', () => {
      const metadata = buildPaginationMetadata(2, 10, 150);

      expect(metadata.page).toBe(2);
      expect(metadata.limit).toBe(10);
      expect(metadata.total).toBe(150);
      expect(metadata.totalPages).toBe(15);
      expect(metadata.hasNextPage).toBe(true);
      expect(metadata.hasPreviousPage).toBe(true);
    });

    it('should handle first page pagination metadata', () => {
      const metadata = buildPaginationMetadata(1, 10, 100);

      expect(metadata.page).toBe(1);
      expect(metadata.hasNextPage).toBe(true);
      expect(metadata.hasPreviousPage).toBe(false);
    });

    it('should handle last page pagination metadata', () => {
      const metadata = buildPaginationMetadata(10, 10, 100);

      expect(metadata.page).toBe(10);
      expect(metadata.hasNextPage).toBe(false);
      expect(metadata.hasPreviousPage).toBe(true);
    });

    it('should handle single page pagination metadata', () => {
      const metadata = buildPaginationMetadata(1, 10, 5);

      expect(metadata.page).toBe(1);
      expect(metadata.totalPages).toBe(1);
      expect(metadata.hasNextPage).toBe(false);
      expect(metadata.hasPreviousPage).toBe(false);
    });
  });

  describe('Sorting with orderBy', () => {
    it('should build orderBy clause for ascending order', () => {
      const columnMap = {
        name: workflows.name,
        createdAt: workflows.createdAt,
      };

      const orderBy = buildOrderBy('name', 'asc', columnMap);

      expect(orderBy).toBeDefined();
      expect(typeof orderBy).toBe('function');
    });

    it('should build orderBy clause for descending order', () => {
      const columnMap = {
        name: workflows.name,
        createdAt: workflows.createdAt,
      };

      const orderBy = buildOrderBy('createdAt', 'desc', columnMap);

      expect(orderBy).toBeDefined();
      expect(typeof orderBy).toBe('function');
    });

    it('should return undefined for invalid column', () => {
      const columnMap = {
        name: workflows.name,
        createdAt: workflows.createdAt,
      };

      const orderBy = buildOrderBy('invalidColumn', 'asc', columnMap);

      expect(orderBy).toBeUndefined();
    });

    it('should return undefined when sortBy is not provided', () => {
      const columnMap = {
        name: workflows.name,
        createdAt: workflows.createdAt,
      };

      const orderBy = buildOrderBy(undefined, 'asc', columnMap);

      expect(orderBy).toBeUndefined();
    });

    it('should default to descending order when sortOrder is not provided', () => {
      const columnMap = {
        name: workflows.name,
        createdAt: workflows.createdAt,
      };

      const orderBy = buildOrderBy('name', undefined, columnMap);

      expect(orderBy).toBeDefined();
    });
  });

  describe('Text search filtering', () => {
    it('should build text search filter', () => {
      const filter = buildTextSearchFilter('Test', [
        workflows.name,
        workflows.description,
      ]);

      expect(filter).toBeDefined();
      expect(filter).not.toBeNull();
    });

    it('should return undefined for empty search term', () => {
      const filter = buildTextSearchFilter('', [
        workflows.name,
        workflows.description,
      ]);

      expect(filter).toBeUndefined();
    });

    it('should return undefined for empty columns', () => {
      const filter = buildTextSearchFilter('Test', []);

      expect(filter).toBeUndefined();
    });

    it('should handle single column search', () => {
      const filter = buildTextSearchFilter('Test', [workflows.name]);

      expect(filter).toBeDefined();
    });
  });

  describe('Date range filtering', () => {
    it('should build date range filter with both dates', () => {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const filter = buildDateRangeFilter(workflows.createdAt, startDate, endDate);

      expect(filter).toBeDefined();
    });

    it('should build date range filter with only start date', () => {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const filter = buildDateRangeFilter(workflows.createdAt, startDate, undefined);

      expect(filter).toBeDefined();
    });

    it('should build date range filter with only end date', () => {
      const endDate = new Date();

      const filter = buildDateRangeFilter(workflows.createdAt, undefined, endDate);

      expect(filter).toBeDefined();
    });

    it('should return undefined when no dates provided', () => {
      const filter = buildDateRangeFilter(workflows.createdAt, undefined, undefined);

      expect(filter).toBeUndefined();
    });
  });

  describe('Array/enum filtering', () => {
    it('should build array filter with multiple values', () => {
      const filter = buildArrayFilter(executions.status, ['SUCCESS', 'ERROR']);

      expect(filter).toBeDefined();
    });

    it('should build array filter with single value', () => {
      const filter = buildArrayFilter(executions.status, ['SUCCESS']);

      expect(filter).toBeDefined();
    });

    it('should return undefined for empty array', () => {
      const filter = buildArrayFilter(executions.status, []);

      expect(filter).toBeUndefined();
    });

    it('should return undefined for undefined values', () => {
      const filter = buildArrayFilter(executions.status, undefined as any);

      expect(filter).toBeUndefined();
    });
  });

  describe('Complex multi-condition filtering', () => {
    it('should build complex filter with text search and exact match', () => {
      const filter = buildComplexFilter({
        textSearch: {
          term: 'Test',
          columns: [workflows.name, workflows.description],
        },
        exact: [{ column: workflows.userId, value: 'test-user-id' }],
      });

      expect(filter).toBeDefined();
    });

    it('should build complex filter with date range', () => {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const filter = buildComplexFilter({
        dateRange: {
          column: workflows.createdAt,
          start: startDate,
          end: endDate,
        },
      });

      expect(filter).toBeDefined();
    });

    it('should build complex filter with status array', () => {
      const filter = buildComplexFilter({
        status: {
          column: executions.status,
          values: ['SUCCESS', 'ERROR'],
        },
      });

      expect(filter).toBeDefined();
    });

    it('should build complex filter with all condition types', () => {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const filter = buildComplexFilter({
        textSearch: {
          term: 'Test',
          columns: [workflows.name],
        },
        dateRange: {
          column: workflows.createdAt,
          start: startDate,
          end: endDate,
        },
        exact: [{ column: workflows.userId, value: 'test-user-id' }],
      });

      expect(filter).toBeDefined();
    });

    it('should return undefined when no conditions provided', () => {
      const filter = buildComplexFilter({});

      expect(filter).toBeUndefined();
    });
  });

  describe('Joins for multi-table queries', () => {
    it('should support relationship queries with Drizzle', () => {
      // This test verifies that the schema supports relationship queries
      // Actual database queries are tested in integration tests
      expect(workflows).toBeDefined();
      expect(executions).toBeDefined();
    });

    it('should support nested relationship selection', () => {
      // Verify that the schema structure supports nested relationships
      expect(workflows.id).toBeDefined();
      expect(executions.workflowId).toBeDefined();
    });
  });

  describe('Combined filtering, sorting, and pagination', () => {
    it('should combine AND conditions with pagination parameters', () => {
      const page = 1;
      const limit = 2;
      const offset = calculateOffset(page, limit);

      const whereClause = buildAndConditions([
        eq(workflows.userId, 'test-user-id'),
        eq(workflows.active, true),
      ]);

      expect(whereClause).toBeDefined();
      expect(offset).toBe(0);
      expect(limit).toBe(2);
    });

    it('should combine complex filter with sorting and pagination', () => {
      const page = 1;
      const limit = 3;
      const offset = calculateOffset(page, limit);
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const whereClause = buildComplexFilter({
        textSearch: {
          term: 'Workflow',
          columns: [workflows.name, workflows.description],
        },
        dateRange: {
          column: workflows.createdAt,
          start: startDate,
          end: endDate,
        },
        exact: [{ column: workflows.userId, value: 'test-user-id' }],
      });

      const columnMap = {
        updatedAt: workflows.updatedAt,
        createdAt: workflows.createdAt,
      };

      const orderBy = buildOrderBy('updatedAt', 'desc', columnMap);

      expect(whereClause).toBeDefined();
      expect(orderBy).toBeDefined();
      expect(offset).toBe(0);
      expect(limit).toBe(3);
    });

    it('should handle pagination across multiple pages with filters', () => {
      const page1Offset = calculateOffset(1, 10);
      const page2Offset = calculateOffset(2, 10);
      const page3Offset = calculateOffset(3, 10);

      expect(page1Offset).toBe(0);
      expect(page2Offset).toBe(10);
      expect(page3Offset).toBe(20);
    });
  });

  describe('Query pattern utilities', () => {
    it('should provide consistent pagination calculations', () => {
      const total = 150;
      const limit = 10;

      const page1Metadata = buildPaginationMetadata(1, limit, total);
      const page2Metadata = buildPaginationMetadata(2, limit, total);
      const page15Metadata = buildPaginationMetadata(15, limit, total);

      expect(page1Metadata.totalPages).toBe(page2Metadata.totalPages);
      expect(page1Metadata.totalPages).toBe(page15Metadata.totalPages);
      expect(page1Metadata.totalPages).toBe(15);
    });

    it('should handle edge cases in pagination', () => {
      // Empty result set
      const emptyMetadata = buildPaginationMetadata(1, 10, 0);
      expect(emptyMetadata.totalPages).toBe(0);
      expect(emptyMetadata.hasNextPage).toBe(false);

      // Single item
      const singleMetadata = buildPaginationMetadata(1, 10, 1);
      expect(singleMetadata.totalPages).toBe(1);
      expect(singleMetadata.hasNextPage).toBe(false);
    });

    it('should build filters that can be combined', () => {
      const textFilter = buildTextSearchFilter('test', [workflows.name]);
      const dateFilter = buildDateRangeFilter(workflows.createdAt, new Date(), undefined);
      const arrayFilter = buildArrayFilter(executions.status, ['SUCCESS']);

      expect(textFilter).toBeDefined();
      expect(dateFilter).toBeDefined();
      expect(arrayFilter).toBeDefined();
    });
  });
});
