// Audio Analyzer — Lively audio injection + getDisplayMedia fallback
// Priority: 1) Lively injects via livelyAudioListener  2) Screen capture system audio
class AudioAnalyzer {
    constructor() {
        this.isRunning = false;
        this.source = null; // 'lively' or 'capture'
        this.bufferLength = 512;
        this.frequencyData = new Uint8Array(this.bufferLength);
        this.timeDomainData = new Uint8Array(this.bufferLength);

        // Web Audio API (for capture fallback)
        this.audioContext = null;
        this.analyser = null;
        this.webFreqData = null;
        this.webTimeData = null;

        // Lively audio processing state (match Web Audio API AnalyserNode behavior)
        this._prevSmoothed = new Float32Array(this.bufferLength); // temporal smoothing buffer
        this._livelyPhases = new Float32Array(64); // random phases for waveform synthesis
        for (let i = 0; i < 64; i++) {
            this._livelyPhases[i] = Math.random() * Math.PI * 2;
        }
    }

    // Called each frame — if Lively is pushing audio, use it
    poll() {
        if (this.source === 'lively') {
            const audioArray = window._livelyAudioData;
            if (!audioArray) return;
            this.isRunning = true;

            const srcLen = audioArray.length || 128;
            const smoothing = 0.8; // Match Web Audio API default smoothingTimeConstant
            // Lively values are normalized [0-1], not raw FFT magnitudes,
            // so use a dB range scaled for that domain
            const minDB = -50, maxDB = 0, dbRange = maxDB - minDB;

            // --- Frequency data: interpolate, smooth, apply dB curve ---
            for (let i = 0; i < this.bufferLength; i++) {
                // Linear interpolation from Lively's 128 bins to 512
                const srcPos = (i / this.bufferLength) * srcLen;
                const lo = Math.floor(srcPos);
                const hi = Math.min(lo + 1, srcLen - 1);
                const frac = srcPos - lo;
                const raw = (audioArray[lo] || 0) * (1 - frac) + (audioArray[hi] || 0) * frac;

                // Temporal smoothing (same as AnalyserNode.smoothingTimeConstant)
                const smoothed = smoothing * this._prevSmoothed[i] + (1 - smoothing) * raw;
                this._prevSmoothed[i] = smoothed;

                // Convert linear amplitude to dB-scaled byte
                // Gives natural dynamic range: quiet signals visible, loud signals don't clip
                let dbByte = 0;
                if (smoothed > 0.00001) {
                    const dB = 20 * Math.log10(smoothed);
                    dbByte = 255 * (dB - minDB) / dbRange;
                }
                this.frequencyData[i] = Math.min(255, Math.max(0, Math.round(dbByte)));
            }

            // --- Time-domain data: additive synthesis from frequency content ---
            // Simulate what getByteTimeDomainData returns (PCM waveform centered at 128)
            const t = performance.now() * 0.001;
            const numHarmonics = 48;
            for (let i = 0; i < this.bufferLength; i++) {
                let sample = 0;
                const pos = i / this.bufferLength;
                for (let h = 0; h < numHarmonics; h++) {
                    // Sample amplitude from the smoothed Lively data
                    const srcIdx = Math.floor((h / numHarmonics) * srcLen);
                    const amp = this._prevSmoothed[Math.floor((h / numHarmonics) * this.bufferLength)];
                    if (amp < 0.005) continue;
                    // Each harmonic oscillates at its own frequency with a pre-randomized phase
                    const phase = this._livelyPhases[h % 64];
                    sample += Math.sin(pos * Math.PI * 2 * (h + 1) + phase + t * (h + 1) * 0.4) * amp;
                }
                // Scale and center around 128, clamp to [0, 255]
                this.timeDomainData[i] = Math.min(255, Math.max(0, Math.round(128 + sample * 55)));
            }
        } else if (this.source === 'capture' && this.analyser) {
            this.analyser.getByteFrequencyData(this.webFreqData);
            this.analyser.getByteTimeDomainData(this.webTimeData);
            for (let i = 0; i < this.bufferLength; i++) {
                this.frequencyData[i] = this.webFreqData[i];
                this.timeDomainData[i] = this.webTimeData[i];
            }
        }
    }

    // Check if Lively has sent any audio data
    hasLivelyAudio() {
        return !!window._livelyAudioData;
    }

    // Enable Lively mode
    enableLively() {
        this.source = 'lively';
        this.isRunning = true;
    }

    // Fallback: capture system audio via getDisplayMedia
    async captureSystemAudio() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }

        let stream = null;
        try {
            stream = await navigator.mediaDevices.getDisplayMedia({
                audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
                video: { width: 1 }
            });
        } catch (e) {
            stream = await navigator.mediaDevices.getDisplayMedia({
                audio: true,
                video: { width: 1 }
            });
        }

        const audioTracks = stream.getAudioTracks();
        const videoTracks = stream.getVideoTracks();
        videoTracks.forEach(t => t.stop());

        if (audioTracks.length === 0) {
            throw new Error('No audio track — make sure "Share system audio" is enabled.');
        }

        const sourceNode = this.audioContext.createMediaStreamSource(stream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = this.bufferLength * 2;
        sourceNode.connect(this.analyser);

        this.webFreqData = new Uint8Array(this.analyser.frequencyBinCount);
        this.webTimeData = new Uint8Array(this.analyser.fftSize);

        this.source = 'capture';
        this.isRunning = true;

        audioTracks[0].onended = () => { this.stop(); };
        return true;
    }

    getFrequencyData() {
        if (!this.isRunning) return null;
        return this.frequencyData;
    }

    getTimeDomainData() {
        if (!this.isRunning) return null;
        return this.timeDomainData;
    }

    stop() {
        this.isRunning = false;
        this.source = null;
        if (this.analyser) { this.analyser.disconnect(); this.analyser = null; }
    }
}

window.AudioAnalyzer = AudioAnalyzer;
