// Beat Detector — Variance-based detection with BPM estimation
class BeatDetector {
    constructor() {
        this.history = [];
        this.sensitivity = 1.2;
        this.cooldown = 0;
        this.isBeat = false;

        // Bass
        this.bassPeaks = [];
        this.lastBassValue = 0;

        // BPM
        this.beatTimestamps = [];
        this.bpm = 0;
        this.smoothBpm = 0;
    }

    detectBeat(frequencyData) {
        if (!frequencyData || frequencyData.length === 0) return false;

        const avg = frequencyData.reduce((a, b) => a + b, 0) / frequencyData.length;
        this.history.push(avg);
        if (this.history.length > 50) this.history.shift();

        const mean = this.history.reduce((a, b) => a + b, 0) / this.history.length;
        const variance = this.history.reduce((s, n) => s + (n - mean) ** 2, 0) / this.history.length;
        const std = Math.sqrt(variance);

        const threshold = mean + std * this.sensitivity;
        this.isBeat = avg > threshold && this.cooldown <= 0;

        if (this.isBeat) {
            this.cooldown = 12; // ~200 ms at 60 fps
            this._recordBeatTimestamp();
        } else {
            this.cooldown--;
        }

        return this.isBeat;
    }

    detectBass(frequencyData) {
        if (!frequencyData || frequencyData.length === 0) return 0;
        const end = Math.floor(frequencyData.length * 0.1);
        const bass = frequencyData.slice(0, end);
        const avg = bass.reduce((a, b) => a + b, 0) / bass.length;

        this.bassPeaks.push(avg);
        if (this.bassPeaks.length > 100) this.bassPeaks.shift();

        const mean = this.bassPeaks.reduce((a, b) => a + b, 0) / this.bassPeaks.length;
        this.lastBassValue = avg;
        return avg > mean * 1.3 ? 1 : avg / 255;
    }

    detectEnergy(frequencyData) {
        if (!frequencyData || frequencyData.length === 0) return 0;
        const sum = frequencyData.reduce((a, b) => a + b, 0);
        return Math.min(sum / (frequencyData.length * 255), 1);
    }

    getFrequencyBands(frequencyData) {
        if (!frequencyData || frequencyData.length === 0) return { bass: 0, mid: 0, treble: 0 };
        const len = frequencyData.length;
        const bassSlice = frequencyData.slice(0, Math.floor(len * 0.1));
        const midSlice  = frequencyData.slice(Math.floor(len * 0.1), Math.floor(len * 0.6));
        const trebSlice = frequencyData.slice(Math.floor(len * 0.6));

        return {
            bass:   bassSlice.reduce((a, b) => a + b, 0)  / (bassSlice.length * 255),
            mid:    midSlice.reduce((a, b) => a + b, 0)   / (midSlice.length * 255),
            treble: trebSlice.reduce((a, b) => a + b, 0)  / (trebSlice.length * 255)
        };
    }

    /* ── BPM ──────────────────────────────────────── */
    _recordBeatTimestamp() {
        const now = performance.now();
        this.beatTimestamps.push(now);
        // keep last 20 beats
        if (this.beatTimestamps.length > 20) this.beatTimestamps.shift();
        this._estimateBpm();
    }

    _estimateBpm() {
        if (this.beatTimestamps.length < 4) return;
        const intervals = [];
        for (let i = 1; i < this.beatTimestamps.length; i++) {
            intervals.push(this.beatTimestamps[i] - this.beatTimestamps[i - 1]);
        }
        // Median interval for robustness
        intervals.sort((a, b) => a - b);
        const median = intervals[Math.floor(intervals.length / 2)];
        if (median > 0) {
            const raw = 60000 / median;
            // Clamp to reasonable range
            if (raw >= 40 && raw <= 220) {
                this.bpm = Math.round(raw);
                this.smoothBpm += (this.bpm - this.smoothBpm) * 0.15;
            }
        }
    }

    getBpm() {
        return Math.round(this.smoothBpm) || 0;
    }

    setSensitivity(value) {
        this.sensitivity = Math.max(0.1, Math.min(5, value));
    }
}

window.BeatDetector = BeatDetector;
