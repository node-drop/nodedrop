# Database Setup Guide

This document explains how to set up and work with the database for the node-drop backend.

## Prerequisites

- PostgreSQL 12+ installed and running
- Node.js 18+ installed
- npm or yarn package manager

## Database Schema

The application uses Prisma ORM with PostgreSQL. The schema includes the following main entities:

### Core Entities

1. **User** - User accounts and authentication
2. **Workflow** - Workflow definitions with nodes, connections, and triggers
3. **Execution** - Workflow execution records
4. **NodeExecution** - Individual node execution details
5. **Credential** - Encrypted credential storage
6. **NodeType** - Available node type definitions

### Relationships

- Users can have multiple workflows and credentials
- Workflows belong to users and can have multiple executions
- Executions belong to workflows and contain multiple node executions
- All relationships use cascade delete for data integrity

## Setup Instructions

### 1. Environment Configuration

Copy the example environment file and configure your database connection:

```bash
cp .env.example .env
```

Update the `DATABASE_URL` in your `.env` file:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/node_drop"
TEST_DATABASE_URL="postgresql://username:password@localhost:5432/node_drop_test"
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Generate Prisma Client

```bash
npm run db:generate
```

### 4. Run Database Migrations

```bash
npm run db:migrate
```

This will create all the necessary tables and relationships in your database.

### 5. Seed Development Data

```bash
npm run db:seed
```

This will create:
- Admin user (admin@node-drop.com / admin123)
- Test user (test@node-drop.com / test123)
- Built-in node types (HTTP Request, JSON, Set, Webhook, Schedule)
- Sample workflow with execution data

## Available Scripts

- `npm run db:generate` - Generate Prisma client
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed development data
- `npm test` - Run all tests including database validation tests

## Database Schema Details

### JSON Fields

Several entities use JSON fields for flexible data storage:

- **Workflow.nodes** - Array of node definitions
- **Workflow.connections** - Array of node connections
- **Workflow.triggers** - Array of trigger configurations
- **Workflow.settings** - Workflow configuration settings
- **Execution.triggerData** - Data that triggered the execution
- **Execution.error** - Error details if execution failed
- **NodeExecution.inputData** - Input data for node execution
- **NodeExecution.outputData** - Output data from node execution
- **NodeExecution.error** - Error details if node execution failed
- **NodeType.defaults** - Default parameter values
- **NodeType.properties** - Node property definitions

### Indexes and Constraints

- Unique email constraint on users
- Unique node type constraint
- Unique credential name per user constraint
- Foreign key constraints with cascade delete
- Timestamps on all entities

## Testing

The database tests validate:

- Schema structure and relationships
- Data validation rules
- Constraint enforcement
- Connection handling

Tests can run without a database connection and will skip integration tests if no `DATABASE_URL` is provided.

## Migration Management

When making schema changes:

1. Update `prisma/schema.prisma`
2. Run `npm run db:migrate` to create and apply migration
3. Run `npm run db:generate` to update Prisma client
4. Update TypeScript interfaces in `src/types/database.ts` if needed
5. Update validation schemas in `src/utils/validation.ts` if needed

## Troubleshooting

### Connection Issues

- Verify PostgreSQL is running
- Check database credentials in `.env`
- Ensure database exists
- Check firewall/network settings

### Migration Issues

- Reset database: `npx prisma migrate reset`
- Check for schema conflicts
- Verify Prisma version compatibility

### Performance

- Monitor query performance in development logs
- Add indexes for frequently queried fields
- Use pagination for large result sets
- Consider connection pooling for production

## Production Considerations

- Use connection pooling
- Set up database backups
- Monitor query performance
- Use read replicas for scaling
- Implement proper logging and monitoring
- Secure database credentials
- Regular maintenance and updates