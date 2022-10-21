class Speaker {
    constructor() {
        const AudioContext = window.AudioContext || window.webkitAudioContext;

        this.audioCtx = new AudioContext();

        // Create a gain, allow volume control
        this.gain = this.audioCtx.createGain();
        this.finish = this.audioCtx.destination;

        // Connect gain to audio context
        this.gain.connect(this.finish);

        // Mute audio
        this.gain.setValueAtTime(0, this.audioCtx.currentTime);

        // Unmute audio
        this.gain.setValueAtTime(1, this.audioCtx.currentTime);
    }

    // Plays sound at desired frequency
    play(frequency) {
        if (this.audioCtx && !this.oscillator) {
            // Oscillator plays sound
            this.oscillator = this.audioCtx.createOscillator();

            // Set frequency
            this.oscillator.frequency.setValueAtTime(frequency || 440, this.audioCtx.currentTime);

            // Square wave
            this.oscillator.type = 'square';

            // Connect gain
            this.oscillator.connect(this.gain);
            // Play sound
            this.oscillator.start();
        }
    }

    // Stop sound
    stop() {
        if (this.oscillator) {
            this.oscillator.stop();
            this.oscillator.disconnect();
            this.oscillator = null;
        }
    }
}

export default Speaker;