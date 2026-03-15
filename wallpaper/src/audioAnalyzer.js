// Audio Analyzer — Lively audio injection + getDisplayMedia fallback
// Priority: 1) Lively injects via livelyAudioListener  2) Screen capture system audio
class AudioAnalyzer {
    constructor() {
        this.isRunning = false;
        this.source = null; // 'lively' or 'capture'
        this.bufferLength = 128;
        this.frequencyData = new Uint8Array(this.bufferLength);
        this.timeDomainData = new Uint8Array(this.bufferLength);

        // Web Audio API (for capture fallback)
        this.audioContext = null;
        this.analyser = null;
        this.webFreqData = null;
        this.webTimeData = null;
    }

    // Called each frame — if Lively is pushing audio, use it
    poll() {
        if (this.source === 'lively') {
            const audioArray = window._livelyAudioData;
            if (!audioArray) return;
            this.isRunning = true;

            for (let i = 0; i < this.bufferLength; i++) {
                this.frequencyData[i] = Math.min(255, Math.max(0, Math.round((audioArray[i] || 0) * 255)));
            }
            let sum = 0;
            for (let i = 0; i < audioArray.length; i++) sum += audioArray[i] || 0;
            const energy = sum / audioArray.length;
            const t = performance.now() * 0.005;
            for (let i = 0; i < this.bufferLength; i++) {
                const deviation = Math.sin(i * 0.3 + t) * energy * 80;
                this.timeDomainData[i] = Math.min(255, Math.max(0, Math.round(128 + deviation)));
            }
        } else if (this.source === 'capture' && this.analyser) {
            this.analyser.getByteFrequencyData(this.webFreqData);
            this.analyser.getByteTimeDomainData(this.webTimeData);
            // Copy into our standard buffers
            const len = Math.min(this.bufferLength, this.webFreqData.length);
            for (let i = 0; i < len; i++) {
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
        this.analyser.fftSize = 256;
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
