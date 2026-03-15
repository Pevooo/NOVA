// Waveform Renderer  Circular waveform, mirrored spectrum, audio reactive
class WaveformRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.smoothFreq = new Float32Array(256);
        this.beatPulse = 0;
        this.prevWaveform = new Float32Array(180);
    }

    render(frequencyData, timeDomainData, gradient, smoothEnergy, beatDetected) {
        var ctx = this.canvas.getContext('2d');
        var w = this.canvas.width;
        var h = this.canvas.height;

        // Beat pulse
        if (beatDetected) this.beatPulse = 1;
        this.beatPulse *= 0.88;

        // Smooth frequency for spectrum
        for (var i = 0; i < Math.min(frequencyData.length, 256); i++) {
            this.smoothFreq[i] += (frequencyData[i] - this.smoothFreq[i]) * 0.25;
        }

        this._drawCircularWaveform(ctx, w, h, timeDomainData, gradient, smoothEnergy);
        this._drawMirroredSpectrum(ctx, w, h, gradient, smoothEnergy);

        // Outer ring glow on beat
        if (this.beatPulse > 0.1) {
            var cx = w / 2, cy = h / 2;
            var ringR = 80 + smoothEnergy * 60 + this.beatPulse * 40;
            var color = gradient.getAccent(performance.now() / 1000);
            ctx.save();
            ctx.strokeStyle = 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',' + (this.beatPulse * 0.3) + ')';
            ctx.lineWidth = 2 + this.beatPulse * 5;
            ctx.shadowColor = gradient.rgbToString(color);
            ctx.shadowBlur = 20 + this.beatPulse * 30;
            ctx.beginPath();
            ctx.arc(cx, cy, ringR + 30, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    }

    _drawCircularWaveform(ctx, w, h, timeDomainData, gradient, se) {
        if (!timeDomainData) return;
        var cx = w / 2;
        var cy = h / 2;
        var points = 180;
        var baseR = 80 + se * 60 + this.beatPulse * 15;
        var t = performance.now() / 1000;

        // Main waveform
        ctx.beginPath();
        for (var i = 0; i <= points; i++) {
            var angle = (i / points) * Math.PI * 2;
            var dataIdx = Math.floor((i / points) * timeDomainData.length);
            var val = (timeDomainData[dataIdx] - 128) / 128;

            // Smooth with previous frame
            this.prevWaveform[i % 180] += (val - this.prevWaveform[i % 180]) * 0.4;
            val = this.prevWaveform[i % 180];

            var r = baseR + val * (40 + se * 80);
            var x = cx + Math.cos(angle) * r;
            var y = cy + Math.sin(angle) * r;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                var prevAngle = ((i - 1) / points) * Math.PI * 2;
                var prevR = baseR + this.prevWaveform[(i - 1) % 180] * (40 + se * 80);
                var cpx = cx + Math.cos((angle + prevAngle) / 2) * ((r + prevR) / 2);
                var cpy = cy + Math.sin((angle + prevAngle) / 2) * ((r + prevR) / 2);
                ctx.quadraticCurveTo(cpx, cpy, x, y);
            }
        }
        ctx.closePath();

        var color = gradient.getAccent(t);
        ctx.strokeStyle = gradient.rgbToString({ r: color.r, g: color.g, b: color.b, a: 0.85 });
        ctx.lineWidth = 2.5 + se * 2 + this.beatPulse * 2;
        ctx.shadowColor = gradient.rgbToString(color);
        ctx.shadowBlur = 10 + se * 20;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Inner fill (subtle)
        var innerGrad = ctx.createRadialGradient(cx, cy, baseR * 0.3, cx, cy, baseR);
        innerGrad.addColorStop(0, 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',' + (0.03 + se * 0.04) + ')');
        innerGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = innerGrad;
        ctx.fill();

        // Second stroke ring (offset hue)
        var color2 = gradient.getAccent(t + 0.5);
        ctx.strokeStyle = gradient.rgbToString({ r: color2.r, g: color2.g, b: color2.b, a: 0.35 });
        ctx.lineWidth = 1.5 + se;
        ctx.beginPath();
        for (var i = 0; i <= points; i++) {
            var angle = (i / points) * Math.PI * 2;
            var val = this.prevWaveform[i % 180];
            var r = baseR + 8 + val * (35 + se * 60);
            var x = cx + Math.cos(angle) * r;
            var y = cy + Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
    }

    _drawMirroredSpectrum(ctx, w, h, gradient, se) {
        var barCount = 96;
        var totalW = w * 0.7;
        var barW = totalW / barCount - 1;
        var startX = (w - totalW) / 2;
        var baseY = h;
        var maxH = h * 0.25 + se * h * 0.1;

        for (var i = 0; i < barCount; i++) {
            var val = this.smoothFreq[Math.floor(i * 256 / barCount)] / 255;
            var barH = val * maxH;
            var x = startX + i * (barW + 1);
            var color = gradient.getFromSpectrum(i / barCount, val);

            // Upward bar
            ctx.fillStyle = gradient.rgbToString({ r: color.r, g: color.g, b: color.b, a: 0.7 + val * 0.3 });
            ctx.fillRect(x, baseY - barH, barW, barH);

            // Glow on loud bars
            if (val > 0.5) {
                ctx.shadowColor = gradient.rgbToString(color);
                ctx.shadowBlur = val * 15;
                ctx.fillRect(x, baseY - barH, barW, barH);
                ctx.shadowBlur = 0;
            }

            // Downward mirror
            ctx.fillStyle = gradient.rgbToString({ r: color.r, g: color.g, b: color.b, a: 0.15 + val * 0.1 });
            ctx.fillRect(x, baseY, barW, barH * 0.5);
        }
    }
}

window.WaveformRenderer = WaveformRenderer;
