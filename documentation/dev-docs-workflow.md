# Dev Docs Workflow

For large tasks and features, create and maintain dev docs to prevent losing track during implementation.

## When to Use This

- Multi-phase implementations
- Features requiring significant context
- Tasks that might span multiple conversations
- Anything complex enough that you might lose track

## Starting Large Tasks

When exiting plan mode with an accepted plan:

### 1. Create Task Directory

```bash
mkdir -p dev/active/[task-name]/
```

### 2. Create Three Documents

| File | Purpose |
|------|---------|
| `[task-name]-plan.md` | The accepted implementation plan with phases and tasks |
| `[task-name]-context.md` | Key files, architectural decisions, important context |
| `[task-name]-tasks.md` | Checklist of work items, mark complete as you go |

### 3. Update Regularly

- Mark tasks complete immediately after finishing each one
- Add new tasks as you discover them
- Update context.md with relevant insights and decisions

## Continuing Tasks

Before continuing work on an existing task:

1. Check `dev/active/` for existing task directories
2. Read all three files to restore context
3. Continue from where you left off
4. Update "Last Updated" timestamps in documents

## Before Conversation Compaction

When approaching context limits:

### Update context.md with:
- Recent changes made
- Current state of implementation
- Next steps to take
- Any blockers or open questions

### Update tasks.md:
- Mark completed tasks
- Add any new tasks discovered
- Note current task being worked on

### Use Slash Command
Run `/dev-docs-update` to automate this process

## After Task Completion

1. Move task directory from `dev/active/` to `dev/completed/`
2. Add final summary to plan.md
3. Archive for future reference

## Directory Structure Example

```
dev/
├── active/
│   └── user-auth-refactor/
│       ├── user-auth-refactor-plan.md
│       ├── user-auth-refactor-context.md
│       └── user-auth-refactor-tasks.md
└── completed/
    └── dashboard-optimization/
        ├── dashboard-optimization-plan.md
        ├── dashboard-optimization-context.md
        └── dashboard-optimization-tasks.md
```
