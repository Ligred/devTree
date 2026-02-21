'use client';

/**
 * VoiceDictationButton — Voice-to-text dictation for text blocks.
 *
 * Features:
 *   - Chrome-only (hidden on other browsers due to better Web Speech API support)
 *   - Local processing via Web Speech API (no server requests)
 *   - Appends recognized text to existing content (doesn't override)
 *   - Visual feedback during recording
 */

import { useEffect, useState, useRef, useCallback, useId } from 'react';
import { Mic } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRecordingStore } from '@/lib/recordingStore';
import { useSettingsStore } from '@/lib/settingsStore';
import { attemptStartRecording } from './recordingHelpers';
import { useConfirmation } from '@/lib/confirmationContext';
import { getSpeechRecognitionApi, isChromeBasedBrowser, DICTATION_LANGUAGE_CODES } from './voiceDictationUtils';
import { formatInterimDictationTextWithPunctuation } from './dictationTextFormatter';

type VoiceDictationButtonProps = Readonly<{
  onTextRecognized: (text: string) => void;
  onInterimText?: (text: string) => void;
  language?: 'en' | 'uk';
  blockId?: string;
}>;

export function VoiceDictationButton({
  onTextRecognized,
  onInterimText,
  language = 'en',
  blockId = '',
}: VoiceDictationButtonProps) {
  const { startRecording, stopRecording } = useRecordingStore();
  const { dictationFormattingEnabled } = useSettingsStore();
  const { confirm } = useConfirmation();
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<InstanceType<typeof SpeechRecognition> | null>(null);
  const transcriptRef = useRef<string>('');
  const languageRef = useRef<'en' | 'uk'>(language);
  const formattingEnabledRef = useRef<boolean>(dictationFormattingEnabled);
  const initRef = useRef(false);
  const generatedId = useId();
  const resolvedBlockId = blockId || generatedId;

  // Sync formattingEnabledRef with dictationFormattingEnabled changes
  useEffect(() => {
    formattingEnabledRef.current = dictationFormattingEnabled;
  }, [dictationFormattingEnabled]);

  // Initialize SpeechRecognition only once on mount
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const SpeechRecognitionAPI = getSpeechRecognitionApi();
    const supported = !!SpeechRecognitionAPI && isChromeBasedBrowser();

    if (SpeechRecognitionAPI && supported) {
      try {
        const recognition = new SpeechRecognitionAPI();
        
        // Enable continuous recognition and interim results
        recognition.continuous = true;
        recognition.interimResults = true;
        
        // Set maximum alternatives to get best transcription
        recognition.maxAlternatives = 1;
        
        recognition.onstart = () => {
          setListening(true);
          startRecording(resolvedBlockId, () => {
            try {
              recognition.stop();
            } catch (e) {
              console.error('Error stopping recognition during cancel:', e);
            }
          });
        };
        
        recognition.onend = async () => {
          setListening(false);
          stopRecording(resolvedBlockId);
          if (transcriptRef.current.trim()) {
            let finalTranscript: string;
            
            if (formattingEnabledRef.current) {
              try {
                // Use enhanced punctuation service (async)
                const { formatDictationTextWithPunctuation } = await import('./dictationTextFormatter');
                finalTranscript = await formatDictationTextWithPunctuation(
                  transcriptRef.current,
                  languageRef.current,
                );
              } catch (error) {
                console.error('[VoiceDictation] Punctuation failed, using basic formatting:', error);
                // Fallback to basic formatting
                const { formatDictationText } = await import('./dictationTextFormatter');
                finalTranscript = formatDictationText(transcriptRef.current);
              }
            } else {
              finalTranscript = transcriptRef.current.trim();
            }
            
            if (finalTranscript) {
              onTextRecognized(finalTranscript);
            }
            transcriptRef.current = '';
          }
        };
        
        recognition.onresult = (event) => {
          let interimTranscript = '';
          let hasFinalResult = false;
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              transcriptRef.current += (transcriptRef.current ? ' ' : '') + transcript;
              hasFinalResult = true;
            } else {
              interimTranscript += transcript;
            }
          }
          
          // Clear interim display when text becomes final
          if (hasFinalResult && onInterimText) {
            onInterimText('');
          }
          
          // Show only current interim text (not accumulated) for real-time display
          if (interimTranscript && onInterimText) {
            const displayText = formattingEnabledRef.current
              ? formatInterimDictationTextWithPunctuation(interimTranscript, languageRef.current)
              : interimTranscript.trim();
            onInterimText(displayText);
          }
        };
        
        recognition.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          setListening(false);
          stopRecording(resolvedBlockId);
        };
        
        recognitionRef.current = recognition;
      } catch (error) {
        console.error('Failed to initialize SpeechRecognition:', error);
      }
    }
    // Note: onInterimText is intentionally omitted from deps as it's optional and changes frequently
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedBlockId, startRecording, stopRecording, onTextRecognized]);

  // Clean up and stop recording when component unmounts or when exiting edit mode
  useEffect(() => {
    return () => {
      if (recognitionRef.current && listening) {
        try {
          recognitionRef.current.stop();
          stopRecording(resolvedBlockId);
        } catch (e) {
          console.error('Error stopping recognition on unmount:', e);
        }
      }
    };
  }, [resolvedBlockId, listening, stopRecording]);

  // Update language and continuous mode when they change
  useEffect(() => {
    languageRef.current = language;

    if (!recognitionRef.current) return;
    
    recognitionRef.current.lang = DICTATION_LANGUAGE_CODES[language];
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
  }, [language]);

  // Update formatting setting when it changes
  useEffect(() => {
    formattingEnabledRef.current = dictationFormattingEnabled;
  }, [dictationFormattingEnabled]);

  const handleToggleRecording = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!recognitionRef.current) return;

    if (listening) {
      try {
        recognitionRef.current.stop();
        setListening(false);
        stopRecording(resolvedBlockId);
      } catch (error) {
        console.error('Error stopping recognition:', error);
      }
    } else {
      await attemptStartRecording({
        blockId: resolvedBlockId,
        confirm,
        startFn: () => {
          transcriptRef.current = '';
          const recognition = recognitionRef.current;
          setTimeout(() => {
            try {
              recognition?.start();
            } catch (error) {
              console.error('Error starting recognition:', error);
            }
          }, 500); // Ensure state updates before starting recognition
        },
      });
    }
  }, [listening, resolvedBlockId, stopRecording, confirm]);

  return (
    <button
      type="button"
      title={listening ? 'Stop voice dictation' : 'Start voice dictation'}
      onMouseDown={handleToggleRecording}
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded text-sm transition-colors',
        listening
          ? 'animate-pulse bg-red-500 text-white'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
      )}
    >
      <Mic size={14} />
    </button>
  );
}
