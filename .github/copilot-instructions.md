# GitHub Copilot Instructions for node-drop

## 🚨 CRITICAL RULE - READ FIRST

**DO NOT CREATE DOCUMENTATION OR INCLUDE CONTENT FROM `/docs` FOLDER UNLESS EXPLICITLY ASKED**

When the user asks for help:

- Provide CODE solutions, not documentation
- Do NOT read or reference files from `/docs` directory
- Do NOT create markdown documentation files
- Focus on implementation and working code
- Only include documentation if the user specifically asks: "show me the docs" or "include documentation"

## Project Overview

This is a workflow automation platform similar to nodeDrop, built with a modern tech stack:

- **Backend**: Node.js, Express, TypeScript, Prisma ORM, PostgreSQL
- **Frontend**: React, TypeScript, Vite, TailwindCSS, shadcn/ui, XYFlow/React Flow
- **Architecture**: Monorepo with separate frontend and backend workspaces

## Key Guidelines

### 1. Code Style & Conventions

- Use TypeScript for all new code
- Follow functional programming patterns where possible
- Use async/await for asynchronous operations
- Prefer named exports over default exports
- Use Prisma for all database operations
- Follow REST API conventions for backend endpoints

### 2. Project Structure

- **Backend** (`/backend`): Express API, custom node system, workflow execution engine
- **Frontend** (`/frontend`): React SPA with workflow editor using React Flow
- **Custom Nodes** (`/backend/custom-nodes`): Plugin system for workflow nodes
- **Docs** (`/docs`): ⛔ IGNORE THIS FOLDER - Do not read or reference unless explicitly asked

### 3. Backend Development

- API routes should be in `/backend/src/routes`
- Use Express middleware for authentication and validation
- Implement proper error handling with try-catch blocks
- Use Prisma Client for database queries
- Custom nodes must follow the node interface pattern
- Use the CLI system (`node-cli.ts`) for node management

### 4. Frontend Development

- Use React hooks and functional components
- State management with Zustand
- Use shadcn/ui components for UI elements
- Follow React Flow patterns for workflow editor
- Use Axios for API calls
- Implement proper TypeScript types for all props and state

### 5. Node System

- Custom nodes are in `/backend/custom-nodes`
- Each node has its own directory with `index.js` and metadata
- Nodes can be registered, activated, and deactivated via CLI
- Follow the node interface: `execute()`, `properties`, `inputs`, `outputs`

### 6. Database & ORM

- Use Prisma for schema definitions and migrations
- Run `npm run db:generate` after schema changes
- Run `npm run db:migrate` to apply migrations
- Never write raw SQL unless absolutely necessary

### 7. API Development

- Follow RESTful conventions
- Use proper HTTP status codes
- Implement request validation using express-validator or Zod
- Include proper error responses with meaningful messages
- Use JWT for authentication

### 8. Workflow Execution

- Workflows are executed through the execution engine
- Support for webhooks, triggers, and scheduled workflows
- Use Socket.io for real-time execution updates
- Implement proper error handling in node execution

### 9. Docker & Deployment

- Development: `docker-compose.dev.yml`
- Production: `docker-compose.yml`
- Backend Dockerfile: Multi-stage build
- Frontend Dockerfile: Nginx for serving static files

### 10. Testing

- Write tests for critical backend logic
- Use Jest for backend tests
- Use Vitest for frontend tests
- Test node execution logic thoroughly

## Important Rules

### DO:

- Write clean, maintainable TypeScript code
- Use existing patterns and conventions in the codebase
- Implement proper error handling
- Add TypeScript types for all functions and components
- Follow the existing project structure
- Use environment variables for configuration
- Implement proper validation for user inputs

### DO NOT:

- ⛔ Include documentation from `/docs` folder unless explicitly asked
- ⛔ Create new documentation files or markdown guides only when asked
- ⛔ Reference or read existing documentation files
- Use `any` type in TypeScript (use proper types or `unknown`)
- Commit sensitive data or API keys
- Create duplicate code - refactor common logic
- Ignore error cases
- Use deprecated npm packages
- Mix concerns between frontend and backend

## Commands Reference

### Development

```bash
# Root level
npm run dev                 # Run both frontend and backend
npm run dev:backend        # Run backend only
npm run dev:frontend       # Run frontend only

# Backend
npm run dev --workspace=backend
npm run db:migrate
npm run db:studio
npm run nodes:list

# Frontend
npm run dev --workspace=frontend
npm run build --workspace=frontend
```

## Response Guidelines

- Provide concise, actionable code solutions
- Explain complex logic with brief comments
- Suggest best practices when relevant
- When asked about features, provide implementation code, not documentation
- If documentation is needed, ask the user explicitly before including it
- Focus on code solutions rather than explanatory guides

## File Patterns to Know

- Node definitions: `/backend/custom-nodes/[node-name]/index.js`
- API routes: `/backend/src/routes/*.ts`
- Frontend components: `/frontend/src/components/**/*.tsx`
- React Flow editor: `/frontend/src/components/WorkflowEditor/`
- Prisma schema: `/backend/prisma/schema.prisma`

---

**Remember**: Only reference or include documentation when the user explicitly asks for it. Focus on providing practical code solutions.
