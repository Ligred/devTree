# Voice Dictation — Behavior and Implementation

This document describes the voice dictation UX and the implementation details for recording switching and confirmation.

Key points
- A single global recording may be active at a time. The active block ID is stored in `useRecordingStore`.
- When attempting to start a recording while another block is already recording, the app shows a confirmation dialog. If the user confirms, the previous recording is stopped and the new recording starts immediately.
- Use `attemptStartRecording` helper from `components/MainContent/blocks/recordingHelpers.tsx` to start recording with built-in confirmation logic.

Components
- `VoiceDictationButton` uses the helper and local `SpeechRecognition` to capture audio.
- `RecordingIndicator` shows a global floating indicator with the active block id and a Stop button.

Testing & Stories
- Unit tests for the helper are in `components/MainContent/blocks/recordingHelpers.test.tsx`.
- Storybook stories for the indicator and confirmation dialog variants are in `stories/RecordingIndicator.stories.tsx` and `stories/ConfirmationDialog.stories.tsx`.
