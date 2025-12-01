# Systematic Debugging Framework

Always find the root cause. Never fix symptoms or add workarounds.

## Phase 1: Root Cause Investigation (BEFORE attempting fixes)

### Read Error Messages Carefully
- Don't skip past errors or warnings
- They often contain the exact solution
- Copy the full error message for reference

### Reproduce Consistently
- Ensure you can reliably reproduce the issue before investigating
- Document the exact steps to reproduce
- If it's intermittent, understand what conditions trigger it

### Check Recent Changes
- What changed that could have caused this?
- Run `git diff` to see uncommitted changes
- Check `git log --oneline -10` for recent commits
- Consider reverting to confirm the change caused the issue

## Phase 2: Pattern Analysis

### Find Working Examples
- Locate similar working code in the same codebase
- How does it differ from the broken code?

### Compare Against References
- If implementing a pattern, read the reference implementation completely
- Don't assume you know how it works

### Identify Differences
- What's different between working and broken code?
- Look for subtle differences in configuration, imports, or data flow

### Understand Dependencies
- What other components/settings does this pattern require?
- Are all prerequisites met?

## Phase 3: Hypothesis and Testing

1. **Form Single Hypothesis**
   - What do you think is the root cause?
   - State it clearly before testing

2. **Test Minimally**
   - Make the smallest possible change to test your hypothesis
   - Don't combine multiple potential fixes

3. **Verify Before Continuing**
   - Did your test work?
   - If not, form NEW hypothesis - don't pile on more fixes

4. **When You Don't Know**
   - Say "I don't understand X" rather than pretending to know
   - Ask Alberto for help

## Phase 4: Implementation Rules

- ALWAYS have the simplest possible failing test case
- If there's no test framework, write a one-off test script
- NEVER add multiple fixes at once
- NEVER claim to implement a pattern without reading it completely first
- ALWAYS test after each change
- IF your first fix doesn't work, STOP and re-analyze rather than adding more fixes

## Anti-Patterns to Avoid

- Adding defensive code "just in case"
- Trying multiple fixes simultaneously
- Moving on when tests pass but you don't understand why
- Fixing the symptom instead of the cause
- Assuming you know the problem without investigation
