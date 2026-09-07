// src/Utils/ringtone.js
// Web Audio API realistic phone ringtone synthesizer + Web Speech API voice announcements

let audioCtx = null;
let ringtoneInterval = null;

export const playIncomingCallRingtone = (callerName = '') => {
  stopIncomingCallRingtone();

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();

      const playRingBurst = () => {
        if (!audioCtx || audioCtx.state === 'closed') return;

        // Tone frequencies (Standard modern phone dual-tone: 440Hz + 480Hz)
        const now = audioCtx.currentTime;
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(440, now);

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(480, now);

        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.2, now + 0.05);
        gainNode.gain.setValueAtTime(0.2, now + 1.2);
        gainNode.gain.linearRampToValueAtTime(0, now + 1.5);

        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.6);
        osc2.stop(now + 1.6);
      };

      // Play initial burst
      playRingBurst();

      // Loop ringtone every 3.2 seconds
      ringtoneInterval = setInterval(playRingBurst, 3200);
    }

    // Voice announcement using SpeechSynthesis
    if ('speechSynthesis' in window && callerName) {
      setTimeout(() => {
        try {
          const utterance = new SpeechSynthesisUtterance(`Incoming meeting from ${callerName}`);
          utterance.rate = 1.0;
          utterance.pitch = 1.0;
          utterance.volume = 0.8;
          window.speechSynthesis.speak(utterance);
        } catch (speechErr) {
          console.warn('Speech synthesis error:', speechErr);
        }
      }, 600);
    }
  } catch (err) {
    console.warn('Audio ringtone playback error:', err);
  }
};

export const stopIncomingCallRingtone = () => {
  if (ringtoneInterval) {
    clearInterval(ringtoneInterval);
    ringtoneInterval = null;
  }
  if (audioCtx) {
    try {
      audioCtx.close();
    } catch (e) {}
    audioCtx = null;
  }
  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}
  }
};
