// Main Application — Orchestrates audio, visuals, and UI
class AudioVisualizationApp {
    constructor() {
        this.audioAnalyzer = new AudioAnalyzer();
        this.beatDetector  = new BeatDetector();
        this.visualizationEngine = null;

        this.canvas   = document.getElementById('canvas2d');
        this.webgl    = document.getElementById('canvasWebGL');
        this.isRunning = false;
        this.uiVisible = true;

        // FPS
        this.lastFrameTime = performance.now();
        this.fps = 60;

        this._setupCanvas();
        this._bindUI();
        this._bindKeyboard();
        this._startLoop();
    }

    /* ── Canvas ───────────────────────────────────── */
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

    /* ── UI bindings ──────────────────────────────── */
    _bindUI() {
        const $ = id => document.getElementById(id);

        $('systemAudioBtn').addEventListener('click', () => this.startSystemAudio());
        $('fileBtn').addEventListener('click', () => $('audioFile').click());
        $('stopBtn').addEventListener('click', () => this.stop());

        $('audioFile').addEventListener('change', e => {
            if (e.target.files.length) this.startAudioFile(e.target.files[0]);
        });

        $('sensitivity').addEventListener('input', e => {
            this.beatDetector.setSensitivity(parseFloat(e.target.value));
        });

        $('particleCount').addEventListener('input', e => {
            this.visualizationEngine.setParticleCount(parseInt(e.target.value));
        });

        $('visualMode').addEventListener('change', e => {
            this.visualizationEngine.setVisualizationMode(e.target.value);
        });

        $('colorTheme').addEventListener('change', e => {
            this.visualizationEngine.setColorTheme(e.target.value);
        });

        $('fullscreenBtn').addEventListener('click', () => this._toggleFullscreen());
    }

    /* ── Keyboard shortcuts ───────────────────────── */
    _bindKeyboard() {
        const modes = ['combined', 'particles', 'waveform', 'spectrum', '3d', 'tunnel', 'kaleidoscope', 'galaxy'];
        window.addEventListener('keydown', e => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
            switch (e.key.toLowerCase()) {
                case 'h':
                    this.uiVisible = !this.uiVisible;
                    document.body.classList.toggle('ui-hidden', !this.uiVisible);
                    break;
                case 'f':
                    this._toggleFullscreen();
                    break;
                case '1': case '2': case '3': case '4': case '5': case '6': case '7': case '8': {
                    const idx = parseInt(e.key) - 1;
                    if (idx < modes.length) {
                        this.visualizationEngine.setVisualizationMode(modes[idx]);
                        document.getElementById('visualMode').value = modes[idx];
                    }
                    break;
                }
            }
        });

        // Mouse tracking for particle interaction
        window.addEventListener('mousemove', e => {
            const nx = e.clientX / window.innerWidth;
            const ny = e.clientY / window.innerHeight;
            this.visualizationEngine.setMousePosition(nx, ny);
            this.visualizationEngine.particleSystem.setMousePosition(nx, ny);
        });
    }

    _toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
        } else {
            document.exitFullscreen().catch(() => {});
        }
    }

    /* ── Audio sources ────────────────────────────── */
    async startSystemAudio() {
        try {
            const ok = await this.audioAnalyzer.captureSystemAudio();
            if (ok) this._onAudioStarted();
        } catch (err) {
            console.error(err);
            let msg = '';
            if (err.name === 'NotAllowedError') {
                msg = 'Capture cancelled.\n\nTip: click "Capture System Audio" again and make sure "Share system audio" is toggled ON.';
            } else if (err.message.includes('No audio')) {
                msg = err.message + '\n\nMake sure "Share system audio" is enabled in the dialog.';
            } else {
                msg = 'System audio capture failed.\nTry Chrome, or upload a file instead.';
            }
            alert(msg);
        }
    }

    async startAudioFile(file) {
        try {
            const player = document.getElementById('audioPlayer');
            player.src = URL.createObjectURL(file);
            if (this.audioAnalyzer.connectAudioElement(player)) {
                player.play();
                this._onAudioStarted();
            }
        } catch (err) {
            console.error(err);
            alert('Error loading audio file.');
        }
    }

    _onAudioStarted() {
        this.isRunning = true;
        // Transition from splash to visualizer
        document.getElementById('splash').classList.add('fade-out');
        document.getElementById('statsPanel').classList.remove('hidden');
        document.getElementById('controlBar').classList.remove('hidden');
        document.getElementById('stopBtn').disabled = false;
    }

    stop() {
        document.getElementById('audioPlayer').pause();
        this.audioAnalyzer.stop();
        this.isRunning = false;
        document.getElementById('stopBtn').disabled = true;
        // Show splash again
        document.getElementById('splash').classList.remove('fade-out');
        document.getElementById('statsPanel').classList.add('hidden');
        document.getElementById('controlBar').classList.add('hidden');
    }

    /* ── Render loop ──────────────────────────────── */
    _startLoop() {
        const loop = (now) => {
            // FPS
            const delta = now - this.lastFrameTime;
            this.lastFrameTime = now;
            this.fps += (1000 / delta - this.fps) * 0.1;

            if (this.isRunning && this.audioAnalyzer.isRunning) {
                const freq = this.audioAnalyzer.getFrequencyData();
                const time = this.audioAnalyzer.getTimeDomainData();

                if (freq) {
                    const beat   = this.beatDetector.detectBeat(freq);
                    const bands  = this.beatDetector.getFrequencyBands(freq);
                    const energy = this.beatDetector.detectEnergy(freq);
                    this.beatDetector.detectBass(freq);

                    this.visualizationEngine.render(freq, time, beat, energy, bands);
                    this._updateStats(energy, beat, bands);
                }
            } else {
                // Idle subtle animation
                const ctx = this.canvas.getContext('2d');
                ctx.fillStyle = 'rgba(3, 0, 20, 0.05)';
                ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            }

            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    _updateStats(energy, beat, bands) {
        // BPM
        const bpm = this.beatDetector.getBpm();
        document.getElementById('bpmValue').textContent = bpm > 0 ? bpm : '—';

        // Energy bar
        document.getElementById('energyBar').style.width = `${energy * 100}%`;

        // Band bars
        document.getElementById('bassBar').style.width   = `${bands.bass * 100}%`;
        document.getElementById('midBar').style.width     = `${bands.mid * 100}%`;
        document.getElementById('trebleBar').style.width  = `${bands.treble * 100}%`;

        // Beat dot
        const dot = document.getElementById('beatDot');
        if (beat) {
            dot.classList.add('active');
            clearTimeout(this._beatTimeout);
            this._beatTimeout = setTimeout(() => dot.classList.remove('active'), 120);
        }

        // FPS + particles
        document.getElementById('fpsValue').textContent    = Math.round(this.fps);
        document.getElementById('particleValue').textContent = this.visualizationEngine.particleSystem.getParticleCount();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new AudioVisualizationApp();
});
