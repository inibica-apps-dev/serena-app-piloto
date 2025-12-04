
/**
 * Cleans markdown and structural characters from text to make it sound natural via TTS.
 */
export const cleanTextForSpeech = (text: string): string => {
  return text
    .replace(/\*\*/g, '') // Remove bold markers
    .replace(/^> /gm, '') // Remove quote markers at start of lines
    .replace(/>/g, '') // Remove remaining >
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links [text](url) to just "text"
    .replace(/(https?:\/\/[^\s]+)/g, 'enlace') // Replace raw URLs with the word "enlace"
    .replace(/[-•]/g, '') // Remove list bullets
    .trim();
};

/**
 * Global function to handle text-to-speech with Spanish voice preference.
 */
export const speakText = (
  text: string, 
  onStart?: () => void, 
  onEnd?: () => void
): SpeechSynthesisUtterance => {
  // 1. Stop any current speech
  window.speechSynthesis.cancel();

  // 2. Prepare text
  const textToRead = cleanTextForSpeech(text);
  const utterance = new SpeechSynthesisUtterance(textToRead);
  
  // 3. Configure Language (Spanish)
  utterance.lang = 'es-ES';
  
  // Attempt to find a high-quality Spanish voice
  const voices = window.speechSynthesis.getVoices();
  const spanishVoice = voices.find(v => v.lang.startsWith('es') && v.name.includes('Google')) 
                    || voices.find(v => v.lang.startsWith('es'));
  
  if (spanishVoice) {
    utterance.voice = spanishVoice;
  }

  // 4. Rate and Pitch adjustments for a more "medical/calm" tone
  utterance.rate = 1.0; 
  utterance.pitch = 1.0;

  // 5. Event Handlers
  if (onStart) utterance.onstart = onStart;
  
  utterance.onend = () => {
    if (onEnd) onEnd();
  };
  
  utterance.onerror = (e) => {
    console.error("TTS Error:", e);
    if (onEnd) onEnd();
  };

  // 6. Speak
  window.speechSynthesis.speak(utterance);
  
  return utterance;
};

export const stopSpeech = () => {
  window.speechSynthesis.cancel();
};
