// Starfield — Warp-speed star background that reacts to audio
class Starfield {
    constructor(count = 600) {
        this.stars = [];
        this.count = count;
        this.warpSpeed = 0;
        this.smoothWarp = 0;
        this.mouseX = 0.5;
        this.mouseY = 0.5;
        for (let i = 0; i < count; i++) {
            this.stars.push(this._createStar());
        }
    }

    _createStar() {
        return {
            x: (Math.random() - 0.5) * 2,
            y: (Math.random() - 0.5) * 2,
            z: Math.random() * 1.5 + 0.01,
            prevX: 0,
            prevY: 0,
            size: Math.random() * 1.5 + 0.5,
            hue: Math.random() * 60 + 200, // blue-white range
            twinklePhase: Math.random() * Math.PI * 2
        };
    }

    update(energy, beatDetected, bass) {
        // Warp speed: slow drift normally, fast on beats
        const targetWarp = beatDetected ? 0.08 + bass * 0.12 : 0.003 + energy * 0.015;
        this.smoothWarp += (targetWarp - this.smoothWarp) * 0.12;
        this.warpSpeed = this.smoothWarp;
    }

    render(ctx, w, h, time, energy, beatDetected) {
        const cx = w / 2 + (this.mouseX - 0.5) * 40;
        const cy = h / 2 + (this.mouseY - 0.5) * 40;
        const fov = Math.min(w, h) * 0.8;

        ctx.save();

        for (let i = 0; i < this.stars.length; i++) {
            const s = this.stars[i];

            // Store previous position for trails
            const prevSx = (s.x / s.z) * fov + cx;
            const prevSy = (s.y / s.z) * fov + cy;

            // Move star toward camera
            s.z -= this.warpSpeed;

            // Respawn
            if (s.z <= 0.001 || prevSx < -50 || prevSx > w + 50 || prevSy < -50 || prevSy > h + 50) {
                s.x = (Math.random() - 0.5) * 2;
                s.y = (Math.random() - 0.5) * 2;
                s.z = 1.5;
                s.prevX = (s.x / s.z) * fov + cx;
                s.prevY = (s.y / s.z) * fov + cy;
                continue;
            }

            // Project
            const sx = (s.x / s.z) * fov + cx;
            const sy = (s.y / s.z) * fov + cy;

            // Depth-based size + energy boost
            const depth = 1 - s.z / 1.5;
            const size = (s.size + depth * 2.5 + energy * 1.5) * (1 + this.warpSpeed * 15);
            const twinkle = Math.sin(time * 3 + s.twinklePhase) * 0.3 + 0.7;
            const alpha = Math.min(1, depth * 0.8 + 0.2) * twinkle;

            // Warp trail
            const trailLength = this.warpSpeed * 800;
            if (trailLength > 2) {
                const grad = ctx.createLinearGradient(prevSx, prevSy, sx, sy);
                grad.addColorStop(0, `hsla(${s.hue}, 60%, 80%, 0)`);
                grad.addColorStop(1, `hsla(${s.hue}, 60%, 90%, ${alpha * 0.6})`);
                ctx.strokeStyle = grad;
                ctx.lineWidth = size * 0.7;
                ctx.beginPath();
                ctx.moveTo(prevSx, prevSy);
                ctx.lineTo(sx, sy);
                ctx.stroke();
            }

            // Star dot
            ctx.globalAlpha = alpha;
            ctx.fillStyle = `hsl(${s.hue}, ${50 + energy * 40}%, ${75 + depth * 20}%)`;
            ctx.beginPath();
            ctx.arc(sx, sy, size * 0.5, 0, Math.PI * 2);
            ctx.fill();

            // Bright stars get cross flare
            if (size > 3 && depth > 0.6) {
                ctx.globalAlpha = alpha * 0.3;
                ctx.strokeStyle = `hsl(${s.hue}, 40%, 90%)`;
                ctx.lineWidth = 0.5;
                const flareLen = size * 2;
                ctx.beginPath();
                ctx.moveTo(sx - flareLen, sy);
                ctx.lineTo(sx + flareLen, sy);
                ctx.moveTo(sx, sy - flareLen);
                ctx.lineTo(sx, sy + flareLen);
                ctx.stroke();
            }

            s.prevX = sx;
            s.prevY = sy;
        }

        ctx.globalAlpha = 1;
        ctx.restore();
    }

    setMousePosition(nx, ny) {
        this.mouseX = nx;
        this.mouseY = ny;
    }
}

window.Starfield = Starfield;
