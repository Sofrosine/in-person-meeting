---
name: review-submission
description: Review the complete project against all evaluation criteria from the Affinity Labs assessment. Checks config plugin (25%), background recording (25%), architecture (20%), notifications (15%), code quality (10%), and product thinking (5%).
argument-hint: "[full|quick|criteria-name]"
---

# Review Submission Against Evaluation Criteria

Thoroughly review the project against the Affinity Labs evaluation rubric.

## Evaluation Criteria

### 1. Config Plugin (25%)
- [ ] Correctly configures native projects for background audio
- [ ] iOS: UIBackgroundModes includes 'audio' in Info.plist
- [ ] iOS: NSMicrophoneUsageDescription is set
- [ ] iOS: AVAudioSession category understanding demonstrated
- [ ] Android: RECORD_AUDIO permission declared
- [ ] Android: FOREGROUND_SERVICE permission declared
- [ ] Android: FOREGROUND_SERVICE_MICROPHONE permission (Android 14+)
- [ ] Android: Foreground service type for microphone configured
- [ ] Android: Notification channel for foreground service
- [ ] Plugin uses proper Expo config plugin APIs
- [ ] Plugin is properly registered in app config

### 2. Background Recording (25%)
- [ ] Recording starts with one tap
- [ ] Recording continues when app is backgrounded
- [ ] Recording continues when screen is locked
- [ ] Handles audio interruptions (phone calls, etc.)
- [ ] Duration timer works correctly
- [ ] Recording can be stopped reliably
- [ ] Audio file is saved and accessible after stopping
- [ ] Works on both iOS and Android
- [ ] Proper cleanup on stop

### 3. Architecture (20%)
- [ ] Clean separation of concerns
- [ ] Easy to understand file structure
- [ ] Follows required project structure (/app, /plugins, /backend)
- [ ] Proper use of hooks for business logic
- [ ] Library/utility code separated from UI
- [ ] Types properly defined
- [ ] Supabase client properly abstracted
- [ ] State management is clean
- [ ] Error handling patterns are consistent
- [ ] Easy to extend

### 4. Notifications + Deep Linking (15%)
- [ ] Push notification permission requested
- [ ] Push token registered and stored
- [ ] Notification sent when transcript is ready
- [ ] Tapping notification navigates to correct meeting
- [ ] Deep link format works: meetingnotes:///meeting/[id]
- [ ] Handles notification when app is foreground/background/killed
- [ ] Android notification channel configured

### 5. Code Quality (10%)
- [ ] TypeScript used throughout (no `any` types)
- [ ] Proper error handling (try/catch, error states)
- [ ] Readable code with clear naming
- [ ] No unused imports or dead code
- [ ] Consistent code style
- [ ] Proper async/await usage

### 6. Product Thinking (5%)
- [ ] Would this actually work for recording meetings?
- [ ] UI is intuitive (one-tap recording)
- [ ] Loading states and feedback
- [ ] Error messages are user-friendly
- [ ] Recording indicator visible to user

## Deliverables Checklist
- [ ] Public GitHub repository
- [ ] README with: how to run locally
- [ ] README with: architecture decisions (1 page max)
- [ ] README with: what you'd improve with more time
- [ ] Screen recording showing full flow

## Action Items
After review, list specific improvements to make before submission.
