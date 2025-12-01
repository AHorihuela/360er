# Code Style Guide

Standards for naming, comments, and code organization in 360er.

## Naming Conventions

### Core Principle
Names MUST tell what code does, not how it's implemented or its history.

### Rules

- **Never use implementation details in names**
  - Bad: `ZodValidator`, `MCPWrapper`, `JSONParser`
  - Good: `Validator`, `Tool`, `Parser`

- **Never use temporal/historical context in names**
  - Bad: `NewAPI`, `LegacyHandler`, `UnifiedTool`, `ImprovedInterface`, `EnhancedParser`
  - Good: Names that describe current purpose

- **Never use pattern names unless they add clarity**
  - Bad: `ToolFactory`, `RegistryManager`, `AbstractToolInterface`
  - Good: `Tool`, `Registry`, `Tool`

### Good Names Tell a Story About the Domain

| Bad | Good |
|-----|------|
| `AbstractToolInterface` | `Tool` |
| `MCPToolWrapper` | `RemoteTool` |
| `ToolRegistryManager` | `Registry` |
| `executeToolWithValidation()` | `execute()` |

### If You Catch Yourself...

Writing "new", "old", "legacy", "wrapper", "unified", or implementation details in names:
1. STOP
2. Find a better name that describes the thing's actual purpose
3. If stuck, ask Alberto

## Code Comments

### What Comments Should Do
- Explain WHAT the code does
- Explain WHY it exists
- Be evergreen (no temporal references)

### What Comments Should NOT Do
- Explain that something is "improved", "better", "new", or "enhanced"
- Reference what code used to be
- Tell developers what to do ("copy this pattern", "use this instead")
- Document the refactoring history

### ABOUTME Headers

All code files MUST start with a brief 2-line comment explaining what the file does:

```typescript
// ABOUTME: Handles user authentication state and session management.
// ABOUTME: Provides hooks for login, logout, and auth status checking.

export function useAuth() {
  // ...
}
```

### Examples

```typescript
// BAD: This uses Zod for validation instead of manual checking
// BAD: Refactored from the old validation system
// BAD: Wrapper around MCP tool protocol
// BAD: New improved version of the handler

// GOOD: Executes tools with validated arguments
// GOOD: Validates feedback form data before submission
// GOOD: Manages the lifecycle of review cycles
```

### Comment Preservation

- NEVER remove comments unless you can PROVE they are actively false
- Comments are important documentation and must be preserved
- If refactoring, remove old comments that no longer apply - don't add new ones explaining the refactoring

### Temporal Context is Forbidden

Never refer to temporal context in comments like:
- "recently refactored"
- "moved from X"
- "replaces old Y"
- "updated to use Z"

Comments should describe the code as it is NOW.
