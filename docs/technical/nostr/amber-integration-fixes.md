# Amber Signer Integration Fixes

## Issue Summary

The POWR app was experiencing issues when trying to integrate with the Amber external signer on Android. Specifically, the app was receiving "No data returned from Amber" errors when attempting to request a public key or sign events.

## Root Causes and Fixes

### 1. Improved Native Module Implementation

The primary issue was in the `AmberSignerModule.kt` implementation, which handles the communication between the React Native app and the Amber app:

- **Enhanced Intent Construction**: Modified how we create the intent to Amber to better follow NIP-55 protocol requirements.
  - For `signEvent`, we now pass the event as an extra rather than in the URI itself to prevent potential payload size issues.

- **Implemented Better Response Handling**:
  - Added logic to check both intent extras and URI parameters for responses
  - Added validation to ensure signature data exists before resolving promises
  - Improved error reporting with more specific messages

- **Added Extensive Logging**: 
  - Added detailed log statements throughout to help diagnose issues
  - Log extras received from intent responses
  - Log the entire response object before resolving

### 2. Fixed JavaScript Implementation

Several minor issues in the JavaScript files were also fixed:

- **ExternalSignerUtils.ts**:
  - Added additional logging to track request/response flow
  - Improved error handling with more descriptive messages
  - Added checks for null/undefined responses

- **NostrLoginSheet.tsx**:
  - Fixed syntax issues with missing commas in function parameters
  - Added comprehensive Nostr event kind permissions including:
    - Standard Nostr kinds: 0 (metadata), 1 (notes), 3 (contacts), 4 (DMs), 6 (reposts), 7 (reactions), 9734 (zaps)
    - Comments kind 1111 (as defined in NIP-22)
    - POWR-specific workout event kinds:
      - Kind 1301: Workout Records - Stores completed workout sessions
      - Kind 33401: Exercise Templates - Defines reusable exercise definitions with detailed form instructions
      - Kind 33402: Workout Templates - Defines complete workout plans with associated exercises

### 3. POWR-Specific Nostr Event Kinds

Our app uses custom Nostr event kinds as defined in our exercise NIP (NIP-4e) proposal:

#### Exercise Template (kind: 33401)
These are parameterized replaceable events that define reusable exercise definitions with:
- Title, equipment type, and difficulty level
- Format parameters (weight, reps, RPE, set_type)
- Units for each parameter
- Optional media demonstrations
- Detailed form instructions in the content

#### Workout Template (kind: 33402)
These are parameterized replaceable events that define workout plans with:
- Title and workout type (strength, circuit, EMOM, AMRAP)
- Exercise references with prescribed parameters
- Optional rounds, duration, intervals, and rest times
- Workout instructions in the content

#### Workout Record (kind: 1301)
These are standard events that record completed workouts with:
- Start and end timestamps
- Exercises performed with actual values
- Completion status and rounds completed
- Optional reference to the template used
- Personal records achieved
- Notes about the workout experience

## Testing the Fix

To verify that the Amber integration is working correctly:

1. Make sure you have the Amber app installed on your Android device
2. In the POWR app, try to log in using the "Sign with Amber" button
3. Amber should launch and ask for permission to share your public key and sign the specified event kinds
4. After granting permission, you should be logged in successfully

If you encounter any issues, the extensive logging added should help identify the specific point of failure.

## Common Issues and Troubleshooting

- **Amber Not Launching**: Make sure the Amber app is installed and up to date. The app should be available at package name `com.greenart7c3.nostrsigner`.

- **Permission Denied**: Ensure the Android app has been granted necessary permissions.

- **Signature Missing**: If Amber returns data but the signature is missing, check the Amber app version and ensure it supports the NIP-55 protocol.

- **App Crash During Launch**: This could indicate an issue with the intent construction. Check the logs for details.

The improvements made to the error handling and logging should make it much easier to diagnose any remaining issues.
