# iOS TestFlight Submission Guide

This guide documents the process for creating and submitting POWR to TestFlight for iOS testing.

## Project Configuration Issues

### Prebuild/Managed Workflow Conflict

The project currently has a "mixed" state that needs to be addressed:
- Native iOS and Android folders exist (bare workflow)
- Configuration exists in app.json that would normally be used in a managed workflow

When both native folders and app.json configs exist, EAS Build will use the native project settings and ignore certain app.json configurations including:
- orientation
- icon
- scheme
- userInterfaceStyle
- splash
- ios/android configuration
- plugins
- androidStatusBar

**TODO: After TestFlight validation, decide on one of these approaches:**
1. Commit to bare workflow: Keep native folders and move all configuration to them
2. Commit to managed workflow: Remove native folders and let Expo handle native code generation

## Fixed Issues

The following issues were addressed to prepare for TestFlight:

1. Updated outdated packages:
   - expo: ~52.0.41 (was 52.0.35)
   - expo-dev-client: ~5.0.15 (was 5.0.12)
   - expo-file-system: ~18.0.12 (was 18.0.10)
   - expo-router: ~4.0.19 (was 4.0.17)
   - expo-sqlite: ~15.1.3 (was 15.1.2)
   - jest-expo: ~52.0.6 (was 52.0.4)

2. Removed unmaintained and unnecessary packages:
   - expo-random: Removed as it's flagged as unmaintained
   - @types/react-native: Removed as types are included with react-native

3. Added proper iOS build configurations in eas.json:
   - Added preview build profile for internal testing
   - Added production build profile for App Store submission

4. Fixed updates URL in app.json to use the correct project ID

5. Fixed prebuild/managed workflow conflict:
   - Added /android and /ios folders to .gitignore as recommended by expo-doctor
   - This approach tells Git to ignore native folders while still allowing EAS Build to use them
   - Addresses the warning about app.json configuration fields not being synced in non-CNG projects

## TestFlight Build Process

To create and submit a build to TestFlight:

1. Update Apple credentials in eas.json:
   ```json
   "submit": {
     "production": {
       "ios": {
         "appleId": "YOUR_APPLE_ID_EMAIL",
         "ascAppId": "YOUR_APP_STORE_CONNECT_APP_ID", 
         "appleTeamId": "YOUR_APPLE_TEAM_ID"
       }
     }
   }
   ```

2. Create a build for internal testing (preview):
   ```
   eas build --platform ios --profile preview
   ```

3. Create a production build for TestFlight:
   ```
   eas build --platform ios --profile production
   ```

4. Submit the build to TestFlight:
   ```
   eas submit --platform ios --latest
   ```

## Troubleshooting

- If you encounter issues with the mixed configuration state, consider fully committing to either the bare or managed workflow
- For build errors related to native code, check the iOS logs in the EAS build output
- For App Store Connect submission errors, verify your app metadata and screenshots in App Store Connect

## References

- [Expo Application Services Documentation](https://docs.expo.dev/eas/)
- [Expo Prebuild Documentation](https://docs.expo.dev/workflow/prebuild/)
- [TestFlight Documentation](https://developer.apple.com/testflight/)
