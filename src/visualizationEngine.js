// Visualization Engine  Next-level rendering pipeline
// Starfield, lightning, chromatic aberration, screen shake, nebula, radial spectrum, galaxy mode
class VisualizationEngine {
    constructor(canvas2d, canvasWebGL) {
        this.canvas = canvas2d;
        this.ctx = canvas2d.getContext('2d');

        this.waveformRenderer = new WaveformRenderer(canvas2d);
        this.threeDRenderer = new ThreeDRenderer(canvasWebGL);
        this.particleSystem = new ParticleSystem(2000);
        this.colorGradient = new ColorGradient();
        this.starfield = new Starfield(800);
        this.lightning = new Lightning();

        this.visualMode = 'combined';
        this.time = 0;
        this.frame = 0;
        this.smoothEnergy = 0;
        this.smoothBass = 0;
        this.smoothMid = 0;
        this.smoothTreble = 0;

        // Screen shake
        this.shakeX = 0;
        this.shakeY = 0;
        this.shakeIntensity = 0;

        // Chromatic aberration
        this.chromaOffset = 0;
        this.smoothChroma = 0;

        // Tunnel rings buffer
        this.tunnelRings = [];

        // Kaleidoscope offscreen
        this.kCanvas = document.createElement('canvas');
        this.kCtx = this.kCanvas.getContext('2d');

        // Galaxy mode
        this.galaxyParticles = [];
        this._initGalaxy();

        // Nebula (precomputed noise texture)
        this.nebulaCanvas = document.createElement('canvas');
        this.nebulaCtx = this.nebulaCanvas.getContext('2d');

        // Anamorphic flare
        this.flareIntensity = 0;

        // Mouse
        this.mouseX = 0.5;
        this.mouseY = 0.5;

        // Beat history
        this.beatCount = 0;
        this.lastBeatTime = 0;

        // Smoothed frequency snapshot for radial spectrum
        this.smoothFreq = new Float32Array(256);

        this._initNebula();
    }

    /* public API */
    setVisualizationMode(mode) { this.visualMode = mode; }
    setParticleCount(n) { this.particleSystem.setMaxParticles(n); }
    setColorTheme(theme) { this.colorGradient.setTheme(theme); }
    setMousePosition(nx, ny) {
        this.mouseX = nx;
        this.mouseY = ny;
        this.starfield.setMousePosition(nx, ny);
    }

    /* Galaxy init */
    _initGalaxy() {
        const armCount = 4;
        const particlesPerArm = 200;
        for (let arm = 0; arm < armCount; arm++) {
            const baseAngle = (arm / armCount) * Math.PI * 2;
            for (let i = 0; i < particlesPerArm; i++) {
                const dist = (i / particlesPerArm) * 0.9 + 0.05;
                const spiral = dist * 3 + baseAngle;
                const scatter = (Math.random() - 0.5) * 0.15 * (1 + dist);
                this.galaxyParticles.push({
                    angle: spiral + scatter,
                    dist: dist + (Math.random() - 0.5) * 0.05,
                    size: Math.random() * 2 + 0.5,
                    hueOffset: Math.random() * 40 - 20,
                    brightness: Math.random() * 0.5 + 0.5,
                    twinkle: Math.random() * Math.PI * 2
                });
            }
        }
    }

    /* Nebula init */
    _initNebula() {
        this.nebulaCanvas.width = 256;
        this.nebulaCanvas.height = 256;
    }

    _renderNebulaTexture(hue1, hue2, phase) {
        const nc = this.nebulaCtx;
        const w = 256, h = 256;
        nc.clearRect(0, 0, w, h);
        for (let i = 0; i < 5; i++) {
            const cx = w * (0.3 + Math.sin(phase + i * 1.7) * 0.3);
            const cy = h * (0.3 + Math.cos(phase + i * 2.1) * 0.3);
            const r = 60 + Math.sin(phase * 0.5 + i) * 30 + 40;
            const hue = hue1 + (hue2 - hue1) * (i / 5);
            const grad = nc.createRadialGradient(cx, cy, 0, cx, cy, r);
            grad.addColorStop(0, 'hsla(' + hue + ', 80%, 50%, 0.15)');
            grad.addColorStop(0.5, 'hsla(' + (hue + 20) + ', 60%, 40%, 0.06)');
            grad.addColorStop(1, 'transparent');
            nc.fillStyle = grad;
            nc.fillRect(0, 0, w, h);
        }
    }

    /* main render loop */
    render(frequencyData, timeDomainData, beatDetected, energy, bands) {
        this.frame++;
        this.time += 0.016;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const ctx = this.ctx;
        const g = this.colorGradient;
        g.animationTime = this.time;

        // Smooth values
        this.smoothEnergy += (energy - this.smoothEnergy) * 0.15;
        this.smoothBass   += (bands.bass - this.smoothBass) * 0.18;
        this.smoothMid    += (bands.mid - this.smoothMid) * 0.14;
        this.smoothTreble += (bands.treble - this.smoothTreble) * 0.14;
        const se = this.smoothEnergy;
        const sb = this.smoothBass;

        // Smooth frequency data
        for (let i = 0; i < Math.min(frequencyData.length, 256); i++) {
            this.smoothFreq[i] += (frequencyData[i] - this.smoothFreq[i]) * 0.25;
        }

        // Beat tracking
        if (beatDetected) {
            this.beatCount++;
            this.lastBeatTime = this.time;
        }

        // Screen shake
        if (beatDetected && sb > 0.3) {
            this.shakeIntensity = Math.min(12, sb * 20);
        }
        this.shakeIntensity *= 0.85;
        this.shakeX = (Math.random() - 0.5) * this.shakeIntensity;
        this.shakeY = (Math.random() - 0.5) * this.shakeIntensity;

        // Chromatic aberration
        if (beatDetected) {
            this.chromaOffset = Math.min(8, sb * 12 + energy * 4);
        }
        this.smoothChroma += (this.chromaOffset - this.smoothChroma) * 0.2;
        this.chromaOffset *= 0.9;

        // Background fade
        ctx.globalCompositeOperation = 'source-over';
        const fadeAlpha = this.visualMode === 'tunnel' ? 0.14
            : this.visualMode === 'galaxy' ? 0.04
            : 0.06 + se * 0.02;
        ctx.fillStyle = 'rgba(3, 0, 20, ' + fadeAlpha + ')';
        ctx.fillRect(0, 0, w, h);

        // Apply screen shake
        ctx.save();
        if (this.shakeIntensity > 0.5) {
            ctx.translate(this.shakeX, this.shakeY);
        }

        // Starfield (always behind everything)
        this.starfield.update(se, beatDetected, sb);
        this.starfield.render(ctx, w, h, this.time, se, beatDetected);

        // Nebula background (subtle)
        if (this.frame % 4 === 0) {
            const accent = g.getAccent(this.time);
            const accent2 = g.getAccent(this.time + 0.5);
            const hue1 = this._rgbToHue(accent);
            const hue2 = this._rgbToHue(accent2);
            this._renderNebulaTexture(hue1, hue2, this.time * 0.3);
        }
        ctx.globalAlpha = 0.08 + se * 0.06;
        ctx.globalCompositeOperation = 'screen';
        ctx.drawImage(this.nebulaCanvas, 0, 0, w, h);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;

        // Beat flash
        if (beatDetected) {
            const flashColor = g.getAccent(this.time);
            ctx.fillStyle = 'rgba(' + flashColor.r + ', ' + flashColor.g + ', ' + flashColor.b + ', 0.08)';
            ctx.fillRect(0, 0, w, h);

            // Trigger lightning on strong beats
            if (sb > 0.35) {
                const lx = w / 2 + (Math.random() - 0.5) * w * 0.3;
                const ly = h / 2 + (Math.random() - 0.5) * h * 0.3;
                this.lightning.trigger(lx, ly, se, g.getAccent(this.time + Math.random()));
            }
        }

        // Update systems
        this.particleSystem.update(frequencyData, beatDetected, energy);
        this.lightning.update();

        // Anamorphic flare
        if (beatDetected) this.flareIntensity = se;
        this.flareIntensity *= 0.92;

        // Dispatch mode
        switch (this.visualMode) {
            case 'combined':
                this._renderCombined(frequencyData, timeDomainData, g, se, sb, beatDetected, bands);
                break;
            case 'particles':
                this.particleSystem.render(ctx);
                break;
            case 'waveform':
                this.waveformRenderer.render(frequencyData, timeDomainData, g, se, beatDetected);
                break;
            case 'spectrum':
                this._renderRadialSpectrum(frequencyData, g, se, beatDetected);
                break;
            case '3d':
                this.threeDRenderer.render(ctx, se, beatDetected, g);
                break;
            case 'tunnel':
                this._renderTunnel(frequencyData, g, se, sb, beatDetected);
                break;
            case 'kaleidoscope':
                this._renderKaleidoscope(frequencyData, timeDomainData, g, se, sb, beatDetected, bands);
                break;
            case 'galaxy':
                this._renderGalaxy(frequencyData, g, se, sb, beatDetected, bands);
                break;
        }

        // Lightning always on top
        this.lightning.render(ctx);

        // Anamorphic horizontal flare
        if (this.flareIntensity > 0.05) {
            this._drawAnamorphicFlare(g, this.flareIntensity);
        }

        // Restore shake transform
        ctx.restore();

        // Chromatic aberration post-fx
        if (this.smoothChroma > 0.3) {
            this._applyChromatic(this.smoothChroma);
        }

        // Global bloom layer
        this._applyBloom(se);
    }

    /* Combined mode */
    _renderCombined(freq, time, g, se, sb, beat, bands) {
        const ctx = this.ctx;
        this._drawAmbientRings(g, se, beat);

        ctx.globalAlpha = 0.45;
        this.threeDRenderer.render(ctx, se, beat, g);
        ctx.globalAlpha = 1;

        this.waveformRenderer.render(freq, time, g, se, beat);
        this.particleSystem.render(ctx);

        if (beat) this._drawShockwave(g, se);
        this._drawVignette(se);
    }

    /* Radial Spectrum (upgraded from flat bars) */
    _renderRadialSpectrum(freq, g, se, beat) {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const cx = w / 2;
        const cy = h / 2;
        const barCount = Math.min(freq.length, 180);
        const baseR = Math.min(w, h) * 0.12;
        const maxBarH = Math.min(w, h) * 0.35;

        // Outer glow ring
        const ringColor = g.getAccent(this.time);
        ctx.save();
        ctx.strokeStyle = 'rgba(' + ringColor.r + ',' + ringColor.g + ',' + ringColor.b + ',' + (0.1 + se * 0.15) + ')';
        ctx.lineWidth = 2 + se * 4;
        ctx.shadowColor = 'rgba(' + ringColor.r + ',' + ringColor.g + ',' + ringColor.b + ',0.5)';
        ctx.shadowBlur = 20 + se * 30;
        ctx.beginPath();
        ctx.arc(cx, cy, baseR + maxBarH * se * 0.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Draw radial bars
        for (let i = 0; i < barCount; i++) {
            const val = this.smoothFreq[i] / 255;
            const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2;
            const barH = val * maxBarH;
            const color = g.getFromSpectrum(i / barCount, val);

            const x1 = cx + Math.cos(angle) * baseR;
            const y1 = cy + Math.sin(angle) * baseR;
            const x2 = cx + Math.cos(angle) * (baseR + barH);
            const y2 = cy + Math.sin(angle) * (baseR + barH);

            const grad = ctx.createLinearGradient(x1, y1, x2, y2);
            grad.addColorStop(0, 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',0.3)');
            grad.addColorStop(1, 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',' + (0.6 + val * 0.4) + ')');

            ctx.strokeStyle = grad;
            ctx.lineWidth = Math.max(1.5, (Math.PI * 2 * baseR / barCount) * 0.7);
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();

            // Glow dot at tip
            if (val > 0.35) {
                ctx.fillStyle = 'rgba(' + Math.min(255, color.r + 60) + ',' + Math.min(255, color.g + 60) + ',' + Math.min(255, color.b + 60) + ',' + val + ')';
                ctx.beginPath();
                ctx.arc(x2, y2, 1.5 + val * 3, 0, Math.PI * 2);
                ctx.fill();
            }

            // Inner mirror
            if (val > 0.15) {
                const mirrorH = barH * 0.25;
                const mx2 = cx + Math.cos(angle) * (baseR - mirrorH);
                const my2 = cy + Math.sin(angle) * (baseR - mirrorH);
                ctx.strokeStyle = 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',' + (val * 0.2) + ')';
                ctx.lineWidth = Math.max(1, (Math.PI * 2 * baseR / barCount) * 0.5);
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(mx2, my2);
                ctx.stroke();
            }
        }

        // Center energy orb
        const orbR = baseR * 0.6 + se * 15;
        const orbColor = g.getAccent(this.time);
        const orbGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, orbR);
        orbGrad.addColorStop(0, 'rgba(' + orbColor.r + ',' + orbColor.g + ',' + orbColor.b + ',' + (0.4 + se * 0.3) + ')');
        orbGrad.addColorStop(0.5, 'rgba(' + orbColor.r + ',' + orbColor.g + ',' + orbColor.b + ',0.1)');
        orbGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = orbGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, orbR, 0, Math.PI * 2);
        ctx.fill();

        this.particleSystem.render(ctx);
    }

    /* Galaxy Mode */
    _renderGalaxy(freq, g, se, sb, beat, bands) {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const cx = w / 2;
        const cy = h / 2;
        const maxR = Math.min(w, h) * 0.42;
        const rotation = this.time * 0.15 + se * 0.3;

        // Core glow
        const coreColor = g.getAccent(this.time);
        const coreR = 30 + se * 50 + (beat ? 20 : 0);
        const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
        coreGrad.addColorStop(0, 'rgba(255,255,255,' + (0.6 + se * 0.3) + ')');
        coreGrad.addColorStop(0.2, 'rgba(' + coreColor.r + ',' + coreColor.g + ',' + coreColor.b + ',0.5)');
        coreGrad.addColorStop(0.6, 'rgba(' + coreColor.r + ',' + coreColor.g + ',' + coreColor.b + ',0.1)');
        coreGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
        ctx.fill();

        // Galaxy particles
        ctx.save();
        for (const p of this.galaxyParticles) {
            const angle = p.angle + rotation;
            const freqIdx = Math.floor((p.angle % (Math.PI * 2)) / (Math.PI * 2) * Math.min(freq.length, 128));
            const freqVal = (freq[Math.abs(freqIdx) % freq.length] || 0) / 255;
            const r = p.dist * maxR * (1 + freqVal * 0.3);
            const x = cx + Math.cos(angle) * r;
            const y = cy + Math.sin(angle) * r * 0.65;

            const twinkle = Math.sin(this.time * 2 + p.twinkle) * 0.3 + 0.7;
            const baseHue = this._rgbToHue(g.getAccent(this.time + p.dist));
            const hue = baseHue + p.hueOffset;
            const size = p.size * (1 + freqVal * 2) * twinkle;
            const alpha = p.brightness * twinkle * (0.4 + freqVal * 0.6);

            ctx.globalAlpha = alpha;
            ctx.fillStyle = 'hsl(' + hue + ',' + (60 + freqVal * 30) + '%,' + (55 + freqVal * 30) + '%)';
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();

            if (size > 2.5 && freqVal > 0.4) {
                ctx.shadowColor = 'hsl(' + hue + ',80%,60%)';
                ctx.shadowBlur = size * 4;
                ctx.beginPath();
                ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        }
        ctx.globalAlpha = 1;
        ctx.restore();

        // Dust lane arcs
        ctx.save();
        ctx.globalAlpha = 0.15 + se * 0.1;
        ctx.globalCompositeOperation = 'screen';
        for (let arm = 0; arm < 4; arm++) {
            const armAngle = (arm / 4) * Math.PI * 2 + rotation;
            const armColor = g.getFromSpectrum(arm / 4, se);
            ctx.strokeStyle = 'rgba(' + armColor.r + ',' + armColor.g + ',' + armColor.b + ',0.3)';
            ctx.lineWidth = 2 + se * 3;
            ctx.beginPath();
            for (let i = 0; i < 60; i++) {
                const t = i / 60;
                const spiralAngle = armAngle + t * 3;
                const r = t * maxR;
                const x = cx + Math.cos(spiralAngle) * r;
                const y = cy + Math.sin(spiralAngle) * r * 0.65;
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        ctx.restore();

        this.particleSystem.render(ctx);
    }

    /* Tunnel / Vortex */
    _renderTunnel(freq, g, se, sb, beat) {
        const ctx = this.ctx;
        const cx = this.canvas.width / 2;
        const cy = this.canvas.height / 2;
        const maxR = Math.hypot(cx, cy);

        if (this.frame % 2 === 0 || beat) {
            const avgFreq = freq.slice(0, 32).reduce((a, b) => a + b, 0) / 32 / 255;
            this.tunnelRings.push({
                radius: 10,
                color: g.getAccent(this.time + avgFreq),
                energy: avgFreq,
                segments: freq.slice(0, 64)
            });
        }

        for (let i = this.tunnelRings.length - 1; i >= 0; i--) {
            const ring = this.tunnelRings[i];
            ring.radius += 4 + se * 12 + (beat ? 8 : 0);
            const alpha = Math.max(0, 1 - ring.radius / maxR);

            if (alpha <= 0) {
                this.tunnelRings.splice(i, 1);
                continue;
            }

            const segCount = 64;
            ctx.lineWidth = 2 + ring.energy * 3;
            for (let s = 0; s < segCount; s++) {
                const freqVal = (ring.segments[s] || 128) / 255;
                const angleStart = (s / segCount) * Math.PI * 2;
                const angleEnd = ((s + 1) / segCount) * Math.PI * 2;
                const r = ring.radius + freqVal * 20;

                const segColor = g.getFromSpectrum(s / segCount, freqVal);
                ctx.strokeStyle = 'rgba(' + segColor.r + ',' + segColor.g + ',' + segColor.b + ',' + (alpha * 0.8) + ')';
                ctx.beginPath();
                ctx.arc(cx, cy, r, angleStart, angleEnd);
                ctx.stroke();
            }

            if (ring.energy > 0.4) {
                ctx.shadowColor = 'rgba(' + ring.color.r + ',' + ring.color.g + ',' + ring.color.b + ',1)';
                ctx.shadowBlur = ring.energy * 30;
                ctx.strokeStyle = 'rgba(' + ring.color.r + ',' + ring.color.g + ',' + ring.color.b + ',' + (alpha * 0.3) + ')';
                ctx.beginPath();
                ctx.arc(cx, cy, ring.radius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.shadowBlur = 0;
            }
        }
    }

    /* Kaleidoscope */
    _renderKaleidoscope(freq, time, g, se, sb, beat, bands) {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const cx = w / 2;
        const cy = h / 2;
        const segments = 8;
        const angleStep = (Math.PI * 2) / segments;

        const kSize = 300 + se * 100;
        this.kCanvas.width = kSize;
        this.kCanvas.height = kSize;
        const kc = this.kCtx;
        kc.clearRect(0, 0, kSize, kSize);

        const barCount = Math.min(freq.length, 48);
        for (let i = 0; i < barCount; i++) {
            const val = freq[i] / 255;
            const angle = (i / barCount) * angleStep;
            const len = val * kSize * 0.4;
            const color = g.getFromSpectrum(i / barCount, val);

            kc.strokeStyle = 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',0.9)';
            kc.lineWidth = 3 + val * 4;
            kc.beginPath();
            kc.moveTo(kSize / 2, kSize / 2);
            kc.lineTo(
                kSize / 2 + Math.cos(angle + this.time) * len,
                kSize / 2 + Math.sin(angle + this.time) * len
            );
            kc.stroke();

            if (val > 0.3) {
                kc.fillStyle = 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',' + val + ')';
                kc.beginPath();
                kc.arc(
                    kSize / 2 + Math.cos(angle + this.time) * len,
                    kSize / 2 + Math.sin(angle + this.time) * len,
                    2 + val * 5, 0, Math.PI * 2
                );
                kc.fill();
            }
        }

        ctx.save();
        ctx.translate(cx, cy);
        for (let s = 0; s < segments; s++) {
            ctx.save();
            ctx.rotate(s * angleStep);
            if (s % 2 === 1) ctx.scale(1, -1);
            ctx.globalAlpha = 0.85;
            ctx.drawImage(this.kCanvas, -kSize / 2, -kSize / 2);
            ctx.restore();
        }
        ctx.restore();

        this.particleSystem.render(ctx);
    }

    /* Helper effects */
    _drawAmbientRings(g, se, beat) {
        const ctx = this.ctx;
        const cx = this.canvas.width / 2;
        const cy = this.canvas.height / 2;
        const count = 3 + Math.floor(se * 4);
        for (let i = 0; i < count; i++) {
            const r = ((this.time * 60 + i * 80) % Math.max(this.canvas.width, this.canvas.height));
            const alpha = Math.max(0, 1 - r / Math.max(this.canvas.width, this.canvas.height)) * se * 0.35;
            if (alpha <= 0) continue;
            const color = g.getAccent(this.time + i * 0.2);
            ctx.strokeStyle = 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',' + alpha + ')';
            ctx.lineWidth = 1.5 + se;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    _drawShockwave(g, se) {
        const ctx = this.ctx;
        const cx = this.canvas.width / 2;
        const cy = this.canvas.height / 2;
        const color = g.getAccent(this.time);
        const r = 60 + se * 100;
        ctx.save();
        ctx.strokeStyle = 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',0.5)';
        ctx.lineWidth = 3 + se * 4;
        ctx.shadowColor = 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',1)';
        ctx.shadowBlur = 30 + se * 40;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    _drawAnamorphicFlare(g, intensity) {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const cy = h / 2;
        const color = g.getAccent(this.time);
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const flareH = 2 + intensity * 6;
        const grad = ctx.createLinearGradient(0, cy - flareH, 0, cy + flareH);
        grad.addColorStop(0, 'transparent');
        grad.addColorStop(0.4, 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',' + (intensity * 0.15) + ')');
        grad.addColorStop(0.5, 'rgba(' + Math.min(255, color.r + 80) + ',' + Math.min(255, color.g + 80) + ',' + Math.min(255, color.b + 80) + ',' + (intensity * 0.25) + ')');
        grad.addColorStop(0.6, 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',' + (intensity * 0.15) + ')');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(0, cy - flareH * 8, w, flareH * 16);
        ctx.globalCompositeOperation = 'source-over';
        ctx.restore();
    }

    _drawVignette(se) {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const grad = ctx.createRadialGradient(w / 2, h / 2, w * 0.25, w / 2, h / 2, w * 0.7);
        grad.addColorStop(0, 'transparent');
        grad.addColorStop(1, 'rgba(3, 0, 20, ' + (0.5 - se * 0.15) + ')');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
    }

    _applyBloom(se) {
        if (se < 0.3) return;
        const ctx = this.ctx;
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = se * 0.08;
        ctx.filter = 'blur(' + (8 + se * 12) + 'px)';
        ctx.drawImage(this.canvas, 0, 0);
        ctx.filter = 'none';
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        ctx.restore();
    }

    _applyChromatic(offset) {
        if (offset < 0.3) return;
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 0.06 + offset * 0.015;
        ctx.drawImage(this.canvas, offset, 0, w, h);
        ctx.drawImage(this.canvas, -offset, 0, w, h);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        ctx.restore();
    }

    _rgbToHue(c) {
        const r = c.r / 255, g = c.g / 255, b = c.b / 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        const d = max - min;
        if (d === 0) return 0;
        let h;
        if (max === r) h = ((g - b) / d) % 6;
        else if (max === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        h = Math.round(h * 60);
        return h < 0 ? h + 360 : h;
    }
}

window.VisualizationEngine = VisualizationEngine;
