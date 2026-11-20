import '@testing-library/jest-dom';

// Mock Web Speech API if missing in jsdom
if (!window.SpeechRecognition && !(window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition) {
  class MockSpeechRecognition {
    continuous = false;
    interimResults = false;
    lang = 'en-US';
    onstart = null;
    onresult = null;
    onerror = null;
    onend = null;
    start() {}
    stop() {}
    abort() {}
  }
  (window as unknown as { SpeechRecognition: typeof MockSpeechRecognition }).SpeechRecognition = MockSpeechRecognition;
}

// Mock window.speechSynthesis
if (!window.speechSynthesis) {
  (window as unknown as { speechSynthesis: unknown }).speechSynthesis = {
    speak: () => {},
    cancel: () => {},
    pause: () => {},
    resume: () => {},
    speaking: false,
    paused: false,
    pending: false,
  };
}
