// Color Gradient  Theme-aware, perceptual palettes with 9 themes
class ColorGradient {
    constructor() {
        this.animationTime = 0;
        this.themes = {
            neon:    [[320,100,55],[185,100,50],[280,100,60],[155,100,50],[35,100,55],[265,85,55]],
            ocean:   [[195,90,45],[210,80,50],[175,70,55],[220,60,60],[190,100,40],[230,70,45]],
            fire:    [[10,100,50],[25,100,55],[0,100,45],[40,100,50],[350,90,45],[50,90,55]],
            aurora:  [[140,70,50],[170,80,55],[120,60,50],[200,70,55],[160,80,45],[100,60,55]],
            mono:    [[0,0,85],[0,0,70],[0,0,55],[0,0,45],[0,0,90],[0,0,60]],
            candy:   [[330,90,65],[290,80,60],[350,85,60],[310,75,65],[15,90,65],[270,80,65]],
            cosmic:  [[260,90,50],[280,85,55],[200,80,50],[310,75,60],[230,70,55],[340,85,55]],
            matrix:  [[120,100,45],[140,90,40],[100,100,50],[130,85,55],[150,80,45],[110,100,35]],
            sunset:  [[20,95,55],[350,90,50],[40,100,55],[10,85,50],[50,95,60],[340,80,55]]
        };
        this.currentTheme = 'neon';
    }

    setTheme(name) {
        if (this.themes[name]) this.currentTheme = name;
    }

    getAccent(t) {
        const palette = this.themes[this.currentTheme];
        const idx = Math.abs(t * 0.5) % 1;
        const i = idx * (palette.length - 1);
        const lo = Math.floor(i);
        const hi = Math.min(lo + 1, palette.length - 1);
        const f = i - lo;
        const h = palette[lo][0] + (palette[hi][0] - palette[lo][0]) * f;
        const s = palette[lo][1] + (palette[hi][1] - palette[lo][1]) * f;
        const l = palette[lo][2] + (palette[hi][2] - palette[lo][2]) * f;
        return this.hslToRgb(h, s, l);
    }

    getFromSpectrum(position, intensity) {
        intensity = intensity || 1;
        const palette = this.themes[this.currentTheme];
        const i = position * (palette.length - 1);
        const lo = Math.floor(i);
        const hi = Math.min(lo + 1, palette.length - 1);
        const f = i - lo;
        const h = palette[lo][0] + (palette[hi][0] - palette[lo][0]) * f;
        const s = palette[lo][1] + (palette[hi][1] - palette[lo][1]) * f;
        var l = palette[lo][2] + (palette[hi][2] - palette[lo][2]) * f;
        l = l + intensity * 15;
        return this.hslToRgb(h, Math.min(100, s), Math.min(95, l));
    }

    getRainbowGradient(position) {
        return this.getAccent(position * 2);
    }

    hslToRgb(h, s, l) {
        s /= 100; l /= 100;
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = l - c / 2;
        var r, g, b;
        if (h < 60)       { r=c; g=x; b=0; }
        else if (h < 120) { r=x; g=c; b=0; }
        else if (h < 180) { r=0; g=c; b=x; }
        else if (h < 240) { r=0; g=x; b=c; }
        else if (h < 300) { r=x; g=0; b=c; }
        else               { r=c; g=0; b=x; }
        return {
            r: Math.round((r + m) * 255),
            g: Math.round((g + m) * 255),
            b: Math.round((b + m) * 255),
            a: 1
        };
    }

    rgbToString(c) {
        return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + (c.a !== undefined ? c.a : 1) + ')';
    }
}

window.ColorGradient = ColorGradient;
