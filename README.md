# POWR - Cross-Platform Fitness Tracking App

POWR is a local-first fitness tracking application built with React Native and Expo, featuring integration with the Nostr protocol for decentralized social features and improved control of your fitness data.

## Features

### Current
- Exercise library management with local SQLite database
- Workout template creation
- Local-first data architecture with Nostr sync capability
- Cross-platform support (iOS, Android)
- Dark/light mode support
- Nostr authentication and event publishing

### Planned
- Workout record and template sharing
- Enhanced social features
- Training programs
- Performance analytics
- Public/private workout sharing options

## Getting Started

### Prerequisites
- Node.js (v18 or later)
- npm or yarn
- EAS CLI (`npm install -g eas-cli`)
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

3. Install development client modules
```bash
npx expo install expo-dev-client expo-crypto expo-nip55
```

### Development Using Expo Dev Client

POWR now uses Expo Dev Client for development instead of Expo Go. This allows us to use native modules required for Nostr integration.

1. Configure EAS (if not already done)
```bash
eas build:configure
```

2. Create a development build
```bash
# For Android
eas build --profile development --platform android

# For iOS
eas build --profile development --platform ios
```

3. Start the development server with dev client
```bash
npx expo start --dev-client
```

4. Install the build on your device and scan the QR code to connect

## Project Structure

```plaintext
powr/
├── app/                 # Main application code
│   ├── (tabs)/          # Tab-based navigation
│   ├── (workout)/       # Workout screens
│   └── _layout.tsx      # Root layout
├── components/          # Shared components
│   ├── ui/              # UI components
│   ├── sheets/          # Bottom sheets
│   └── library/         # Library components
├── lib/                 # Shared utilities
│   ├── db/              # Database services
│   ├── hooks/           # Custom React hooks
│   ├── stores/          # Zustand stores
│   └── mobile-signer.ts # Nostr signer implementation
├── types/               # TypeScript definitions
└── utils/               # Utility functions
```

## Technology Stack

### Core
- React Native
- Expo (with Dev Client)
- TypeScript
- SQLite (via expo-sqlite)
- Zustand (state management)

### UI Components
- NativeWind/Tailwind
- React Navigation
- Lucide Icons

### Nostr Integration
- NDK (Nostr Development Kit)
- Custom mobile signer implementation
- Local event caching

## Database Architecture

POWR uses a SQLite database with a service-oriented architecture:
- Exercise data
- Workout templates
- Nostr event caching
- User profiles

Each domain has dedicated service classes for data operations.

## Nostr Integration

POWR implements the Nostr protocol via NDK with:
- Secure key management using expo-secure-store
- Event publishing for exercises, templates, and workouts
- Profile discovery and following
- Custom event kinds for fitness data

## Building for Production

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

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Expo](https://expo.dev/)
- [React Native](https://reactnative.dev/)
- [NDK](https://github.com/nostr-dev-kit/ndk)
- [Nostr Protocol](https://github.com/nostr-protocol/nostr)