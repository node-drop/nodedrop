/**
 * Complex Query Patterns for Drizzle ORM
 * 
 * This module provides reusable patterns for implementing complex database queries
 * including joins, filtering, pagination, and sorting.
 * 
 * Validates: Requirements 2.3, 2.4, 8.4
 */

import {
  and,
  or,
  eq,
  like,
  gte,
  lte,
  inArray,
  desc,
  asc,
  count,
  sum,
  avg,
  min,
  max,
  SQL,
  AnyColumn,
} from 'drizzle-orm';
import { db } from './client';
import { logger } from '../utils/logger';

/**
 * Pagination options
 */
export interface PaginationOptions {
  page?: number;
  limit?: number;
}

/**
 * Sorting options
 */
export interface SortOptions {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Query result with pagination metadata
 */
export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

/**
 * Build a WHERE clause from multiple filter conditions
 * Combines conditions with AND logic
 * 
 * Example:
 * ```typescript
 * const whereClause = buildAndConditions([
 *   eq(users.active, true),
 *   gte(users.createdAt, startDate),
 *   like(users.email, '%@example.com')
 * ]);
 * ```
 */
export function buildAndConditions(conditions: (SQL<any> | undefined)[]): SQL<any> | undefined {
  const validConditions = conditions.filter((c) => c !== undefined) as SQL<any>[];
  
  if (validConditions.length === 0) {
    return undefined;
  }
  
  if (validConditions.length === 1) {
    return validConditions[0];
  }
  
  return and(...validConditions);
}

/**
 * Build a WHERE clause from multiple filter conditions
 * Combines conditions with OR logic
 * 
 * Example:
 * ```typescript
 * const whereClause = buildOrConditions([
 *   like(workflows.name, '%search%'),
 *   like(workflows.description, '%search%')
 * ]);
 * ```
 */
export function buildOrConditions(conditions: (SQL<any> | undefined)[]): SQL<any> | undefined {
  const validConditions = conditions.filter((c) => c !== undefined) as SQL<any>[];
  
  if (validConditions.length === 0) {
    return undefined;
  }
  
  if (validConditions.length === 1) {
    return validConditions[0];
  }
  
  return or(...validConditions);
}

/**
 * Build an ORDER BY clause from sort options
 * 
 * Example:
 * ```typescript
 * const orderBy = buildOrderBy('createdAt', 'desc', (table) => ({
 *   createdAt: table.createdAt,
 *   name: table.name,
 *   updatedAt: table.updatedAt,
 * }));
 * ```
 */
export function buildOrderBy(
  sortBy: string | undefined,
  sortOrder: 'asc' | 'desc' | undefined,
  columnMap: Record<string, AnyColumn>
): ((table: any) => any) | undefined {
  if (!sortBy || !columnMap[sortBy]) {
    return undefined;
  }

  const column = columnMap[sortBy];
  const order = sortOrder === 'asc' ? asc : desc;

  return (table: any) => order(column);
}

/**
 * Calculate pagination offset from page and limit
 * 
 * Example:
 * ```typescript
 * const offset = calculateOffset(2, 10); // Returns 10 (skip first 10 items)
 * ```
 */
export function calculateOffset(page: number = 1, limit: number = 10): number {
  return Math.max(0, (page - 1) * limit);
}

/**
 * Calculate total pages from total count and limit
 * 
 * Example:
 * ```typescript
 * const totalPages = calculateTotalPages(150, 10); // Returns 15
 * ```
 */
export function calculateTotalPages(total: number, limit: number): number {
  return Math.ceil(total / limit);
}

/**
 * Build pagination metadata
 * 
 * Example:
 * ```typescript
 * const pagination = buildPaginationMetadata(2, 10, 150);
 * // Returns { page: 2, limit: 10, total: 150, totalPages: 15, hasNextPage: true, hasPreviousPage: true }
 * ```
 */
export function buildPaginationMetadata(
  page: number = 1,
  limit: number = 10,
  total: number
): PaginatedResult<any>['pagination'] {
  const totalPages = calculateTotalPages(total, limit);
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;

  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage,
    hasPreviousPage,
  };
}

/**
 * Execute a paginated query with filtering and sorting
 * 
 * This is a generic helper that handles the common pattern of:
 * 1. Building WHERE conditions
 * 2. Counting total records
 * 3. Fetching paginated results
 * 4. Applying sorting
 * 
 * Example:
 * ```typescript
 * const result = await executePaginatedQuery({
 *   table: workflows,
 *   where: and(
 *     eq(workflows.userId, userId),
 *     like(workflows.name, '%search%')
 *   ),
 *   orderBy: (table) => desc(table.updatedAt),
 *   page: 1,
 *   limit: 10,
 * });
 * ```
 */
export async function executePaginatedQuery<T>({
  table,
  where,
  orderBy,
  page = 1,
  limit = 10,
}: {
  table: any;
  where?: SQL<any>;
  orderBy?: (table: any) => any;
  page?: number;
  limit?: number;
}): Promise<PaginatedResult<T>> {
  try {
    const offset = calculateOffset(page, limit);

    // Get total count
    const countResult = await db
      .select({ count: count() })
      .from(table)
      .where(where);

    const total = countResult[0]?.count || 0;

    // Get paginated results
    let query = db.select().from(table).where(where);

    if (orderBy) {
      query = query.orderBy(orderBy);
    }

    const data = await query.limit(limit).offset(offset);

    const pagination = buildPaginationMetadata(page, limit, total);

    return {
      data: data as T[],
      pagination,
    };
  } catch (error) {
    logger.error('Error executing paginated query:', error);
    throw error;
  }
}

/**
 * Build a complex filter with text search across multiple columns
 * 
 * Example:
 * ```typescript
 * const searchFilter = buildTextSearchFilter('search term', [
 *   workflows.name,
 *   workflows.description,
 * ]);
 * ```
 */
export function buildTextSearchFilter(
  searchTerm: string,
  columns: AnyColumn[]
): SQL<any> | undefined {
  if (!searchTerm || columns.length === 0) {
    return undefined;
  }

  const searchPattern = `%${searchTerm}%`;
  const conditions = columns.map((col) => like(col, searchPattern));

  return or(...conditions);
}

/**
 * Build a date range filter
 * 
 * Example:
 * ```typescript
 * const dateFilter = buildDateRangeFilter(
 *   workflows.createdAt,
 *   startDate,
 *   endDate
 * );
 * ```
 */
export function buildDateRangeFilter(
  column: AnyColumn,
  startDate?: Date,
  endDate?: Date
): SQL<any> | undefined {
  const conditions: SQL<any>[] = [];

  if (startDate) {
    conditions.push(gte(column, startDate));
  }

  if (endDate) {
    conditions.push(lte(column, endDate));
  }

  if (conditions.length === 0) {
    return undefined;
  }

  if (conditions.length === 1) {
    return conditions[0];
  }

  return and(...conditions);
}

/**
 * Build a filter for array/enum values
 * 
 * Example:
 * ```typescript
 * const statusFilter = buildArrayFilter(
 *   executions.status,
 *   ['SUCCESS', 'RUNNING']
 * );
 * ```
 */
export function buildArrayFilter(
  column: AnyColumn,
  values: any[]
): SQL<any> | undefined {
  if (!values || values.length === 0) {
    return undefined;
  }

  if (values.length === 1) {
    return eq(column, values[0]);
  }

  return inArray(column, values);
}

/**
 * Build a complex multi-condition filter
 * Useful for advanced search/filter scenarios
 * 
 * Example:
 * ```typescript
 * const filter = buildComplexFilter({
 *   textSearch: { term: 'search', columns: [workflows.name, workflows.description] },
 *   dateRange: { column: workflows.createdAt, start: startDate, end: endDate },
 *   status: { column: executions.status, values: ['SUCCESS', 'RUNNING'] },
 *   exact: { column: workflows.userId, value: userId },
 * });
 * ```
 */
export function buildComplexFilter({
  textSearch,
  dateRange,
  status,
  exact,
  custom,
}: {
  textSearch?: { term: string; columns: AnyColumn[] };
  dateRange?: { column: AnyColumn; start?: Date; end?: Date };
  status?: { column: AnyColumn; values: any[] };
  exact?: { column: AnyColumn; value: any }[];
  custom?: SQL<any>[];
}): SQL<any> | undefined {
  const conditions: SQL<any>[] = [];

  if (textSearch) {
    const textFilter = buildTextSearchFilter(textSearch.term, textSearch.columns);
    if (textFilter) conditions.push(textFilter);
  }

  if (dateRange) {
    const dateFilter = buildDateRangeFilter(
      dateRange.column,
      dateRange.start,
      dateRange.end
    );
    if (dateFilter) conditions.push(dateFilter);
  }

  if (status) {
    const statusFilter = buildArrayFilter(status.column, status.values);
    if (statusFilter) conditions.push(statusFilter);
  }

  if (exact) {
    exact.forEach(({ column, value }) => {
      if (value !== undefined && value !== null) {
        conditions.push(eq(column, value));
      }
    });
  }

  if (custom) {
    conditions.push(...custom.filter((c) => c !== undefined));
  }

  return buildAndConditions(conditions);
}

/**
 * Execute a query with joins and filtering
 * 
 * Example:
 * ```typescript
 * const results = await executeJoinQuery({
 *   baseTable: workflows,
 *   joins: [
 *     {
 *       table: executions,
 *       on: eq(workflows.id, executions.workflowId),
 *       type: 'left',
 *     },
 *   ],
 *   where: eq(workflows.userId, userId),
 *   orderBy: (table) => desc(table.createdAt),
 *   limit: 10,
 *   offset: 0,
 * });
 * ```
 */
export async function executeJoinQuery<T>({
  baseTable,
  joins,
  where,
  orderBy,
  limit,
  offset,
}: {
  baseTable: any;
  joins?: Array<{
    table: any;
    on: SQL<any>;
    type?: 'inner' | 'left' | 'right' | 'full';
  }>;
  where?: SQL<any>;
  orderBy?: (table: any) => any;
  limit?: number;
  offset?: number;
}): Promise<T[]> {
  try {
    let query = db.select().from(baseTable);

    if (joins) {
      for (const join of joins) {
        if (join.type === 'left') {
          query = query.leftJoin(join.table, join.on);
        } else if (join.type === 'right') {
          query = query.rightJoin(join.table, join.on);
        } else if (join.type === 'full') {
          query = query.fullJoin(join.table, join.on);
        } else {
          query = query.innerJoin(join.table, join.on);
        }
      }
    }

    if (where) {
      query = query.where(where);
    }

    if (orderBy) {
      query = query.orderBy(orderBy);
    }

    if (limit) {
      query = query.limit(limit);
    }

    if (offset) {
      query = query.offset(offset);
    }

    return await query;
  } catch (error) {
    logger.error('Error executing join query:', error);
    throw error;
  }
}

/**
 * Execute a query with aggregation (count, sum, avg, etc.)
 * 
 * Example:
 * ```typescript
 * const stats = await executeAggregationQuery({
 *   table: executions,
 *   where: eq(executions.workflowId, workflowId),
 *   aggregations: {
 *     total: count(),
 *     successCount: count(executions.id, { where: eq(executions.status, 'SUCCESS') }),
 *   },
 * });
 * ```
 */
export async function executeAggregationQuery<T>({
  table,
  where,
  aggregations,
}: {
  table: any;
  where?: SQL<any>;
  aggregations: Record<string, any>;
}): Promise<T> {
  try {
    const result = await db
      .select(aggregations)
      .from(table)
      .where(where);

    return result[0] as T;
  } catch (error) {
    logger.error('Error executing aggregation query:', error);
    throw error;
  }
}

/**
 * Build a GROUP BY clause for aggregation queries
 * 
 * Example:
 * ```typescript
 * const groupBy = buildGroupBy([
 *   executions.workflowId,
 *   executions.status,
 * ]);
 * ```
 */
export function buildGroupBy(columns: AnyColumn[]): ((table: any) => any)[] {
  return columns.map((col) => (table: any) => col);
}

/**
 * Execute a grouped aggregation query
 * 
 * Example:
 * ```typescript
 * const stats = await executeGroupedAggregationQuery({
 *   table: executions,
 *   where: eq(executions.workflowId, workflowId),
 *   groupBy: [executions.status],
 *   aggregations: {
 *     status: executions.status,
 *     count: count(),
 *   },
 * });
 * ```
 */
export async function executeGroupedAggregationQuery<T>({
  table,
  where,
  groupBy,
  aggregations,
  orderBy,
}: {
  table: any;
  where?: SQL<any>;
  groupBy: AnyColumn[];
  aggregations: Record<string, any>;
  orderBy?: (table: any) => any;
}): Promise<T[]> {
  try {
    let query = db.select(aggregations).from(table);

    if (where) {
      query = query.where(where);
    }

    if (groupBy.length > 0) {
      query = query.groupBy(...groupBy);
    }

    if (orderBy) {
      query = query.orderBy(orderBy);
    }

    return await query;
  } catch (error) {
    logger.error('Error executing grouped aggregation query:', error);
    throw error;
  }
}

/**
 * Execute a DISTINCT query
 * 
 * Example:
 * ```typescript
 * const distinctStatuses = await executeDistinctQuery({
 *   table: executions,
 *   column: executions.status,
 *   where: eq(executions.workflowId, workflowId),
 * });
 * ```
 */
export async function executeDistinctQuery<T>({
  table,
  column,
  where,
  orderBy,
  limit,
}: {
  table: any;
  column: AnyColumn;
  where?: SQL<any>;
  orderBy?: (table: any) => any;
  limit?: number;
}): Promise<T[]> {
  try {
    let query = db.selectDistinct({ value: column }).from(table);

    if (where) {
      query = query.where(where);
    }

    if (orderBy) {
      query = query.orderBy(orderBy);
    }

    if (limit) {
      query = query.limit(limit);
    }

    const results = await query;
    return results.map((r: any) => r.value) as T[];
  } catch (error) {
    logger.error('Error executing distinct query:', error);
    throw error;
  }
}

/**
 * Execute a query with LIMIT and OFFSET for pagination
 * 
 * Example:
 * ```typescript
 * const results = await executeLimitOffsetQuery({
 *   table: workflows,
 *   where: eq(workflows.userId, userId),
 *   orderBy: (table) => desc(table.createdAt),
 *   limit: 10,
 *   offset: 20,
 * });
 * ```
 */
export async function executeLimitOffsetQuery<T>({
  table,
  where,
  orderBy,
  limit,
  offset,
}: {
  table: any;
  where?: SQL<any>;
  orderBy?: (table: any) => any;
  limit?: number;
  offset?: number;
}): Promise<T[]> {
  try {
    let query = db.select().from(table);

    if (where) {
      query = query.where(where);
    }

    if (orderBy) {
      query = query.orderBy(orderBy);
    }

    if (limit) {
      query = query.limit(limit);
    }

    if (offset) {
      query = query.offset(offset);
    }

    return await query;
  } catch (error) {
    logger.error('Error executing limit/offset query:', error);
    throw error;
  }
}

/**
 * Execute a COUNT query to get the number of records
 * 
 * Example:
 * ```typescript
 * const totalCount = await executeCountQuery({
 *   table: workflows,
 *   where: eq(workflows.userId, userId),
 * });
 * ```
 */
export async function executeCountQuery({
  table,
  where,
}: {
  table: any;
  where?: SQL<any>;
}): Promise<number> {
  try {
    const result = await db
      .select({ count: count() })
      .from(table)
      .where(where);

    return result[0]?.count || 0;
  } catch (error) {
    logger.error('Error executing count query:', error);
    throw error;
  }
}

/**
 * Execute a SUM aggregation query
 * 
 * Example:
 * ```typescript
 * const totalDuration = await executeSumQuery({
 *   table: executions,
 *   column: executions.duration,
 *   where: eq(executions.workflowId, workflowId),
 * });
 * ```
 */
export async function executeSumQuery({
  table,
  column,
  where,
}: {
  table: any;
  column: AnyColumn;
  where?: SQL<any>;
}): Promise<number | null> {
  try {
    const result = await db
      .select({ sum: sum(column) })
      .from(table)
      .where(where);

    return result[0]?.sum || null;
  } catch (error) {
    logger.error('Error executing sum query:', error);
    throw error;
  }
}

/**
 * Execute an AVG (average) aggregation query
 * 
 * Example:
 * ```typescript
 * const avgDuration = await executeAvgQuery({
 *   table: executions,
 *   column: executions.duration,
 *   where: eq(executions.workflowId, workflowId),
 * });
 * ```
 */
export async function executeAvgQuery({
  table,
  column,
  where,
}: {
  table: any;
  column: AnyColumn;
  where?: SQL<any>;
}): Promise<number | null> {
  try {
    const result = await db
      .select({ avg: avg(column) })
      .from(table)
      .where(where);

    return result[0]?.avg || null;
  } catch (error) {
    logger.error('Error executing avg query:', error);
    throw error;
  }
}

/**
 * Execute a MIN aggregation query
 * 
 * Example:
 * ```typescript
 * const minDuration = await executeMinQuery({
 *   table: executions,
 *   column: executions.duration,
 *   where: eq(executions.workflowId, workflowId),
 * });
 * ```
 */
export async function executeMinQuery({
  table,
  column,
  where,
}: {
  table: any;
  column: AnyColumn;
  where?: SQL<any>;
}): Promise<any> {
  try {
    const result = await db
      .select({ min: min(column) })
      .from(table)
      .where(where);

    return result[0]?.min || null;
  } catch (error) {
    logger.error('Error executing min query:', error);
    throw error;
  }
}

/**
 * Execute a MAX aggregation query
 * 
 * Example:
 * ```typescript
 * const maxDuration = await executeMaxQuery({
 *   table: executions,
 *   column: executions.duration,
 *   where: eq(executions.workflowId, workflowId),
 * });
 * ```
 */
export async function executeMaxQuery({
  table,
  column,
  where,
}: {
  table: any;
  column: AnyColumn;
  where?: SQL<any>;
}): Promise<any> {
  try {
    const result = await db
      .select({ max: max(column) })
      .from(table)
      .where(where);

    return result[0]?.max || null;
  } catch (error) {
    logger.error('Error executing max query:', error);
    throw error;
  }
}

/**
 * Execute multiple aggregations in a single query
 * 
 * Example:
 * ```typescript
 * const stats = await executeMultipleAggregations({
 *   table: executions,
 *   where: eq(executions.workflowId, workflowId),
 *   aggregations: {
 *     totalCount: count(),
 *     totalDuration: sum(executions.duration),
 *     avgDuration: avg(executions.duration),
 *     minDuration: min(executions.duration),
 *     maxDuration: max(executions.duration),
 *   },
 * });
 * ```
 */
export async function executeMultipleAggregations<T>({
  table,
  where,
  aggregations,
}: {
  table: any;
  where?: SQL<any>;
  aggregations: Record<string, any>;
}): Promise<T> {
  try {
    const result = await db
      .select(aggregations)
      .from(table)
      .where(where);

    return result[0] as T;
  } catch (error) {
    logger.error('Error executing multiple aggregations:', error);
    throw error;
  }
}

/**
 * Execute a GROUP BY query with aggregations
 * 
 * Example:
 * ```typescript
 * const stats = await executeGroupByAggregation({
 *   table: executions,
 *   where: eq(executions.workflowId, workflowId),
 *   groupBy: [executions.status],
 *   aggregations: {
 *     status: executions.status,
 *     count: count(),
 *     avgDuration: avg(executions.duration),
 *   },
 * });
 * ```
 */
export async function executeGroupByAggregation<T>({
  table,
  where,
  groupBy,
  aggregations,
  orderBy,
  having,
}: {
  table: any;
  where?: SQL<any>;
  groupBy: AnyColumn[];
  aggregations: Record<string, any>;
  orderBy?: (table: any) => any;
  having?: SQL<any>;
}): Promise<T[]> {
  try {
    let query = db.select(aggregations).from(table);

    if (where) {
      query = query.where(where);
    }

    if (groupBy.length > 0) {
      query = query.groupBy(...groupBy);
    }

    if (having) {
      query = query.having(having);
    }

    if (orderBy) {
      query = query.orderBy(orderBy);
    }

    return await query;
  } catch (error) {
    logger.error('Error executing group by aggregation:', error);
    throw error;
  }
}
