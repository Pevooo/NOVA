// Lightning — Electric arcs that fire on beats
class Lightning {
    constructor() {
        this.bolts = [];
        this.maxBolts = 6;
    }

    trigger(cx, cy, energy, color) {
        if (this.bolts.length >= this.maxBolts) return;
        const angle = Math.random() * Math.PI * 2;
        const length = 100 + energy * 300 + Math.random() * 200;
        this.bolts.push({
            points: this._generateBolt(cx, cy, angle, length),
            life: 1,
            decay: 0.03 + Math.random() * 0.04,
            color,
            width: 2 + energy * 3,
            branches: this._generateBranches(cx, cy, angle, length, energy)
        });
    }

    _generateBolt(sx, sy, angle, length) {
        const points = [{ x: sx, y: sy }];
        const segments = 8 + Math.floor(Math.random() * 8);
        const segLen = length / segments;
        let x = sx, y = sy;
        for (let i = 0; i < segments; i++) {
            const drift = (Math.random() - 0.5) * segLen * 1.2;
            x += Math.cos(angle) * segLen + Math.cos(angle + Math.PI / 2) * drift;
            y += Math.sin(angle) * segLen + Math.sin(angle + Math.PI / 2) * drift;
            points.push({ x, y });
        }
        return points;
    }

    _generateBranches(sx, sy, angle, length, energy) {
        const branches = [];
        const count = Math.floor(energy * 4) + 1;
        for (let i = 0; i < count; i++) {
            const frac = 0.2 + Math.random() * 0.6;
            const bx = sx + Math.cos(angle) * length * frac + (Math.random() - 0.5) * 40;
            const by = sy + Math.sin(angle) * length * frac + (Math.random() - 0.5) * 40;
            const bAngle = angle + (Math.random() - 0.5) * 1.2;
            const bLen = length * (0.2 + Math.random() * 0.3);
            branches.push(this._generateBolt(bx, by, bAngle, bLen));
        }
        return branches;
    }

    update() {
        for (let i = this.bolts.length - 1; i >= 0; i--) {
            this.bolts[i].life -= this.bolts[i].decay;
            if (this.bolts[i].life <= 0) {
                this.bolts.splice(i, 1);
            }
        }
    }

    render(ctx) {
        ctx.save();
        for (const bolt of this.bolts) {
            const alpha = bolt.life;
            // Main bolt
            this._drawPath(ctx, bolt.points, bolt.color, bolt.width, alpha);
            // Glow layer
            this._drawPath(ctx, bolt.points, bolt.color, bolt.width * 3, alpha * 0.3);
            // Branches
            for (const branch of bolt.branches) {
                this._drawPath(ctx, branch, bolt.color, bolt.width * 0.5, alpha * 0.6);
            }
        }
        ctx.restore();
    }

    _drawPath(ctx, points, color, width, alpha) {
        if (points.length < 2) return;
        ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
        ctx.lineWidth = width;
        ctx.shadowColor = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
        ctx.shadowBlur = width * 4;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
}

window.Lightning = Lightning;
