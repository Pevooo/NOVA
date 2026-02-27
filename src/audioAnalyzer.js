// Audio Analyzer - Web Audio API setup and analysis
class AudioAnalyzer {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.microphone = null;
        this.mediaStream = null;
        this.dataArray = null;
        this.bufferLength = 512;
        this.isRunning = false;
        this.frequencyData = null;
        this.timeDomainData = null;
    }

    connectAudioElement(audioElement) {
        try {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            this.microphone = this.audioContext.createMediaElementAudioSource(audioElement);
            this.setupAnalyser(true); // Connect to destination for file playback
            this.isRunning = true;
            return true;
        } catch (error) {
            console.error('Error connecting audio element:', error);
            return false;
        }
    }

    async captureSystemAudio() {
        try {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }

            // Resume audio context if suspended (required for some browsers)
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            console.log('Requesting screen capture with audio...');
            
            // Request screen capture with audio
            // Try different audio constraint configurations for compatibility
            let stream = null;
            try {
                // First try: explicit audio constraints
                stream = await navigator.mediaDevices.getDisplayMedia({
                    audio: {
                        echoCancellation: false,
                        noiseSuppression: false,
                        autoGainControl: false
                    },
                    video: { width: 1 } // Minimal video to get audio
                });
            } catch (e) {
                console.log('First attempt failed, trying simple audio: true');
                // Fallback: simple audio request
                stream = await navigator.mediaDevices.getDisplayMedia({
                    audio: true,
                    video: { width: 1 }
                });
            }

            console.log('Stream obtained:', stream);
            
            // Check if stream has audio tracks
            const audioTracks = stream.getAudioTracks();
            const videoTracks = stream.getVideoTracks();
            console.log('Audio tracks found:', audioTracks.length);
            console.log('Video tracks found:', videoTracks.length);
            
            if (audioTracks.length === 0) {
                // Stop any video tracks we don't need
                videoTracks.forEach(track => track.stop());
                throw new Error('No audio stream captured. Please make sure you enabled "Share system audio" in the screen capture dialog before clicking Share.');
            }

            // Stop video tracks since we only need audio
            videoTracks.forEach(track => track.stop());

            // Create media stream source from system audio
            this.mediaStream = stream;
            this.microphone = this.audioContext.createMediaStreamSource(stream);
            this.setupAnalyser(false); // Don't connect to destination - system audio already playing
            this.isRunning = true;
            
            console.log('System audio capture started successfully');
            
            // Handle when user stops sharing
            audioTracks[0].onended = () => {
                console.log('Audio stream ended');
                this.stop();
            };

            return true;
        } catch (error) {
            console.error('Error capturing system audio:', error);
            throw error; // Throw to be caught by app.js
        }
    }

    loadAudioFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                this.audioContext.decodeAudioData(e.target.result, (buffer) => {
                    const source = this.audioContext.createBufferSource();
                    source.buffer = buffer;
                    source.connect(this.analyser);
                    source.connect(this.audioContext.destination);
                    source.start(0);
                    this.isRunning = true;
                    resolve(true);
                }, reject);
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    setupAnalyser(connectToDestination = true) {
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = this.bufferLength * 2;
        this.microphone.connect(this.analyser);
        
        // Only connect to destination for file playback, not for system audio
        if (connectToDestination) {
            this.analyser.connect(this.audioContext.destination);
        }

        const bufferLength = this.analyser.frequencyBinCount;
        this.frequencyData = new Uint8Array(bufferLength);
        this.timeDomainData = new Uint8Array(this.analyser.fftSize);
    }

    getFrequencyData() {
        if (!this.analyser) return null;
        this.analyser.getByteFrequencyData(this.frequencyData);
        return this.frequencyData;
    }

    getTimeDomainData() {
        if (!this.analyser) return null;
        this.analyser.getByteTimeDomainData(this.timeDomainData);
        return this.timeDomainData;
    }

    getAverageFrequency() {
        if (!this.frequencyData) return 0;
        const average = this.frequencyData.reduce((a, b) => a + b) / this.frequencyData.length;
        return average;
    }

    getBassFrequency() {
        if (!this.frequencyData) return 0;
        const bassRange = this.frequencyData.slice(0, Math.floor(this.frequencyData.length * 0.1));
        return bassRange.reduce((a, b) => a + b) / bassRange.length;
    }

    getMidFrequency() {
        if (!this.frequencyData) return 0;
        const midStart = Math.floor(this.frequencyData.length * 0.1);
        const midEnd = Math.floor(this.frequencyData.length * 0.5);
        const midRange = this.frequencyData.slice(midStart, midEnd);
        return midRange.reduce((a, b) => a + b) / midRange.length;
    }

    getTrebleFrequency() {
        if (!this.frequencyData) return 0;
        const trebleStart = Math.floor(this.frequencyData.length * 0.5);
        const trebleRange = this.frequencyData.slice(trebleStart);
        return trebleRange.reduce((a, b) => a + b) / trebleRange.length;
    }

    stop() {
        if (this.microphone) {
            this.microphone.disconnect();
        }
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }
        if (this.analyser) {
            this.analyser.disconnect();
        }
        this.isRunning = false;
    }
}

// Export for use in other modules
window.AudioAnalyzer = AudioAnalyzer;
