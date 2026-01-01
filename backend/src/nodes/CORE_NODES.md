# Core Nodes

List of all core nodes in the workflow automation system.

## Current Nodes

### Triggers
| Node | Description | Status |
|------|-------------|--------|
| ManualTrigger | Start workflow manually | ✅ |
| ScheduleTrigger | Start workflow on schedule (cron) | ✅ |
| WebhookTrigger | Start workflow via HTTP webhook | ✅ |
| WorkflowTrigger | Start workflow from another workflow | ✅ |
| ErrorTrigger | Start workflow when another workflow fails | ✅ |
| GoogleSheetsTrigger | Start workflow when Google Sheet changes | ✅ |

### Logic & Flow Control
| Node | Description | Status |
|------|-------------|--------|
| IfElse | Route data based on conditions (true/false) | ✅ |
| Switch | Route data to multiple outputs based on rules | ✅ |
| Loop | Iterate over items one at a time | ✅ |
| Split | Split array into individual items | ✅ |
| Merge | Combine data from multiple inputs | ✅ |
| Wait | Pause workflow for duration or until time | ✅ |
| Filter | Filter items based on conditions | ✅ |
| Aggregate | Combine multiple items into one | ✅ |

### Data Transformation
| Node | Description | Status |
|------|-------------|--------|
| Set | Add or update fields on data items | ✅ |
| Json | Compose JSON objects | ✅ |
| Code | Execute JavaScript or Python code | ✅ |

### Connectivity
| Node | Description | Status |
|------|-------------|--------|
| HttpRequest | Make HTTP requests to any URL/API | ✅ |

### AI
| Node | Description | Status |
|------|-------------|--------|
| OpenAI | OpenAI API integration | ✅ |
| Chat | AI chat with memory | ✅ |

### Utility
| Node | Description | Status |
|------|-------------|--------|
| DataPreview | Preview data in workflow | ✅ |
| ImagePreview | Preview images in workflow | ✅ |
| WorkflowCalled | Handle sub-workflow calls | ✅ |

---

## Missing Core Nodes (Compared to n8n/Zapier)

### High Priority
| Node | Description | n8n | Zapier | Priority |
|------|-------------|-----|--------|----------|
| Filter | Filter items based on conditions | ✅ | ✅ | ✅ Done |
| Aggregate | Combine multiple items into one | ✅ | ✅ (Digest) | ✅ Done |
| Formatter | Text/Date/Number transformations | ❌ | ✅ | ✅ Done (via Text Parser custom node) |
| RespondToWebhook | Return data to webhook caller | ✅ | ❌ | 🔴 High |

### Medium Priority
| Node | Description | n8n | Zapier | Priority |
|------|-------------|-----|--------|----------|
| DateTime | Date manipulation & formatting | ✅ | ✅ (Formatter) | ✅ Done (via Text Parser) |
| NoOp | Passthrough node for organization | ✅ | ❌ | 🟡 Medium |
| StickyNote | Comments/documentation in workflows | ✅ | ❌ | ✅ Done (Annotations with resize, colors, markdown) |
| HTML | Parse/extract HTML content | ✅ | ❌ | 🟡 Medium |
| XML | Parse/build XML | ✅ | ❌ | 🟡 Medium |
| Crypto | Hash, encrypt, decrypt | ✅ | ❌ | 🟡 Medium |
| RSS | Read RSS/Atom feeds | ✅ | ✅ | 🟡 Medium |

### Lower Priority
| Node | Description | n8n | Zapier | Priority |
|------|-------------|-----|--------|----------|
| FTP | File transfer protocol | ✅ | ❌ | 🟢 Low |
| SSH | Remote command execution | ✅ | ❌ | 🟢 Low |
| Compression | Zip/unzip files | ✅ | ❌ | 🟢 Low |
| Markdown | Convert markdown to/from HTML | ✅ | ❌ | 🟢 Low |
| EmailParser | Extract data from emails | ❌ | ✅ | 🟢 Low |
| Storage | Key-value persistence | ❌ | ✅ | 🟢 Low |

---

## Node Categories

```
nodes/
├── Triggers/
│   ├── ManualTrigger/
│   ├── ScheduleTrigger/
│   ├── WebhookTrigger/
│   ├── WorkflowTrigger/
│   ├── ErrorTrigger/
│   └── GoogleSheetsTrigger/
├── Logic/
│   ├── IfElse/
│   ├── Switch/
│   ├── Loop/
│   ├── Split/
│   ├── Merge/
│   ├── Wait/
│   ├── Filter/          (TODO)
│   └── Aggregate/       (TODO)
├── Transform/
│   ├── Set/
│   ├── Json/
│   ├── Code/
│   ├── Formatter/       (TODO)
│   └── DateTime/        (TODO)
├── Connectivity/
│   ├── HttpRequest/
│   ├── RespondToWebhook/ (TODO)
│   └── RSS/             (TODO)
├── AI/
│   ├── OpenAI/
│   └── Chat/
└── Utility/
    ├── DataPreview/
    ├── ImagePreview/
    ├── NoOp/            (TODO)
    └── StickyNote/      (TODO)
```

---

## Implementation Progress

- [x] ManualTrigger
- [x] ScheduleTrigger
- [x] WebhookTrigger
- [x] WorkflowTrigger
- [x] ErrorTrigger
- [x] GoogleSheetsTrigger
- [x] IfElse
- [x] Switch
- [x] Loop
- [x] Split
- [x] Merge
- [x] Wait
- [x] Set
- [x] Json
- [x] Code
- [x] HttpRequest
- [x] OpenAI
- [x] Chat
- [x] DataPreview
- [x] ImagePreview
- [x] WorkflowCalled
- [x] Filter
- [x] Aggregate
- [x] Formatter (via Text Parser custom node)
- [ ] RespondToWebhook
- [x] DateTime (via Text Parser custom node)
- [ ] NoOp
- [x] StickyNote (Annotations with resize, colors, markdown)
- [ ] HTML
- [ ] XML
- [ ] Crypto
- [ ] RSS

**Total: 26/31 core nodes implemented (84%)**
