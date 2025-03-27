# Contact Cache Testing Guide

This document outlines test cases to verify the contact caching system is working correctly.

## Automated Testing Checks

Run the following tests to verify the contact caching functionality:

### Test 1: Initial App Launch (Cold Start)

**Steps:**
1. Completely close the app
2. Clear any app data (if testing on development)
3. Launch the app 
4. Navigate to the Following feed tab
5. Wait for the feed to load

**Expected Results:**
- You should see a log message: `[SocialFeedService] No contacts available for following feed yet, using fallback`
- Initial content should load from the POWR account as fallback
- In the logs, you should eventually see contacts being loaded and cached: `[useContactList] Cached X contacts for <pubkey>`
- The feed should update after contacts are loaded

### Test 2: App Restart (Warm Start)

**Steps:**
1. Restart the app after Test 1
2. Navigate to the Following feed tab
3. Wait for the feed to load

**Expected Results:**
- In the logs, you should see: `[useContactList] Loaded X contacts from cache`
- The Following feed should load quickly using cached contacts
- You should NOT see the feed refresh unexpectedly after a few seconds
- The feed should remain stable without unexpected refreshes

### Test 3: Add/Remove Contacts

**Steps:**
1. Follow or unfollow a user in the app
2. Navigate back to the Following feed

**Expected Results:**
- The contact changes should be saved to cache
- The following feed should update to reflect the new contact list
- The feed should not continuously refresh

### Test 4: Offline Mode

**Steps:**
1. Load the app and navigate to the Following feed
2. Enable airplane mode or disconnect from the internet
3. Restart the app
4. Navigate to the Following feed

**Expected Results:**
- The app should load cached contacts
- The feed should show cached content
- You should see offline indicators in the UI

## Manual Inspection

For developers, perform these additional checks:

1. **Database Inspection:**
   ```sql
   SELECT * FROM contact_cache WHERE owner_pubkey = '<your-test-user-pubkey>';
   ```
   - Verify contacts are being stored in the database
   - Check that the cached_at timestamp is updated when refreshing contacts

2. **Log Analysis:**
   - Check the logs to ensure the caching system is working as expected
   - Verify there are no errors related to contact caching
   - Confirm the refresh logic is not triggering multiple times

3. **Network Traffic:**
   - Monitor network requests to ensure we're not making excessive requests for contacts
   - Verify that after initial load, contact requests are less frequent

## Troubleshooting

If you encounter issues with the contact caching system:

1. **Feed Refreshes Unexpectedly:**
   - Check if the contacts are being cached correctly
   - Verify that the cached contacts are being loaded before attempting to fetch from the network
   - Check for error patterns in the logs around the time of the refresh

2. **No Content in Following Feed:**
   - Verify the user is authenticated
   - Check if contacts are being fetched properly
   - Ensure the fallback to POWR account is working

3. **Database Issues:**
   - Verify the contact_cache table was created
   - Check for SQL errors in the logs
   - Try clearing the app data and restarting (last resort)

## Reporting Issues

When reporting issues, please include:

1. Full logs showing the flow from app start through to the Following feed
2. Details about when the refresh occurs (if applicable)
3. Steps to reproduce the issue
4. Device and OS information
