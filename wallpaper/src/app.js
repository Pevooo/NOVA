// Main Application — auto-detects Lively audio, falls back to screen capture
class AudioVisualizationApp {
    constructor() {
        this.audioAnalyzer = new AudioAnalyzer();
        this.beatDetector  = new BeatDetector();
        this.visualizationEngine = null;

        this.canvas = document.getElementById('canvas2d');
        this.webgl  = document.getElementById('canvasWebGL');

        this.lastFrameTime = performance.now();
        this.fps = 60;

        this._setupCanvas();
        this._startLoop();
        this._autoDetectAudio();
    }

    _setupCanvas() {
        const resize = () => {
            this.canvas.width  = window.innerWidth;
            this.canvas.height = window.innerHeight;
            this.webgl.width   = this.canvas.width;
            this.webgl.height  = this.canvas.height;
        };
        resize();
        window.addEventListener('resize', resize);
        this.visualizationEngine = new VisualizationEngine(this.canvas, this.webgl);
    }

    // Wait briefly for Lively audio; if none, fall back to screen capture
    _autoDetectAudio() {
        setTimeout(() => {
            if (this.audioAnalyzer.hasLivelyAudio()) {
                this.audioAnalyzer.enableLively();
                return;
            }
            // No Lively — try screen capture automatically
            this._tryCapture();
        }, 2000);
    }

    async _tryCapture() {
        try {
            await this.audioAnalyzer.captureSystemAudio();
            this._hidePrompt();
        } catch (e) {
            // Browser likely needs a user gesture — show a minimal prompt
            this._showPrompt();
        }
    }

    _showPrompt() {
        if (document.getElementById('audioPrompt')) return;
        const el = document.createElement('div');
        el.id = 'audioPrompt';
        el.style.cssText = 'position:fixed;inset:0;z-index:999;display:flex;align-items:center;justify-content:center;background:rgba(3,0,20,0.85);cursor:pointer;';
        el.innerHTML = '<div style="text-align:center;color:#e2e8f0;font-family:Inter,sans-serif;">'
            + '<div style="font-size:48px;margin-bottom:16px;">&#9673;</div>'
            + '<div style="font-size:16px;font-weight:600;margin-bottom:8px;">Click to enable audio</div>'
            + '<div style="font-size:12px;color:#94a3b8;">Enable "Share system audio" in the dialog</div>'
            + '</div>';
        el.addEventListener('click', () => this._onPromptClick(), { once: true });
        document.body.appendChild(el);
    }

    _hidePrompt() {
        const el = document.getElementById('audioPrompt');
        if (el) el.remove();
    }

    async _onPromptClick() {
        try {
            await this.audioAnalyzer.captureSystemAudio();
        } catch (e) {
            // User cancelled or no audio — just keep the idle visualization
        }
        this._hidePrompt();
    }

    _startLoop() {
        const loop = (now) => {
            const delta = now - this.lastFrameTime;
            this.lastFrameTime = now;
            this.fps += (1000 / delta - this.fps) * 0.1;

            this.audioAnalyzer.poll();

            const freq = this.audioAnalyzer.getFrequencyData();
            const time = this.audioAnalyzer.getTimeDomainData();

            let beat = false;
            if (freq) {
                beat = this.beatDetector.detectBeat(freq);
                const bands  = this.beatDetector.getFrequencyBands(freq);
                const energy = this.beatDetector.detectEnergy(freq);
                this.beatDetector.detectBass(freq);
                this.visualizationEngine.render(freq, time, beat, energy, bands);
            } else {
                const silence     = new Uint8Array(512);
                const silenceTime = new Uint8Array(512).fill(128);
                const bands = { bass: 0, mid: 0, treble: 0 };
                this.visualizationEngine.render(silence, silenceTime, false, 0.01, bands);
            }

            // Tick lyrics in the same frame — no second rAF loop
            if (this._lyricsHandler) {
                this._lyricsHandler.tick();
                if (beat) this._lyricsHandler.beatPulse();
            }

            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new AudioVisualizationApp();

    // Lyrics handler — attach to app so the main loop ticks it
    const lyricsHandler = window.createLyricsHandler
        ? window.createLyricsHandler('#lyrics-container')
        : null;
    window.app._lyricsHandler = lyricsHandler;

    // Now-playing integration: create handler and expose as global for Lively
    if (window.createNowPlayingHandler) {
        const nowPlayingHandler = window.createNowPlayingHandler({
            trackContainer: '#track-container',
            albumArt: '#albumart',
            title: '#track-title',
            artist: '#track-artist',
            defaultBackground: ''
        });
        // Lively calls `livelyCurrentTrack` on track change, seek, and resume
        window.livelyCurrentTrack = function (data) {
            nowPlayingHandler(data);
            if (lyricsHandler) {
                const obj = typeof data === 'string' ? JSON.parse(data) : data;
                lyricsHandler.update(obj ? (obj.Title || '') : '', obj ? (obj.Artist || '') : '');
            }
        };
    }
});

// ── Lively Wallpaper property listener ──────────────────
const _modes  = ['combined', 'particles', 'waveform', 'spectrum', '3d', 'tunnel', 'kaleidoscope', 'galaxy'];
const _themes = ['neon', 'ocean', 'fire', 'aurora', 'mono', 'candy', 'cosmic', 'matrix', 'sunset'];
const _lyricsModes = ['center', 'side', 'off'];

function livelyPropertyListener(name, val) {
    const app = window.app;
    if (!app) return;

    switch (name) {
        case 'visualMode':
            app.visualizationEngine.setVisualizationMode(_modes[parseInt(val)] || 'combined');
            break;
        case 'colorTheme':
            app.visualizationEngine.setColorTheme(_themes[parseInt(val)] || 'neon');
            break;
        case 'sensitivity':
            app.beatDetector.setSensitivity(parseFloat(val));
            break;
        case 'particleCount':
            app.visualizationEngine.setParticleCount(parseInt(val));
            break;
        case 'lyricsMode':
            if (app._lyricsHandler) {
                app._lyricsHandler.setMode(_lyricsModes[parseInt(val)] || 'center');
            }
            break;
    }
}
