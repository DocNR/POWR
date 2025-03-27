# Cache Implementation Testing Guide

This document outlines the testing strategy for the NDK Mobile Cache Integration in the POWR app. It provides guidelines for testing each component of the caching system to ensure reliability, performance, and a seamless user experience in both online and offline scenarios.

## Testing Objectives

1. Verify that all cache components function correctly in isolation
2. Ensure proper integration between cache components and the UI
3. Validate offline functionality across all app features
4. Measure performance improvements from caching
5. Test edge cases and error handling

## Test Environment Setup

### Simulating Offline Mode

To properly test offline functionality, use one of these approaches:

1. **Device Airplane Mode**: Enable airplane mode on the test device
2. **Network Throttling**: Use React Native Debugger or Chrome DevTools to simulate slow or unreliable connections
3. **Mock Connectivity Service**: Modify the `ConnectivityService` to report offline status regardless of actual connectivity

```typescript
// Example: Force offline mode for testing
ConnectivityService.getInstance().overrideNetworkStatus(false);
```

### Test Data Generation

Create a consistent set of test data for reproducible testing:

1. **Test Accounts**: Create dedicated test accounts with known data
2. **Seed Data**: Populate the cache with known seed data before testing
3. **Mock Events**: Generate mock Nostr events for testing specific scenarios

## Component Testing

### 1. Profile Image Cache Testing

**Test Cases:**

1. **Cache Hit**: Verify that previously cached images load without network requests
2. **Cache Miss**: Ensure new images are downloaded and cached properly
3. **Cache Expiry**: Test that expired images are refreshed when online
4. **Offline Behavior**: Confirm cached images display when offline
5. **Error Handling**: Test behavior when image URLs are invalid or unreachable

**Testing Method:**
```typescript
// Example test for ProfileImageCache
test('should return cached image for known pubkey', async () => {
  const pubkey = 'known-test-pubkey';
  const cachedUri = await profileImageCache.getProfileImageUri(pubkey);
  expect(cachedUri).not.toBeUndefined();
  
  // Verify it's a file URI pointing to the cache directory
  expect(cachedUri).toContain(FileSystem.cacheDirectory);
});
```

### 2. Publication Queue Testing

**Test Cases:**

1. **Queue Storage**: Verify events are properly stored when created offline
2. **Auto-Publishing**: Confirm queued events are published when connectivity is restored
3. **Retry Mechanism**: Test that failed publications are retried
4. **Queue Management**: Ensure the queue is properly maintained (events removed after successful publishing)
5. **Priority Handling**: Verify high-priority events are published first

**Testing Method:**
```typescript
// Example test for PublicationQueueService
test('should queue event when offline and publish when online', async () => {
  // Force offline mode
  ConnectivityService.getInstance().overrideNetworkStatus(false);
  
  // Create and queue event
  const event = await publicationQueueService.createAndQueueEvent(1, 'test content', []);
  expect(await publicationQueueService.getQueuedEventCount()).toBe(1);
  
  // Restore online mode
  ConnectivityService.getInstance().overrideNetworkStatus(true);
  
  // Trigger sync and wait for completion
  await publicationQueueService.syncQueuedEvents();
  
  // Verify queue is empty after publishing
  expect(await publicationQueueService.getQueuedEventCount()).toBe(0);
});
```

### 3. Social Feed Cache Testing

**Test Cases:**

1. **Cache Storage**: Verify feed events are properly cached
2. **Feed Types**: Test caching for different feed types (following, POWR, global)
3. **Pagination**: Ensure cached feeds support pagination
4. **Offline Browsing**: Confirm users can browse cached feeds when offline
5. **Cache Refresh**: Test that feeds are refreshed when online

**Testing Method:**
```typescript
// Example test for SocialFeedCache
test('should return cached events when offline', async () => {
  // Populate cache with known events
  await socialFeedCache.cacheEvents('following', mockEvents);
  
  // Force offline mode
  ConnectivityService.getInstance().overrideNetworkStatus(false);
  
  // Retrieve cached events
  const cachedEvents = await socialFeedCache.getCachedEvents('following', 10);
  
  // Verify events match
  expect(cachedEvents.length).toBe(mockEvents.length);
  expect(cachedEvents[0].id).toBe(mockEvents[0].id);
});
```

### 4. Workout History Testing

**Test Cases:**

1. **Local Storage**: Verify workouts are stored locally
2. **Nostr Sync**: Test synchronization with Nostr when online
3. **Offline Creation**: Confirm workouts can be created and viewed offline
4. **Conflict Resolution**: Test handling of conflicts between local and remote workouts
5. **Data Integrity**: Ensure all workout data is preserved correctly

**Testing Method:**
```typescript
// Example test for UnifiedWorkoutHistoryService
test('should store workout locally and sync to Nostr when online', async () => {
  // Force offline mode
  ConnectivityService.getInstance().overrideNetworkStatus(false);
  
  // Create workout offline
  const workout = await workoutHistoryService.createWorkout(mockWorkoutData);
  
  // Verify it's in local storage
  const localWorkout = await workoutHistoryService.getWorkoutById(workout.id);
  expect(localWorkout).not.toBeNull();
  
  // Restore online mode
  ConnectivityService.getInstance().overrideNetworkStatus(true);
  
  // Trigger sync
  await workoutHistoryService.syncWorkouts();
  
  // Verify workout was published to Nostr
  const nostrWorkout = await nostrWorkoutService.getWorkoutById(workout.id);
  expect(nostrWorkout).not.toBeNull();
});
```

### 5. Exercise Library Testing

**Test Cases:**

1. **Local Cache**: Verify exercises are cached locally
2. **Offline Access**: Confirm exercises can be browsed offline
3. **Cache Updates**: Test that the cache is updated when online
4. **Search & Filter**: Ensure search and filtering work with cached data
5. **Custom Exercises**: Test creation and storage of custom exercises

**Testing Method:**
```typescript
// Example test for ExerciseService
test('should provide exercises when offline', async () => {
  // Populate cache with exercises
  await exerciseService.cacheExercises(mockExercises);
  
  // Force offline mode
  ConnectivityService.getInstance().overrideNetworkStatus(false);
  
  // Retrieve exercises
  const exercises = await exerciseService.getExercises();
  
  // Verify exercises are available
  expect(exercises.length).toBeGreaterThan(0);
  expect(exercises[0].name).toBe(mockExercises[0].name);
});
```

### 6. Workout Templates Testing

**Test Cases:**

1. **Template Cache**: Verify templates are cached locally
2. **Offline Access**: Confirm templates can be used offline
3. **Favorites**: Test that favorite templates are prioritized for offline access
4. **Template Updates**: Ensure templates are updated when online
5. **Template Creation**: Test creation and storage of new templates offline

**Testing Method:**
```typescript
// Example test for TemplateService
test('should allow template creation when offline', async () => {
  // Force offline mode
  ConnectivityService.getInstance().overrideNetworkStatus(false);
  
  // Create template
  const template = await templateService.createTemplate(mockTemplateData);
  
  // Verify it's in local storage
  const localTemplate = await templateService.getTemplateById(template.id);
  expect(localTemplate).not.toBeNull();
  expect(localTemplate.title).toBe(mockTemplateData.title);
});
```

### 7. Contact List Testing

**Test Cases:**

1. **Contact Cache**: Verify contacts are cached locally
2. **Offline Access**: Confirm contact list is available offline
3. **Contact Updates**: Test that contacts are updated when online
4. **Following Feed**: Ensure following feed works with cached contacts
5. **Profile Display**: Test profile display with cached contact data

**Testing Method:**
```typescript
// Example test for contact list caching
test('should provide contacts when offline', async () => {
  // Cache contacts
  await contactListService.cacheContacts(mockContacts);
  
  // Force offline mode
  ConnectivityService.getInstance().overrideNetworkStatus(false);
  
  // Retrieve contacts
  const contacts = await contactListService.getContacts();
  
  // Verify contacts are available
  expect(contacts.length).toBe(mockContacts.length);
});
```

### 8. General Media Cache Testing

**Test Cases:**

1. **Media Storage**: Verify media files are cached correctly
2. **Cache Limits**: Test that cache size limits are enforced
3. **LRU Eviction**: Ensure least recently used media is evicted when cache is full
4. **Offline Access**: Confirm cached media is available offline
5. **Media Types**: Test caching of different media types (images, videos, etc.)

**Testing Method:**
```typescript
// Example test for general media cache
test('should cache and retrieve media files', async () => {
  // Cache media
  const mediaUri = 'https://example.com/test-image.jpg';
  const cachedUri = await mediaCacheService.cacheMedia(mediaUri);
  
  // Verify it's cached
  expect(cachedUri).toContain(FileSystem.cacheDirectory);
  
  // Force offline mode
  ConnectivityService.getInstance().overrideNetworkStatus(false);
  
  // Retrieve cached media
  const retrievedUri = await mediaCacheService.getMedia(mediaUri);
  
  // Verify it's the same cached URI
  expect(retrievedUri).toBe(cachedUri);
});
```

## Integration Testing

### UI Component Integration

Test that UI components correctly integrate with cache services:

1. **Feed Components**: Verify feed components display cached content
2. **Profile Components**: Test profile components with cached profile data
3. **Exercise Library**: Ensure exercise library uses cached exercises
4. **Workout History**: Test workout history display with cached workouts
5. **Templates**: Verify template selection with cached templates

### Offline Mode UI

Test the UI adaptations for offline mode:

1. **Offline Indicators**: Verify offline indicators are displayed correctly
2. **Disabled Actions**: Test that network-dependent actions are properly disabled
3. **Error Messages**: Ensure appropriate error messages are shown for unavailable features
4. **Queued Actions**: Verify UI feedback for queued actions

## Performance Testing

Measure the performance impact of caching:

1. **Load Times**: Compare load times with and without cache
2. **Network Usage**: Measure reduction in network requests
3. **Memory Usage**: Monitor memory consumption of the cache
4. **Battery Impact**: Assess battery usage with different caching strategies
5. **Storage Usage**: Measure storage space used by the cache

## Edge Case Testing

Test unusual scenarios and error conditions:

1. **Intermittent Connectivity**: Test behavior with rapidly changing connectivity
2. **Storage Limits**: Test behavior when device storage is nearly full
3. **Cache Corruption**: Test recovery from corrupted cache data
4. **Version Upgrades**: Verify cache behavior during app version upgrades
5. **Multiple Devices**: Test synchronization across multiple devices

## Automated Testing

Implement automated tests for continuous validation:

1. **Unit Tests**: Automated tests for individual cache services
2. **Integration Tests**: Automated tests for cache-UI integration
3. **E2E Tests**: End-to-end tests for offline scenarios
4. **Performance Benchmarks**: Automated performance measurements
5. **CI/CD Integration**: Include cache tests in continuous integration pipeline

## Manual Testing Checklist

A checklist for manual testing of cache functionality:

- [ ] Verify all features work normally when online
- [ ] Enable airplane mode and verify offline functionality
- [ ] Create content offline and verify it's queued
- [ ] Restore connectivity and verify queued content is published
- [ ] Verify cached images display correctly offline
- [ ] Test offline access to exercise library
- [ ] Verify workout templates are available offline
- [ ] Test offline workout creation and history
- [ ] Verify offline browsing of social feeds
- [ ] Test behavior with low storage conditions
- [ ] Verify cache is properly maintained over time

## Conclusion

Thorough testing of the cache implementation is essential to ensure a reliable offline experience for POWR app users. By following this testing guide, you can verify that all cache components function correctly in isolation and together, providing a seamless experience regardless of connectivity status.
