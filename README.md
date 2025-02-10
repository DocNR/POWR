# POWR - Cross-Platform Fitness Tracking App

POWR is a local-first fitness tracking application built with React Native and Expo, featuring planned Nostr protocol integration for decentralized social features.

## Features

### Current
- Exercise library management
- Workout template creation
- Local-first data architecture
- Cross-platform support (iOS, Android)
- Dark mode support

### Planned
- Workout record and template sharing
- Nostr integration
- Social features
- Training programs
- Performance analytics

## Getting Started

### Prerequisites
- Node.js (v18 or later)
- npm or yarn
- Expo CLI
- iOS Simulator (for iOS development)
- Android Studio (for Android development)

### Installation

1. Clone the repository
```bash
git clone https://github.com/docNR/powr.git
cd powr
```

2. Install dependencies
```bash
npm install
```

3. Start the development server
```bash
npx expo start
```

### Development Options
- Press 'i' for iOS simulator
- Press 'a' for Android simulator
- Scan QR code with Expo Go app for physical device

## Project Structure

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

## Technology Stack

### Core
- React Native
- Expo
- TypeScript
- SQLite (via expo-sqlite)

### UI Components
- NativeWind
- React Navigation
- Lucide Icons

### Testing
- Jest
- React Native Testing Library

## Development

### Environment Setup
1. Install development tools
```bash
npm install -g expo-cli
```

2. Configure environment
```bash
cp .env.example .env
```

3. Configure development settings
```bash
npm run setup-dev
```

### Running Tests
```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch
```

### Building for Production
```bash
# Build for iOS
eas build -p ios

# Build for Android
eas build -p android
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and development process.

## Documentation

- [Project Overview](docs/project-overview.md)
- [Architecture Guide](docs/architecture.md)
- [API Documentation](docs/api.md)
- [Testing Guide](docs/testing.md)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Expo](https://expo.dev/)
- [React Native](https://reactnative.dev/)
- [Nostr Protocol](https://github.com/nostr-protocol/nostr)