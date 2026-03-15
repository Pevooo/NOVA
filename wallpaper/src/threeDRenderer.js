// 3D Renderer  Icosahedron, torus, dodecahedron, morphing, depth-sorting, smooth inertia
class ThreeDRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.rot = { x: 0, y: 0, z: 0 };
        this.vel = { x: 0.003, y: 0.005, z: 0.001 };
        this.allShapeData = this._createAllShapes();
        this.currentShapeIdx = 0;
        this.morphProgress = 1;
        this.morphTarget = 0;
        this.morphSpeed = 0.02;
        this.time = 0;
        this.beatPulse = 0;

        // Use first two shapes initially
        this.shapes = [this.allShapeData[0], this.allShapeData[1]];
    }

    _createAllShapes() {
        return [
            this._icosahedron(),
            this._torus(0.9, 0.35, 20, 12),
            this._dodecahedron(),
            this._octahedron()
        ];
    }

    _icosahedron() {
        const t = (1 + Math.sqrt(5)) / 2;
        const v = [
            [-1,t,0],[1,t,0],[-1,-t,0],[1,-t,0],
            [0,-1,t],[0,1,t],[0,-1,-t],[0,1,-t],
            [t,0,-1],[t,0,1],[-t,0,-1],[-t,0,1]
        ];
        const len = Math.sqrt(1 + t * t);
        v.forEach(function(p) { p[0] /= len; p[1] /= len; p[2] /= len; });
        var edges = [
            [0,11],[0,5],[0,1],[0,7],[0,10],
            [1,5],[5,11],[11,10],[10,7],[7,1],
            [3,9],[3,4],[3,2],[3,6],[3,8],
            [4,9],[2,4],[6,2],[8,6],[9,8],
            [1,9],[5,4],[11,2],[10,6],[7,8],
            [4,5],[9,1],[2,11],[6,10],[8,7]
        ];
        return { vertices: v, edges: edges, scale: 120, offset: { x: -0.35, y: 0 } };
    }

    _torus(R, r, segsR, segsr) {
        var verts = [];
        var edges = [];
        for (var i = 0; i < segsR; i++) {
            var theta = (i / segsR) * Math.PI * 2;
            for (var j = 0; j < segsr; j++) {
                var phi = (j / segsr) * Math.PI * 2;
                verts.push([
                    (R + r * Math.cos(phi)) * Math.cos(theta),
                    (R + r * Math.cos(phi)) * Math.sin(theta),
                    r * Math.sin(phi)
                ]);
            }
        }
        for (var i = 0; i < segsR; i++) {
            for (var j = 0; j < segsr; j++) {
                var curr = i * segsr + j;
                var nextJ = i * segsr + (j + 1) % segsr;
                var nextI = ((i + 1) % segsR) * segsr + j;
                edges.push([curr, nextJ]);
                edges.push([curr, nextI]);
            }
        }
        return { vertices: verts, edges: edges, scale: 110, offset: { x: 0.35, y: 0 } };
    }

    _dodecahedron() {
        var phi = (1 + Math.sqrt(5)) / 2;
        var ip = 1 / phi;
        var v = [
            [1,1,1],[1,1,-1],[1,-1,1],[1,-1,-1],
            [-1,1,1],[-1,1,-1],[-1,-1,1],[-1,-1,-1],
            [0,phi,ip],[0,phi,-ip],[0,-phi,ip],[0,-phi,-ip],
            [ip,0,phi],[-ip,0,phi],[ip,0,-phi],[-ip,0,-phi],
            [phi,ip,0],[phi,-ip,0],[-phi,ip,0],[-phi,-ip,0]
        ];
        // Normalize
        v.forEach(function(p) {
            var len = Math.sqrt(p[0]*p[0]+p[1]*p[1]+p[2]*p[2]);
            p[0] /= len; p[1] /= len; p[2] /= len;
        });
        // Connect adjacent vertices (distance-based)
        var edges = [];
        var threshold = 0.85;
        for (var i = 0; i < v.length; i++) {
            for (var j = i + 1; j < v.length; j++) {
                var dx = v[i][0]-v[j][0], dy = v[i][1]-v[j][1], dz = v[i][2]-v[j][2];
                var dist = Math.sqrt(dx*dx+dy*dy+dz*dz);
                if (dist < threshold) edges.push([i, j]);
            }
        }
        return { vertices: v, edges: edges, scale: 130, offset: { x: -0.35, y: 0 } };
    }

    _octahedron() {
        var v = [ [1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1] ];
        var edges = [
            [0,2],[0,3],[0,4],[0,5],
            [1,2],[1,3],[1,4],[1,5],
            [2,4],[2,5],[3,4],[3,5]
        ];
        return { vertices: v, edges: edges, scale: 140, offset: { x: 0.35, y: 0 } };
    }

    // Matrix math
    _rotX(a) { var c=Math.cos(a),s=Math.sin(a); return [[1,0,0],[0,c,-s],[0,s,c]]; }
    _rotY(a) { var c=Math.cos(a),s=Math.sin(a); return [[c,0,s],[0,1,0],[-s,0,c]]; }
    _rotZ(a) { var c=Math.cos(a),s=Math.sin(a); return [[c,-s,0],[s,c,0],[0,0,1]]; }
    _mul(m, v) {
        return [
            m[0][0]*v[0]+m[0][1]*v[1]+m[0][2]*v[2],
            m[1][0]*v[0]+m[1][1]*v[1]+m[1][2]*v[2],
            m[2][0]*v[0]+m[2][1]*v[1]+m[2][2]*v[2]
        ];
    }
    _project(v, dist) {
        dist = dist || 4;
        var s = dist / (dist + v[2]);
        return { x: v[0] * s, y: v[1] * s, z: v[2] };
    }

    // Morphing: periodically switch shapes
    _checkMorph() {
        if (this.time % 8 < 0.02) {
            this.currentShapeIdx = (this.currentShapeIdx + 1) % this.allShapeData.length;
            // Replace shape 0 (left side) with new shape
            var from = this.shapes[0];
            var to = this.allShapeData[this.currentShapeIdx];
            this.shapes[0] = to;
        }
    }

    render(ctx, energy, beatDetected, g) {
        this.time += 0.016;

        // Beat pulse
        if (beatDetected) this.beatPulse = 1;
        this.beatPulse *= 0.9;

        var w = ctx.canvas.width;
        var h = ctx.canvas.height;
        var cx = w / 2;
        var cy = h / 2;

        // Smooth inertia rotation
        var target = { x: energy * 0.04 + 0.006, y: energy * 0.06 + 0.008, z: energy * 0.02 + 0.003 };
        this.vel.x += (target.x - this.vel.x) * 0.08;
        this.vel.y += (target.y - this.vel.y) * 0.08;
        this.vel.z += (target.z - this.vel.z) * 0.08;
        if (beatDetected) { this.vel.x += 0.08; this.vel.y += 0.1; this.vel.z += 0.05; }
        this.rot.x += this.vel.x;
        this.rot.y += this.vel.y;
        this.rot.z += this.vel.z;

        var pulse = 1 + this.beatPulse * 0.4 + energy * 0.2;
        var rX = this._rotX(this.rot.x);
        var rY = this._rotY(this.rot.y);
        var rZ = this._rotZ(this.rot.z);

        for (var si = 0; si < this.shapes.length; si++) {
            var shape = this.shapes[si];
            var offX = cx + shape.offset.x * w * 0.25;
            var offY = cy + shape.offset.y * h * 0.25;
            var sc = shape.scale * pulse;

            // Project all vertices
            var projected = [];
            for (var vi = 0; vi < shape.vertices.length; vi++) {
                var v = shape.vertices[vi];
                var r = this._mul(rX, v);
                r = this._mul(rY, r);
                r = this._mul(rZ, r);
                projected.push(this._project(r));
            }

            // Sort edges by average z
            var sortedEdges = [];
            for (var ei = 0; ei < shape.edges.length; ei++) {
                var e = shape.edges[ei];
                sortedEdges.push({
                    e: e,
                    z: (projected[e[0]].z + projected[e[1]].z) / 2,
                    i: ei
                });
            }
            sortedEdges.sort(function(a, b) { return a.z - b.z; });

            // Draw connecting energy lines between shapes on beat
            if (si === 1 && this.beatPulse > 0.3 && this.shapes.length > 1) {
                var otherOff = { x: cx + this.shapes[0].offset.x * w * 0.25, y: cy };
                ctx.save();
                ctx.globalAlpha = this.beatPulse * 0.15;
                var connColor = g.getAccent(this.time + 0.5);
                ctx.strokeStyle = 'rgba(' + connColor.r + ',' + connColor.g + ',' + connColor.b + ',0.3)';
                ctx.lineWidth = 1;
                ctx.setLineDash([4, 8]);
                ctx.beginPath();
                ctx.moveTo(offX, offY);
                ctx.lineTo(otherOff.x, otherOff.y);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.globalAlpha = 1;
                ctx.restore();
            }

            // Draw edges
            for (var j = 0; j < sortedEdges.length; j++) {
                var item = sortedEdges[j];
                var e = item.e;
                var z = item.z;
                var idx = item.i;
                var p1 = projected[e[0]];
                var p2 = projected[e[1]];
                var depth = (z + 1.5) / 3;
                var hue = ((si * 120) + idx * 2 + this.time * 30) % 360;
                var alpha = 0.25 + depth * 0.6;

                ctx.strokeStyle = 'hsla(' + hue + ',85%,' + (50 + depth * 25) + '%,' + alpha + ')';
                ctx.lineWidth = 1 + depth * 2 + energy;

                // Glow on high energy
                if (energy > 0.4 && depth > 0.5) {
                    ctx.shadowColor = 'hsl(' + hue + ',85%,60%)';
                    ctx.shadowBlur = energy * 8;
                }

                ctx.beginPath();
                ctx.moveTo(offX + p1.x * sc, offY + p1.y * sc);
                ctx.lineTo(offX + p2.x * sc, offY + p2.y * sc);
                ctx.stroke();
                ctx.shadowBlur = 0;
            }

            // Draw bright nodes
            for (var vi = 0; vi < projected.length; vi++) {
                var p = projected[vi];
                if (p.z > 0) {
                    var hue = ((si * 120) + vi * 15 + this.time * 40) % 360;
                    var nodeR = 2 + (p.z + 1) * 2 + energy * 2 + this.beatPulse * 3;
                    ctx.save();
                    ctx.fillStyle = 'hsla(' + hue + ',90%,70%,0.8)';
                    ctx.shadowColor = 'hsl(' + hue + ',90%,70%)';
                    ctx.shadowBlur = 8 + energy * 12 + this.beatPulse * 15;
                    ctx.beginPath();
                    ctx.arc(offX + p.x * sc, offY + p.y * sc, nodeR, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
            }
        }
    }
}

window.ThreeDRenderer = ThreeDRenderer;
