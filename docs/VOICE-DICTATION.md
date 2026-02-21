# Voice Dictation — Behavior and Implementation

This document describes the voice dictation UX and the implementation details for recording switching and confirmation.

## Key Behavior

- A single global recording may be active at a time. The active block ID is stored in `useRecordingStore`.
- When attempting to start a recording while another block is already recording, the app shows a confirmation dialog. If the user confirms, the previous recording is stopped and the new recording starts immediately.
- Use `attemptStartRecording` helper from `components/MainContent/blocks/recordingHelpers.tsx` to start recording with built-in confirmation logic.

## Components

- `VoiceDictationButton` uses the helper and local `SpeechRecognition` to capture audio.
- `RecordingIndicator` shows a global floating indicator with the active block id and a Stop button.
- `TextBlock` displays interim text inline as user speaks (styled with italic + lower opacity).

## Real-time Interim Text Display

Interim text (live transcription as user speaks) is now displayed directly in the editor's text flow:
- Appears as italic, semi-transparent text at the end of content
- Updates continuously as speech is recognized
- Automatically replaced with final formatted text when recording stops
- No absolute positioning—text flows naturally with editor content

## Formatting (Local, No Backend)

**Current Implementation:**
- Capitalization: First letter + sentence starts after `.!?…`
- Whitespace normalization: Collapses multiple spaces
- Terminal punctuation: Adds `.` if missing at end

**Settings Control:**
- User preference in Settings Dialog: "Auto-format dictation"
- Stored in `useSettingsStore` with localStorage persistence
- Synced to server via `/api/user/preferences` when available

## ⚠️ Punctuation Limitation

**IMPORTANT:** Web Speech API (browser's built-in speech recognition) does **NOT** automatically add punctuation to transcripts. This is true for all languages (English, Ukrainian, etc.).

The API only transcribes spoken audio literally. If you say:
- "hello world" → transcript: `"hello world"` (no comma, no period)
- Ukrainian speech → transcript has no commas, periods, question marks, etc.

The browser **does not** recognize spoken commands like:
- "hello comma world" → transcript: `"hello comma world"` (literal text "comma", not `,`)

### Why This Happens

Web Speech API uses Google's speech recognition service, which focuses on transcription accuracy, not punctuation. Punctuation requires linguistic context analysis (NLP) that the basic API doesn't provide.

### Solutions for True Punctuation

Choose one of these approaches:

#### Option 1: Browser-Side NLP (Recommended for Privacy)

Use **Transformers.js** with a punctuation restoration model:

\`\`\`typescript
// Install: npm install @xenova/transformers

import { pipeline } from '@xenova/transformers';

// Initialize once (downloads ~50-100MB model on first use)
const punctuator = await pipeline(
  'text-classification',
  'Xenova/wav2vec2-bert-xls-r-punctuation'
);

async function addPunctuation(text: string): Promise<string> {
  const result = await punctuator(text);
  return result;
}
\`\`\`

**Pros:**
- Runs locally in browser (no API calls, no privacy concerns)
- Works offline
- Free
- Supports multiple languages

**Cons:**
- ~50-100MB model download on first use
- Adds ~2-5s latency for processing
- May impact browser performance on low-end devices

#### Option 2: Server-Side API

**OpenAI Whisper API:**
\`\`\`typescript
async function transcribeWithPunctuation(audioBlob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.webm');
  formData.append('model', 'whisper-1');
  formData.append('language', 'uk'); // or 'en'
  
  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': \`Bearer \${process.env.OPENAI_API_KEY}\` },
    body: formData
  });
  
  const data = await response.json();
  return data.text; // Includes punctuation
}
\`\`\`

**Pros:**
- Excellent punctuation quality
- Supports 90+ languages
- No client-side model download

**Cons:**
- Costs ~$0.006 per minute of audio
- Requires API key
- Privacy: audio sent to OpenAI servers
- Network latency

**Alternative APIs:**
- Google Cloud Speech-to-Text ($0.016/min, good punctuation)
- AssemblyAI ($0.00025/sec, specialized transcription)
- Custom FastAPI + punctuation model (self-hosted)

#### Option 3: Hybrid Approach (Best UX)

Use Web Speech API for instant interim results + server for final punctuation:

1. Show real-time interim text from Web Speech API (current implementation)
2. When recording stops, send audio to Whisper API
3. Replace text in editor with punctuated version
4. Show loading indicator during processing

\`\`\`typescript
async function handleVoiceDictationEnd(rawTranscript: string, audioBlob: Blob) {
  // Insert raw transcript immediately (instant feedback)
  editor.insertContent(rawTranscript);
  
  // Show "Processing..." indicator
  setProcessing(true);
  
  try {
    // Get punctuated version from server
    const punctuated = await transcribeWithPunctuation(audioBlob);
    
    // Replace raw text with punctuated version
    editor.selectAll().insertContent(punctuated);
  } catch (err) {
    console.error('Punctuation failed, keeping raw transcript:', err);
  } finally {
    setProcessing(false);
  }
}
\`\`\`

**Pros:**
- Best of both worlds: instant feedback + accurate punctuation
- Graceful degradation if API fails
- Can enable only for longer recordings (>30 seconds)

**Cons:**
- More complex implementation
- API costs for final transcription

### Recommendation

For your use case (Ukrainian + English, privacy-conscious, free):
→ **Use Transformers.js with `deepmultilingualpunctuation` model**

Implementation estimate: ~4 hours
- 2 hours: integrate Transformers.js, handle model loading
- 1 hour: update UI (loading states, error handling)
- 1 hour: testing with Ukrainian/English text

## Testing & Stories

- Unit tests for the helper are in `components/MainContent/blocks/recordingHelpers.test.tsx`.
- Unit tests for dictation formatting are in `components/MainContent/blocks/dictationTextFormatter.test.ts`.
- Storybook stories for the indicator and confirmation dialog variants are in `stories/RecordingIndicator.stories.tsx` and `stories/ConfirmationDialog.stories.tsx`.
