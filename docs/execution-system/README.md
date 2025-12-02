# Node Execution System Documentation

This directory contains comprehensive documentation for the node-drop node execution system, including architectural decisions, flow diagrams, and business logic explanations.

## Documentation Structure

- **[Execution Overview](./execution-overview.md)** - High-level system overview and architecture
- **[Dual Execution Modes](./dual-execution-modes.md)** - Single node vs workflow execution modes
- **[Workflow Execution Flow](./workflow-execution-flow.md)** - Complete workflow execution process
- **[Single Node Execution](./single-node-execution.md)** - Individual node execution process
- **[Multi-Trigger Handling](./multi-trigger-handling.md)** - How multi-trigger workflows are managed (includes infinite loop fix)
- **[Multi-Trigger Troubleshooting](./multi-trigger-troubleshooting.md)** - Specific troubleshooting guide for infinite loop issue
- **[Error Handling](./error-handling.md)** - Comprehensive error management strategies (includes multi-trigger error solutions)
- **[Real-time Updates](./real-time-updates.md)** - WebSocket-based progress tracking
- **[API Reference](./api-reference.md)** - Complete API documentation
- **[Database Schema](./database-schema.md)** - Execution-related database structures
- **[Flow Diagrams](./flow-diagrams/)** - Visual representations of execution flows

## Quick Start

For a quick understanding of the execution system:

1. Start with [Execution Overview](./execution-overview.md) for the big picture
2. Review [Dual Execution Modes](./dual-execution-modes.md) to understand the two execution paradigms
3. Examine the [Flow Diagrams](./flow-diagrams/) for visual understanding
4. Dive into specific processes as needed

## Key Concepts

- **Dual Execution Modes**: Single node execution vs full workflow execution
- **Trigger-Specific Execution**: Workflows can be executed from specific trigger nodes
- **Real-time Progress**: Live updates via WebSocket connections
- **Error Recovery**: Comprehensive error handling with retry mechanisms
- **Visual Feedback**: Node state updates reflected in the UI

## Recent Updates

**September 28, 2025**: Fixed critical multi-trigger infinite loop issue

- Added trigger-specific dependency filtering to prevent infinite loops
- Enhanced error handling for multi-trigger scenarios
- Implemented retry limits and timeout mechanisms
- Created comprehensive multi-trigger handling documentation

## Last Updated

September 28, 2025
