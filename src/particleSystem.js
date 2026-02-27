// Particle System  Object-pooled, multi-shape, trailing, mouse-reactive
class ParticleSystem {
    constructor(maxParticles = 2000) {
        this.maxParticles = maxParticles;
        this.pool = [];
        this.active = [];
        this.time = 0;

        // Mouse attraction
        this.mouseX = 0.5;
        this.mouseY = 0.5;
        this.mouseActive = false;
        this.mouseRadius = 200;
        this.mouseForce = 0.3;

        // Pre-allocate pool
        for (let i = 0; i < maxParticles; i++) {
            this.pool.push(this._createParticle());
        }
    }

    _createParticle() {
        return {
            x: 0, y: 0, vx: 0, vy: 0,
            size: 1, life: 0, decay: 0.01,
            hue: 0, saturation: 80, lightness: 60,
            alpha: 1, shape: 'circle',
            isExplosion: false, rotation: 0, rotSpeed: 0,
            trail: [], trailMax: 0,
            glow: 0,
            // Gravity toward center
            gravity: 0
        };
    }

    _acquire() {
        if (this.pool.length > 0) return this.pool.pop();
        if (this.active.length > 0) {
            // Steal oldest
            const stolen = this.active[0];
            this.active[0] = this.active[this.active.length - 1];
            this.active.pop();
            stolen.trail.length = 0;
            return stolen;
        }
        return this._createParticle();
    }

    _release(idx) {
        const p = this.active[idx];
        p.trail.length = 0;
        this.pool.push(p);
        this.active[idx] = this.active[this.active.length - 1];
        this.active.pop();
    }

    setMaxParticles(n) { this.maxParticles = Math.max(200, n); }

    setMousePosition(nx, ny) {
        this.mouseX = nx;
        this.mouseY = ny;
        this.mouseActive = true;
    }

    getParticleCount() { return this.active.length; }

    /* update logic */
    update(frequencyData, beatDetected, energy) {
        this.time += 0.016;

        // Emit continuous particles
        this._emit(energy);

        // Emit explosions on beat
        if (beatDetected) {
            this._emitExplosion(energy);
        }

        // Update all active particles
        for (let i = this.active.length - 1; i >= 0; i--) {
            const p = this.active[i];
            p.life -= p.decay;

            if (p.life <= 0.001) {
                this._release(i);
                continue;
            }

            // Store trail point
            if (p.trailMax > 0) {
                p.trail.push({ x: p.x, y: p.y });
                if (p.trail.length > p.trailMax) p.trail.shift();
            }

            // Mouse interaction
            if (this.mouseActive && this.mouseRadius > 0) {
                const mxPx = this.mouseX * this._canvasW;
                const myPx = this.mouseY * this._canvasH;
                const dx = mxPx - p.x;
                const dy = myPx - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < this.mouseRadius && dist > 1) {
                    const force = (1 - dist / this.mouseRadius) * this.mouseForce;
                    p.vx += (dx / dist) * force;
                    p.vy += (dy / dist) * force;
                }
            }

            // Gravity (subtle pull toward center)
            if (p.gravity !== 0) {
                const dx = this._canvasW / 2 - p.x;
                const dy = this._canvasH / 2 - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy) + 1;
                p.vx += (dx / dist) * p.gravity;
                p.vy += (dy / dist) * p.gravity;
            }

            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.985;
            p.vy *= 0.985;
            p.rotation += p.rotSpeed;
        }
    }

    _emit(energy) {
        const rate = Math.floor(8 + energy * 60);
        for (let i = 0; i < rate; i++) {
            if (this.active.length >= this.maxParticles) break;
            const p = this._acquire();
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.5 + Math.random() * 2 + energy * 3;

            p.x = this._canvasW / 2 + (Math.random() - 0.5) * 100;
            p.y = this._canvasH / 2 + (Math.random() - 0.5) * 100;
            p.vx = Math.cos(angle) * speed;
            p.vy = Math.sin(angle) * speed;
            p.size = 1.5 + Math.random() * 3 + energy * 2;
            p.life = 0.6 + Math.random() * 0.5;
            p.decay = 0.005 + Math.random() * 0.008;
            p.hue = (this.time * 60 + Math.random() * 60) % 360;
            p.saturation = 70 + Math.random() * 30;
            p.lightness = 55 + Math.random() * 20;
            p.alpha = 0.7 + Math.random() * 0.3;
            p.isExplosion = false;
            p.rotation = Math.random() * Math.PI * 2;
            p.rotSpeed = (Math.random() - 0.5) * 0.1;
            p.glow = energy * 10;
            p.gravity = 0;

            // Randomly assign shape
            const shapeRoll = Math.random();
            if (shapeRoll < 0.35) p.shape = 'circle';
            else if (shapeRoll < 0.55) p.shape = 'ring';
            else if (shapeRoll < 0.7) p.shape = 'star';
            else if (shapeRoll < 0.82) p.shape = 'diamond';
            else if (shapeRoll < 0.92) p.shape = 'hex';
            else p.shape = 'cross';

            // Trails for some particles
            p.trailMax = Math.random() < 0.3 ? Math.floor(5 + Math.random() * 8) : 0;
            p.trail.length = 0;

            this.active.push(p);
        }
    }

    _emitExplosion(energy) {
        const burst = Math.floor(30 + energy * 70);
        const cx = this._canvasW / 2 + (Math.random() - 0.5) * this._canvasW * 0.3;
        const cy = this._canvasH / 2 + (Math.random() - 0.5) * this._canvasH * 0.3;

        for (let i = 0; i < burst; i++) {
            if (this.active.length >= this.maxParticles) break;
            const p = this._acquire();
            const angle = Math.random() * Math.PI * 2;
            const speed = 3 + Math.random() * 8 + energy * 6;

            p.x = cx;
            p.y = cy;
            p.vx = Math.cos(angle) * speed;
            p.vy = Math.sin(angle) * speed;
            p.size = 2 + Math.random() * 5 + energy * 3;
            p.life = 0.8 + Math.random() * 0.6;
            p.decay = 0.008 + Math.random() * 0.012;
            p.hue = (this.time * 80 + i * 3) % 360;
            p.saturation = 80 + Math.random() * 20;
            p.lightness = 60 + Math.random() * 25;
            p.alpha = 1;
            p.isExplosion = true;
            p.rotation = Math.random() * Math.PI * 2;
            p.rotSpeed = (Math.random() - 0.5) * 0.2;
            p.glow = 15 + energy * 25;
            p.gravity = 0.02; // Slight pull back to center

            const shapeRoll = Math.random();
            if (shapeRoll < 0.3) p.shape = 'star';
            else if (shapeRoll < 0.5) p.shape = 'diamond';
            else if (shapeRoll < 0.65) p.shape = 'hex';
            else if (shapeRoll < 0.8) p.shape = 'cross';
            else p.shape = 'circle';

            // Explosion particles always have trails
            p.trailMax = Math.floor(6 + Math.random() * 10);
            p.trail.length = 0;

            this.active.push(p);
        }
    }

    /* render */
    render(ctx) {
        this._canvasW = ctx.canvas.width;
        this._canvasH = ctx.canvas.height;

        ctx.save();
        for (let i = 0; i < this.active.length; i++) {
            const p = this.active[i];
            const alphaFinal = p.alpha * Math.min(1, p.life * 3);

            // Draw trail
            if (p.trail.length > 1) {
                ctx.beginPath();
                ctx.moveTo(p.trail[0].x, p.trail[0].y);
                for (let t = 1; t < p.trail.length; t++) {
                    ctx.lineTo(p.trail[t].x, p.trail[t].y);
                }
                ctx.lineTo(p.x, p.y);
                const trailAlpha = alphaFinal * 0.25;
                ctx.strokeStyle = 'hsla(' + p.hue + ',' + p.saturation + '%,' + p.lightness + '%,' + trailAlpha + ')';
                ctx.lineWidth = p.size * 0.4;
                ctx.stroke();
            }

            // Glow
            if (p.glow > 2) {
                ctx.shadowColor = 'hsl(' + p.hue + ',' + p.saturation + '%,' + p.lightness + '%)';
                ctx.shadowBlur = p.glow * alphaFinal;
            }

            ctx.fillStyle = 'hsla(' + p.hue + ',' + p.saturation + '%,' + p.lightness + '%,' + alphaFinal + ')';

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);

            switch (p.shape) {
                case 'circle':
                    ctx.beginPath();
                    ctx.arc(0, 0, p.size, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                case 'ring':
                    ctx.strokeStyle = ctx.fillStyle;
                    ctx.lineWidth = Math.max(1, p.size * 0.3);
                    ctx.beginPath();
                    ctx.arc(0, 0, p.size, 0, Math.PI * 2);
                    ctx.stroke();
                    break;
                case 'star':
                    this._drawStar(ctx, p.size);
                    break;
                case 'diamond':
                    ctx.beginPath();
                    ctx.moveTo(0, -p.size);
                    ctx.lineTo(p.size * 0.6, 0);
                    ctx.lineTo(0, p.size);
                    ctx.lineTo(-p.size * 0.6, 0);
                    ctx.closePath();
                    ctx.fill();
                    break;
                case 'hex':
                    this._drawHex(ctx, p.size);
                    break;
                case 'cross':
                    this._drawCross(ctx, p.size, alphaFinal, p);
                    break;
            }

            ctx.restore();

            // White hot core on explosion particles
            if (p.isExplosion && p.life > 0.5) {
                const coreA = (p.life - 0.5) * 2 * alphaFinal;
                ctx.fillStyle = 'rgba(255,255,255,' + (coreA * 0.8) + ')';
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * 0.35, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.shadowBlur = 0;
        }
        ctx.restore();
    }

    _drawStar(ctx, size) {
        const spikes = 5;
        ctx.beginPath();
        for (let i = 0; i < spikes * 2; i++) {
            const r = i % 2 === 0 ? size : size * 0.4;
            const angle = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
    }

    _drawHex(ctx, size) {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const x = Math.cos(angle) * size;
            const y = Math.sin(angle) * size;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
    }

    _drawCross(ctx, size, alpha, p) {
        const arm = size * 0.3;
        ctx.fillRect(-size, -arm, size * 2, arm * 2);
        ctx.fillRect(-arm, -size, arm * 2, size * 2);
    }
}

window.ParticleSystem = ParticleSystem;
