# 🎵 Audio Visualization - Real-Time Music Visualizer

An interactive web application that transforms audio into stunning visual effects in real-time. Watch particles explode during drops, waveforms dance to beats, and 3D shapes morph with the music's energy.

**Supports:**
- 🎵 Real-time system audio capture (any audio playing on your computer)
- 📁 Audio file upload and visualization

## ✨ Features

### Visual Effects
- **Particle System**: Dynamic particles that emit and respond to beats and energy levels
- **Real-time Waveform**: Live oscilloscope-style waveform visualization
- **Frequency Spectrum**: Vertical bar spectrum analyzer with smooth gradients
- **3D Shapes**: Rotating cube and octahedron that morph based on audio energy
- **Color Gradients**: Dynamic colors that shift based on frequency ranges
- **Radial Pulses**: Circular pulsations that trigger on beat detection

### Audio Analysis
- **Beat Detection**: Smart algorithm detecting beats and drops in real-time
- **Frequency Analysis**: FFT-based frequency spectrum breakdown
- **Bass/Kick Detection**: Dedicated bass peak tracking
- **Energy Calculation**: Overall energy level monitoring
- **Frequency Bands**: Separation into bass, mid, and treble ranges

### Controls
- 🎵 Real-time system audio capture (any audio playing on your computer)
- 📁 Upload and visualize audio files
- ⏸️ Play/pause audio playback
- 🎛️ Adjustable sensitivity for beat detection
- 🌊 Dynamic particle count slider
- 👁️ Multiple visualization modes
- 📊 Real-time statistics display

## 🚀 Quick Start

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- For system audio: Browser must support Screen Capture API with audio
- Audio to visualize (system audio or audio file)

### How to Use

1. **Open the Application**
   - Simply open `index.html` in your web browser

2. **Capture System Audio** (Recommended)
   - Click **"🎵 Capture System Audio"** to visualize any audio playing on your computer
   - A screen capture dialog will appear - make sure to **enable audio sharing**
   - The visualization will start immediately
   - Play music, watch videos, stream content - all will be visualized!

3. **Or Upload an Audio File**
   - Click **"📁 Upload Audio"** to select an audio file (MP3, WAV, OGG, etc.)
   - The audio will automatically start playing with visualizations
   - Click **Stop** to pause the visualization

4. **Customize Effects**
   - Adjust **Sensitivity** slider to fine-tune beat detection
   - Move **Particles** slider to control effect intensity
   - Choose a **Visual Mode** for different visualization styles

5. **Visual Modes**
   - **Combined**: All effects together (recommended)
   - **Particles Only**: Just particle effects
   - **Waveform Only**: Oscilloscope visualization
   - **Spectrum Only**: Frequency bars
   - **3D Only**: 3D rotating shapes

## 📁 Project Structure

```
PartyProject/
├── index.html                  # Main application page
├── styles.css                  # Application styling
├── src/
│   ├── app.js                  # Main app orchestration
│   ├── audioAnalyzer.js        # Web Audio API interface
│   ├── beatDetector.js         # Beat & frequency detection
│   ├── colorGradient.js        # Color management
│   ├── particleSystem.js       # Particle effects engine
│   ├── threeDRenderer.js       # 3D shape rendering
│   ├── visualizationEngine.js  # Main rendering pipeline
│   └── waveformRenderer.js     # Waveform visualization
├── assets/                     # Placeholder for assets
└── .github/
    └── copilot-instructions.md # Development documentation
```

## 🎨 Customization Guide

### Beat Detection Sensitivity
Edit `src/beatDetector.js`:
```javascript
setSensitivity(value) {
    this.sensitivity = Math.max(0.1, Math.min(5, value));
}
```
Higher values = more frequent beat detection

### Color Schemes
Edit `src/colorGradient.js`:
```javascript
this.baseColors = [
    { r: 233, g: 69, b: 96 },   // Modify these RGB values
    { r: 255, g: 107, b: 157 },
    // ... more colors
];
```

### Particle Behavior
Edit `src/particleSystem.js`:
- `maxParticles`: Maximum number of particles
- `speed`: Particle movement speed
- `decay`: Particle lifetime decay rate

### 3D Shape Rotation
Edit `src/threeDRenderer.js`:
```javascript
this.scene.rotation.x += energy * 0.02; // Adjust multipliers
this.scene.rotation.y += energy * 0.03;
```

### Visualization Resolution
Edit `index.html` canvas initialization to adjust resolution and performance.

## 🔧 Browser Compatibility

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome  | ✅ Full | Recommended, best performance |
| Firefox | ✅ Full | Good support |
| Safari  | ✅ Full | Works well on macOS/iOS |
| Edge    | ✅ Full | Good support |

## 🎯 Tips for Best Results

1. **System Audio (Chrome)**: Works best with Chrome browser for system audio capture
2. **Enable Audio in Screen Capture**: Make sure to toggle "Share system audio" in the screen capture dialog
3. **Dark Environment**: Visualizations are designed for dark backgrounds
4. **Full Screen**: Maximize the browser for immersive experience
5. **Adjust Sensitivity**: Fine-tune beat detection for different music genres
6. **Different Music**: Try electronic, rock, or hip-hop for varied effects

## 🐛 Troubleshooting

### No System Audio Captured
- Ensure your browser is up to date (Chrome 72+, Firefox 66+, Safari 13+, Edge 79+)
- Make sure audio sharing is **enabled** in the screen capture dialog
- Check browser permissions for screen capture in settings
- Try with a different audio source

### Audio File Not Playing
- Check browser audio permissions
- Ensure audio file is in a supported format (MP3, WAV, OGG)
- Try a different audio file
- Check browser console for errors

### Low Performance
- Reduce particle count slider
- Switch to a simpler visualization mode
- Close other browser tabs
- Check GPU hardware acceleration is enabled

### Beat Detection Not Working
- Increase sensitivity slider
- Try music with clear beats (electronic or pop)
- Check beat detection threshold in `beatDetector.js`

## 📝 Development Notes

### Architecture
- **Modular Design**: Each component is independent and reusable
- **Canvas 2D**: Used for efficient 2D rendering
- **Web Audio API**: Standard audio analysis interface
- **No Dependencies**: Pure vanilla JavaScript for maximum compatibility

### Performance Optimization
- RAF (requestAnimationFrame) for smooth 60fps
- Efficient particle management with object pooling
- Canvas fade effect instead of full clears
- FFT size optimized for real-time analysis

### Future Enhancements
- [ ] Recording and playback
- [ ] Custom color theme selector
- [ ] Beat-synced animations
- [ ] Mobile touch controls
- [ ] Audio file equalizer
- [ ] Export visualization as video

## 📄 License

This project is open source and available for personal and educational use.

---

**Made with ❤️ for music lovers and visual enthusiasts**
