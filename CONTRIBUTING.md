# Contributing to POWR

First off, thank you for considering contributing to POWR! This document provides guidelines and steps for contributing.

## Getting Started

1. Fork the Repository
2. Clone your fork
3. Create a new branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Commit with clear messages
6. Push to your fork
7. Submit a Pull Request

## Development Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npx expo start
```

## Code Style Guidelines

### TypeScript
- Use TypeScript for all new code
- Provide proper type definitions
- Avoid using `any`
- Document complex types

### React/React Native
- Use functional components
- Implement proper error boundaries
- Follow React hooks best practices
- Keep components focused and reusable

### Testing
- Write tests for new features
- Maintain existing test coverage
- Use descriptive test names
- Follow the "Arrange-Act-Assert" pattern

## Documentation

### Code Documentation
- Use JSDoc comments for functions and classes
- Document component props
- Explain complex logic
- Keep inline comments clear and necessary

### Updating Documentation
- Update README.md if needed
- Document new features
- Update CHANGELOG.md
- Add migration notes if needed

## Pull Request Process

1. Create a descriptive PR title
2. Fill out the PR template
3. Link related issues
4. Update documentation
5. Ensure tests pass
6. Request review
7. Address feedback

## Commit Messages

Follow the conventional commits specification:

- feat: New feature
- fix: Bug fix
- docs: Documentation changes
- style: Code style changes
- refactor: Code refactoring
- test: Test updates
- chore: Build process updates

Example:
```
feat(exercise): add custom exercise creation

- Add exercise form component
- Implement validation
- Add database integration
```

## Working with Issues

1. Check existing issues first
2. Use issue templates when available
3. Provide clear reproduction steps
4. Include relevant information:
   - Platform (iOS/Android/Web)
   - React Native version
   - Error messages
   - Screenshots if applicable

## Code Review Process

### Submitting Code
- Keep PRs focused and small
- Explain complex changes
- Update tests and documentation
- Ensure CI checks pass

### Reviewing Code
- Be respectful and constructive
- Focus on code, not the author
- Explain your reasoning
- Approve once satisfied

## Design Guidelines

### UI/UX Principles
- Follow platform conventions
- Maintain consistency
- Consider accessibility
- Support dark mode

### Component Design
- Keep components focused
- Use proper prop types
- Implement error handling
- Consider reusability

## Release Process

1. Version bump
2. Update CHANGELOG.md
3. Create release notes
4. Tag the release
5. Build and test
6. Deploy

## Questions?

If you have questions:
1. Check existing issues
2. Review documentation
3. Open a discussion
4. Ask in our community channels

## Community Guidelines

- Be respectful and inclusive
- Help others learn
- Share knowledge
- Give constructive feedback
- Follow the code of conduct