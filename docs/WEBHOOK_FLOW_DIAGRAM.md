# Webhook System Flow Diagram

## Overview

This document provides a comprehensive visual representation of how webhooks work in the node-drop system, from URL generation in the frontend to execution and persistence in the backend.

---

## 1. Complete Webhook Flow

```mermaid
graph TB
    subgraph "Frontend - Workflow Builder"
        A[User Opens Webhook Node Config]
        B[WebhookUrlGenerator Component]
        C[Generate UUID v4]
        D[Display Test/Prod URLs]
        E[User Copies URL]
        F[User Saves Workflow]
    end

    subgraph "Backend - Workflow Save"
        G[WorkflowService.updateWorkflow]
        H[Save Workflow to Database]
        I[TriggerService.syncWorkflowTriggers]
        J{Parse Workflow Nodes}
        K[Find Webhook Trigger Nodes]
        L[TriggerService.activateTrigger]
    end

    subgraph "Backend - Trigger Registration"
        M[Create Trigger Record in DB]
        N[TriggerManager.registerTrigger]
        O[Store in activeTriggers Map]
        P[Webhook Ready to Receive Requests]
    end

    subgraph "External System"
        Q[HTTP Client Sends Request]
        R[POST/GET to /webhook/:webhookId]
    end

    subgraph "Backend - Webhook Router"
        S[Express Route Handler]
        T[TriggerService Singleton]
        U[TriggerService.handleWebhook]
        V{Find Matching Trigger}
    end

    subgraph "Backend - Execution Pipeline"
        W[TriggerManager.executeTrigger]
        X[Allocate Resources]
        Y[TriggerManager.executeFlowAsync]
        Z[ExecutionService.executeWorkflow]
        AA[FlowExecutionEngine.executeFromTrigger]
        AB[Execute Workflow Nodes]
    end

    subgraph "Backend - Persistence & Events"
        AC[ExecutionService.createFlowExecutionRecord]
        AD[Save Execution to Database]
        AE[Save Node Executions to Database]
        AF[SocketService.emitToUser]
        AG[Emit executionStarted Event]
        AH[Emit executionCompleted Event]
    end

    subgraph "Backend - Completion"
        AI[TriggerManager.handleTriggerCompletion]
        AJ[Release Resources]
        AK[Emit Trigger Completed Event]
        AL[Return HTTP Response]
    end

    subgraph "Frontend - Real-time Updates"
        AM[Socket Connection Receives Events]
        AN[Update Execution History UI]
        AO[Show Execution Details]
        AP[Display Node Results]
    end

    A --> B
    B --> C
    C --> D
    D --> E
    E --> F
    F --> G
    G --> H
    H --> I
    I --> J
    J --> K
    K --> L
    L --> M
    M --> N
    N --> O
    O --> P

    Q --> R
    R --> S
    S --> T
    T --> U
    U --> V
    V -->|Found| W
    V -->|Not Found| AL

    W --> X
    X --> Y
    Y --> Z
    Z --> AA
    AA --> AB

    AB --> AC
    AC --> AD
    AD --> AE
    AE --> AF
    AF --> AG
    AG --> AH

    AB --> AI
    AH --> AI
    AI --> AJ
    AJ --> AK
    AK --> AL

    AG --> AM
    AH --> AM
    AM --> AN
    AN --> AO
    AO --> AP

    style B fill:#e1f5ff
    style Z fill:#fff4e6
    style AC fill:#e8f5e9
    style AF fill:#f3e5f5
    style P fill:#c8e6c9
    style AL fill:#ffebee
```

---

## 2. Component Interaction Diagram

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant WorkflowService
    participant TriggerService
    participant TriggerManager
    participant ExecutionService
    participant FlowEngine
    participant Database
    participant SocketService

    Note over User,Frontend: Workflow Creation Phase
    User->>Frontend: Open Webhook Node Config
    Frontend->>Frontend: Generate UUID for Webhook
    Frontend->>User: Display Test/Prod URLs
    User->>Frontend: Save Workflow
    Frontend->>WorkflowService: updateWorkflow(data)
    WorkflowService->>Database: Save workflow
    WorkflowService->>TriggerService: syncWorkflowTriggers(workflowId)
    TriggerService->>Database: Create/Update Trigger Records
    TriggerService->>TriggerManager: registerTrigger(trigger)
    TriggerManager->>TriggerManager: Store in activeTriggers Map
    TriggerService-->>Frontend: Success

    Note over User,SocketService: Webhook Execution Phase
    User->>Frontend: Send HTTP Request to Webhook URL
    Frontend->>TriggerService: POST /webhook/:webhookId
    TriggerService->>TriggerService: Find matching trigger
    TriggerService->>TriggerManager: executeTrigger(trigger, data)
    TriggerManager->>TriggerManager: Check resource limits
    TriggerManager->>ExecutionService: executeWorkflow(workflowId, userId, triggerData)

    ExecutionService->>Database: Create execution record
    ExecutionService->>SocketService: Emit executionStarted
    SocketService->>Frontend: Socket event: executionStarted
    Frontend->>User: Show "Execution Started"

    ExecutionService->>FlowEngine: executeFromTrigger(workflowData)
    FlowEngine->>FlowEngine: Execute workflow nodes
    FlowEngine-->>ExecutionService: Execution result

    ExecutionService->>Database: Save node executions
    ExecutionService->>SocketService: Emit executionCompleted
    SocketService->>Frontend: Socket event: executionCompleted
    Frontend->>User: Show execution results

    ExecutionService-->>TriggerManager: ExecutionResult
    TriggerManager->>TriggerManager: Release resources
    TriggerManager-->>TriggerService: Success
    TriggerService-->>Frontend: HTTP 200 Response
```

---

## 3. Data Flow Diagram

```mermaid
graph LR
    subgraph "Input Data"
        A[HTTP Request Body]
        B[HTTP Request Headers]
        C[HTTP Request Query]
        D[Webhook Path Suffix]
    end

    subgraph "Trigger Context"
        E[Trigger ID]
        F[Workflow ID]
        G[User ID]
        H[Trigger Node ID]
        I[Webhook ID]
    end

    subgraph "Execution Data"
        J[Workflow Snapshot]
        K[Node Definitions]
        L[Execution Context]
        M[Input Data for Nodes]
    end

    subgraph "Persistence"
        N[(Execution Record)]
        O[(Node Execution Records)]
        P[(Trigger Record)]
        Q[(Workflow Record)]
    end

    subgraph "Output"
        R[Socket Events]
        S[HTTP Response]
        T[Execution History]
    end

    A --> E
    B --> E
    C --> E
    D --> E

    E --> J
    F --> J
    G --> J
    H --> J
    I --> E

    J --> L
    K --> L

    L --> N
    L --> O
    E --> P
    F --> Q

    N --> R
    O --> R
    N --> S
    N --> T
    O --> T

    style E fill:#e1f5ff
    style J fill:#fff4e6
    style N fill:#e8f5e9
    style R fill:#f3e5f5
```

---

## 4. Architecture Layers

```mermaid
graph TB
    subgraph "Layer 1: Entry Points"
        A1[WebhookUrlGenerator Component]
        A2[Webhook Router /webhook/:webhookId]
    end

    subgraph "Layer 2: Service Orchestration"
        B1[WorkflowService]
        B2[TriggerService Singleton]
    end

    subgraph "Layer 3: Execution Management"
        C1[TriggerManager]
        C2[ExecutionService]
    end

    subgraph "Layer 4: Core Execution"
        D1[FlowExecutionEngine]
        D2[NodeExecutor]
    end

    subgraph "Layer 5: Cross-Cutting Concerns"
        E1[SocketService]
        E2[Prisma ORM]
        E3[ExecutionHistoryService]
    end

    A1 --> B1
    A2 --> B2
    B1 --> B2
    B2 --> C1
    C1 --> C2
    C2 --> D1
    D1 --> D2

    C2 --> E1
    C2 --> E2
    B1 --> E2
    B2 --> E2
    C1 --> E3

    style B2 fill:#e1f5ff
    style C2 fill:#fff4e6
    style E1 fill:#f3e5f5
    style E2 fill:#e8f5e9
```

---

## 5. State Transitions

```mermaid
stateDiagram-v2
    [*] --> Inactive: Workflow Created
    Inactive --> Registering: Workflow Saved
    Registering --> Active: Trigger Registered
    Active --> Executing: Webhook Request Received
    Executing --> ResourceAllocated: Resources Checked
    ResourceAllocated --> Running: Execution Started
    Running --> Saving: Workflow Completed
    Saving --> Active: Execution Saved
    Active --> Deactivating: Workflow Deactivated
    Deactivating --> Inactive: Trigger Unregistered
    Inactive --> [*]: Workflow Deleted

    note right of Active
        Webhook listening for
        incoming HTTP requests
    end note

    note right of Running
        FlowExecutionEngine
        processing workflow nodes
    end note

    note right of Saving
        ExecutionService saving
        to database and emitting
        socket events
    end note
```

---

## 6. Error Handling Flow

```mermaid
graph TB
    A[Webhook Request Received]
    B{Trigger Found?}
    C{Resource Available?}
    D{Workflow Valid?}
    E{Execution Success?}

    F[Return 404: Trigger Not Found]
    G[Return 429: Too Many Requests]
    H[Return 500: Invalid Workflow]
    I[Return 500: Execution Error]
    J[Return 200: Success]

    K[Save Error to Database]
    L[Emit Socket Error Event]
    M[Log Error to Console]

    A --> B
    B -->|No| F
    B -->|Yes| C
    C -->|No| G
    C -->|Yes| D
    D -->|No| H
    D -->|Yes| E
    E -->|No| I
    E -->|Yes| J

    I --> K
    K --> L
    L --> M
    H --> M
    G --> M
    F --> M

    style F fill:#ffebee
    style G fill:#ffebee
    style H fill:#ffebee
    style I fill:#ffebee
    style J fill:#c8e6c9
```

---

## Key Design Decisions

### 1. **Singleton Pattern for TriggerService**

- **Why**: Ensures single instance manages all triggers across the application
- **Benefit**: Prevents duplicate trigger registrations and resource conflicts

### 2. **ExecutionService Reuse**

- **Why**: Eliminates code duplication between manual and webhook executions
- **Benefit**: Automatic database persistence, socket events, and execution history

### 3. **TriggerManager Resource Management**

- **Why**: Prevents system overload from concurrent webhook executions
- **Benefit**: Configurable limits, queuing, and conflict resolution strategies

### 4. **Automatic Trigger Sync**

- **Why**: Ensures triggers are registered immediately when workflows are saved
- **Benefit**: No manual trigger registration required, immediate webhook availability

---

## Execution Path Comparison

| Feature           | Manual Execution (Frontend)        | Webhook Execution (Trigger)        |
| ----------------- | ---------------------------------- | ---------------------------------- |
| Entry Point       | Frontend UI Button                 | HTTP POST to /webhook/:id          |
| Service           | ExecutionService.executeWorkflow() | ExecutionService.executeWorkflow() |
| Engine            | FlowExecutionEngine                | FlowExecutionEngine                |
| DB Persistence    | ✅ Automatic                       | ✅ Automatic                       |
| Socket Events     | ✅ Automatic                       | ✅ Automatic                       |
| Execution History | ✅ Saved                           | ✅ Saved                           |
| Resource Limits   | None                               | ✅ TriggerManager                  |
| Code Path         | **Identical**                      | **Identical**                      |

---

## Related Documentation

- [Webhook URL Generator Implementation](../WEBHOOK_URL_GENERATOR_IMPLEMENTATION.md)
- [Webhook Execution Service Refactor](../WEBHOOK_EXECUTION_SERVICE_REFACTOR.md)
- [Trigger Service Architecture](./TRIGGER_SERVICE_ARCHITECTURE.md)
- [Execution Service Design](./EXECUTION_SERVICE_DESIGN.md)

---

## Future Enhancements

1. **Webhook Response Customization**: Allow users to define custom HTTP responses
2. **Webhook Authentication**: Add support for API keys, signatures, OAuth
3. **Webhook Retry Logic**: Implement automatic retries for failed webhooks
4. **Webhook Analytics**: Track webhook usage, response times, error rates
5. **Webhook Rate Limiting**: Per-webhook rate limits to prevent abuse
6. **Webhook Versioning**: Support multiple versions of the same webhook

---

**Last Updated**: October 10, 2025  
**Author**: System Architecture Team  
**Version**: 1.0.0
