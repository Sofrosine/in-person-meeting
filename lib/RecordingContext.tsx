import React, { createContext, useContext } from 'react';
import { useAudioRecording, type UseAudioRecording } from '@/hooks/useAudioRecording';

/**
 * RecordingContext provides recording state to the entire app.
 *
 * This allows any screen (e.g., tab bar, meetings list) to know if a
 * recording is in progress and display appropriate UI indicators.
 * The actual recording logic lives in useAudioRecording – this context
 * simply hoists a single instance to the component tree.
 */
const RecordingContext = createContext<UseAudioRecording | null>(null);

export function RecordingProvider({ children }: { children: React.ReactNode }) {
  const recording = useAudioRecording();

  return (
    <RecordingContext.Provider value={recording}>
      {children}
    </RecordingContext.Provider>
  );
}

export function useRecording(): UseAudioRecording {
  const context = useContext(RecordingContext);
  if (!context) {
    throw new Error('useRecording must be used within a RecordingProvider');
  }
  return context;
}
