---
description: "[DEPRECATED] Use /ultrawork instead - orchestrator behavior is now default"
---

## DEPRECATED COMMAND

**This command has been deprecated.** Orchestrator behavior is now the default operating mode.

### What Changed

The default Sisyphus mode now includes:
- Smart delegation (delegate complex work, do simple tasks directly)
- Parallel execution when profitable
- Todo tracking and persistence
- Background task execution

### Alternatives

| Previous Usage | Use Instead |
|----------------|-------------|
| `/orchestrator task` | Just describe the task (default mode) |
| Maximum parallel intensity | `/ultrawork task` |
| Strict delegate-only mode | `/ultrawork task` |

### Why Deprecated

The orchestrator, sisyphus, and ultrawork skills had ~80% overlap. We merged their core behaviors into the default mode to reduce confusion and eliminate redundant skill activation.

**The default mode is now an intelligent orchestrator.** Use `/ultrawork` when you need maximum intensity.
