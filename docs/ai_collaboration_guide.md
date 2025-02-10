# AI Collaboration Guidelines for POWR Project

## Project Overview

POWR is a cross-platform fitness tracking application built with React Native and Expo. It follows a local-first architecture with planned Nostr protocol integration for decentralized social features.

### Key Features
- Exercise and workout tracking
- Workout template creation and management
- Local-first data storage
- Cross-platform compatibility (iOS, Android)
- Future Nostr integration for social features

### Technical Stack
- React Native & Expo
- TypeScript
- SQLite for local storage
- Nostr protocol (planned)

## Collaboration Guidelines

### 1. Development Process

#### 1.1 Problem Statement
Before starting any implementation:
- Define the specific problem or feature
- Outline key requirements and constraints
- Identify success criteria
- Document any dependencies or prerequisites

Example:
```markdown
Problem: Users need a way to create and manage custom exercise templates
Requirements:
- Support for different exercise types
- Custom fields for sets/reps/weight
- Offline functionality
- Future Nostr compatibility
Success Criteria:
- Users can create, edit, and delete exercises
- Exercise data persists locally
- UI performs smoothly
```

#### 1.2 Design Document
Create a design document that includes:
- Technical approach
- Data structures
- Component hierarchy
- State management
- Error handling
- Testing strategy

Store design documents in: `@/docs/design/`

#### 1.3 Implementation Phases
Break implementation into manageable chunks:
1. Core functionality
2. UI/UX implementation
3. Data persistence
4. Testing and validation
5. Documentation

#### 1.4 Review Process
- Review code in logical chunks
- Include tests with new features
- Document any configuration changes
- Update relevant documentation

### 2. Code Quality Standards

#### 2.1 TypeScript Usage
- Use proper type definitions
- Avoid `any` types
- Document complex types
- Use interfaces for shared types

Example:
```typescript
interface Exercise {
  id: string;
  name: string;
  type: ExerciseType;
  equipment?: Equipment;
  notes?: string;
  created_at: number;
}
```

#### 2.2 Documentation
- Include JSDoc comments for functions
- Document component props
- Explain complex logic
- Keep README files updated

Example:
```typescript
/**
 * Creates a new exercise template in the local database
 * @param exercise - The exercise data to save
 * @returns Promise<string> - The ID of the created exercise
 * @throws {DatabaseError} If the save operation fails
 */
async function createExercise(exercise: Exercise): Promise<string>
```

#### 2.3 Error Handling
- Use typed errors
- Implement error boundaries
- Log errors appropriately
- Provide user feedback

#### 2.4 Testing
- Write unit tests for utilities
- Component testing
- Integration tests for workflows
- Document test cases

### 3. Project Structure

```plaintext
powr/
├── app/                 # Main application code
│   ├── (tabs)/         # Tab-based navigation
│   └── components/     # Shared components
├── assets/             # Static assets
├── docs/              # Documentation
│   └── design/        # Design documents
├── lib/               # Shared utilities
└── types/             # TypeScript definitions
```

### 4. Contribution Process

1. **Start with Documentation**
   - Create/update design doc
   - Document planned changes
   - Update relevant READMEs

2. **Implementation**
   - Follow TypeScript best practices
   - Add tests for new features
   - Include error handling
   - Add logging where appropriate

3. **Review**
   - Self-review checklist
   - Documentation updates
   - Test coverage
   - Performance considerations

### 5. Future-Proofing

#### 5.1 Nostr Integration
- Design data structures for Nostr compatibility
- Plan for event-based architecture
- Consider relay infrastructure
- Document Nostr-specific features

#### 5.2 Offline First
- Local data persistence
- Sync status tracking
- Conflict resolution strategy
- Clear offline indicators

## Communication Guidelines

### 1. When Asking for Help
- Provide context
- Share relevant code
- Describe expected vs actual behavior
- Include any error messages

### 2. When Implementing Features
- Break down complex tasks
- Document assumptions
- Ask for clarification when needed
- Provide progress updates

### 3. When Reviewing Code
- Follow the checklist
- Provide constructive feedback
- Suggest improvements
- Document decisions

## Resources

### Documentation Templates
- Problem Statement Template
- Design Document Template
- Pull Request Template

### Style Guides
- TypeScript Style Guide
- React Native Best Practices
- Component Design Guidelines

### Tools
- ESLint Configuration
- Prettier Setup
- Testing Utilities

## Getting Started

1. Review project documentation
2. Set up development environment
3. Run initial build
4. Review current codebase
5. Start with small tasks

Remember to:
- Ask questions when stuck
- Document decisions
- Follow the process
- Think about maintainability