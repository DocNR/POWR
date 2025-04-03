# POWR App Coding Style Guide

**Last Updated:** 2025-04-01  
**Status:** Active  
**Related To:** Development Standards, Best Practices

## Purpose

This guide establishes consistent coding standards for the POWR application codebase. It provides clear principles and specific guidelines to ensure readability, maintainability, and quality across the project. Following these guidelines helps all contributors work together effectively and reduces the cognitive load when reading and modifying code.

## Core Principles

### Consistency is King

Above all other principles, be consistent. If a file follows one convention, continue using that convention. Separate style changes from logic changes in different commits.

**Rationale**: Inconsistent naming or patterns (`Apple`, `a`, `fruit`, `redThing` for the same concept) make it difficult to understand relationships between components.

### Readability Above Efficiency

Prefer readable code over fewer lines of cryptic code.

**Rationale**: Code will be read many more times than it will be written, by different people—including yourself a year from now.

### All Code is Either Obviously Right, or Non-Obviously Wrong

Strive to make code obviously correct at first glance. It shouldn't require detailed study to decipher.

**Rationale**: When code is obviously right, it's probably right. The goal is to have suspicious code look suspiciously wrong and stick out. This happens when everything else is clear, and there's a tricky bit that needs work.

**Code Comments**: Comments indicate the code isn't self-explanatory through naming, structure, or organization. While not prohibited, strive to make code require almost no comments.

Good uses for comments:
- Explaining **why** the code is written a certain way
- Documenting details that can't be easily explained in code (algorithms, patterns)
- API interface documentation (keep comments close to code for easier maintenance)

### Boring is Best

Make your code the most boring version it could be.

**Rationale**: Production code should be maintainable, not clever. Reserve creativity for test cases with interesting constants and edge cases.

### Split Implementation from Interface

Always separate storage, presentation, and communication protocols.

**Rationale**: When layers are inappropriately tied together, changes may cause unexpected breakage in seemingly unrelated areas.

### Split "Policy" and "Mechanics"

Separate configuration/policy ("the why") from implementation/mechanics ("the how").

**Rationale**: This separation allows testing implementation independently from policy triggers, making features easier to toggle and canary.

**Corollaries**:
- Create separate functions for "doing" and for "choosing when to do"
- Create flags for all implementation features

## Documentation of Deficiencies

### `TODO` Comments

Use `TODO` comments liberally to document potential improvements:

Format: `// TODO[(Context)]: <Action> by/when <Deadline Condition>`

Components:
- **Context** - (Optional) Reference to issue tracker or documentation
- **Action** - Specific, actionable task with explanations as needed
- **Deadline Condition** - When the task should be completed

**Rationale**: `TODO` comments help readers understand what is missing or could be improved, making technical debt visible.

Good examples:
```typescript
// TODO: Replace certificate with staging version once we get letsencrypt to work.
// TODO(POWR-123): Replace old logic with new logic when out of experimental mode.
// TODO(NOSTR-456): Implement zap forwarding when NIP-57 is fully supported by relays.
```

Less effective examples (lacking deadline condition):
```typescript
// TODO: Add precompiling templates here if we need it.
// TODO: Remove use of bash.
```

Poor examples:
```typescript
// TODO: wtf?
// TODO: We shouldn't do this.
// TODO: err...
```

### `FIXME` Comments

Use `FIXME` comments as **stronger** `TODO`s that **MUST** be addressed before code submission.

Format: `// FIXME: <Action or note>`

**Rationale**: These act as development reminders for incomplete or problematic code that needs attention before merging.

Examples:
```typescript
// FIXME: Remove hack
// FIXME: Revert hardcoding of relay URL
// FIXME: Implement function
// FIXME: Refactor these usages across codebase
```

## Naming Conventions

### Semantic Variable Names

Names should reflect content and intent. Choose specific, descriptive names. Use only well-known abbreviations.

```typescript
// Bad
input = "123-4567";
dialPhoneNumber(input); // unclear whether this makes semantic sense

// Good
phoneNumber = "123-4567";
dialPhoneNumber(phoneNumber); // clearly intentional

// Bad
text = 1234;
address = "nostr:npub1/" + text; // why is text being added?

// Good
profileId = 1234;
address = "nostr:npub1/" + profileId; // clearly adding a profile ID
```

**Rationale**: Semantic names make bugs obvious and express intention without requiring comments.

### Include Units for Measurements

Always include units in variable names for clarity:

- Time intervals: `timeoutSec`, `timeoutMs`, `refreshIntervalHours`
- Timestamps: `startTimestamp` (use language-appropriate types internally)
- Distances: `lengthFt`, `lengthMeter`, `lengthCm`
- Computer storage: `diskMib` (1 Mebibyte = 1024 Kibibytes), `ramMb` (1 Megabyte = 1000 Kilobytes)

```typescript
// Bad
cost = disk * cents;

// Good
costCents = diskMib * 1024 * centsPerKilobyte;
```

**Rationale**: Including units prevents many common bugs related to unit confusion.

## Constants

### Assign Literals to Constants

Every string or numeric literal should be assigned to a constant or constant-like variable.

**Exceptions**: Identity-type zero/one values: `0`, `1`, `-1`, `""`

```typescript
// Bad
if (status === 4) { /* ... */ }

// Good
const STATUS_COMPLETED = 4;
if (status === STATUS_COMPLETED) { /* ... */ }
```

**Rationale**: Constants make code more readable and maintainable by centralizing values and their meanings.

## React & React Native Specifics

### Component Organization

Structure React components consistently:
1. Imports
2. Type definitions and interfaces
3. Constants
4. Component function
5. Helper functions
6. Styles (if using StyleSheet)
7. Export statement

### Props and State

- Use TypeScript interfaces for props and state types
- Default props should be handled with destructuring in function parameters
- Prefer functional components with hooks over class components

```typescript
interface ButtonProps {
  title: string;
  onPress: () => void;
  color?: string;
}

const Button = ({ title, onPress, color = 'blue' }: ButtonProps) => {
  // Component implementation
};
```

## Testing Guidelines

All core code guidelines apply to tests with these modifications:

### Repetitive Test Code Allowed

While DRY (Don't Repeat Yourself) is a good practice, clarity in tests takes precedence.

**Rationale**: Test readability is paramount. Sometimes repetition makes tests easier to understand.

### Small Test Cases

Create small, targeted test cases rather than large, complex ones.

**Rationale**: Small tests are easier to write, debug, and understand. Large tests often indicate design problems in the code being tested.

### Avoid Complex Logic in Tests

Keep test logic simple. If needed, create helper functions with their own tests.

**Rationale**: Complex test logic is more likely to contain bugs, defeating the purpose of testing.

### Descriptive Test Values

Use creative but clearly test-oriented values that don't look like production data.

```typescript
// Bad
login("abc", "badpassword");  // Are these values significant?
const testPubkey = "npub1abcdef12345..."; // Looks too "real"

// Good
const testUsername = "test-user-alpha";
const testPassword = "obvious-test-password!";
const testBadPassword = "wrong-password-for-testing";
const testPubkey = "npub_for_test_user_alpha";

login(testUsername, testPassword); // Expected success
login(testUsername, testBadPassword); // Expected failure
```

**Rationale**: When variable names are clear, test intent becomes obvious.

### Keep Related Logic Together

Group related test logic and conditions together for better readability.

```typescript
// Bad
initialBalance = 100;
deposit();
// ...many lines of test code...
withdraw();
expect(balance).toBe(167);  // Why 167?

// Good
initialBalance = 100;
depositAmount = 100;
withdrawAmount = 33;
expectedBalance = 167; // Clear where 167 comes from
// ...test code...
expect(balance).toBe(expectedBalance);
```

**Rationale**: Grouping related elements makes tests more understandable and self-documenting.

## TypeScript Best Practices

### Type Safety

- Prioritize type safety; avoid using `any` unless absolutely necessary
- Use TypeScript's utility types (`Partial<T>`, `Pick<T>`, etc.) when appropriate
- Define explicit return types for functions, especially for public API functions

### Interfaces vs Types

- Prefer interfaces for public APIs that may be extended
- Use type aliases for unions, intersections, and types that won't be extended

### Enums

- Use string enums for better debugging and serialization
- Consider using const enums for performance when applicable

## Related Documentation

- [Documentation Standards](../project/documentation/standards.md)
- [Project Organization](../project/organization_plan.md)
- [Styling Guide](../technical/styling/styling_guide.md)
