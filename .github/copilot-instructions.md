# Audio Visualization Project - Development Guide

## Project Overview
This is a **real-time audio visualization** web application that analyzes audio input and generates dynamic visual effects including:
- Particle effects responding to beats
- Real-time waveform visualization
- Color gradients based on frequency data
- 3D geometric shapes morphing with energy peaks
- Beat detection and bass/kick tracking

## Technology Stack
- **Frontend**: Vanilla JavaScript with Canvas/WebGL
- **Audio Analysis**: Web Audio API
- **Visualization**: Canvas 2D for most effects, WebGL for 3D shapes
- **No external frameworks**: Pure JavaScript for maximum performance

## Project Structure
```
src/
  ├── audioAnalyzer.js      # Web Audio API setup and analysis
  ├── beatDetector.js       # Beat and bass detection algorithms
  ├── visualizationEngine.js # Rendering pipeline for all effects
  ├── particleSystem.js     # Particle effect management
  ├── waveformRenderer.js   # Real-time waveform display
  ├── colorGradient.js      # Gradient color management
  └── threeDRenderer.js     # 3D shapes and morphing
index.html                   # Main application page
styles.css                   # UI styling
```

## Key Features
1. **System Audio Capture**: Real-time visualization of any audio playing on your computer
2. **Audio File Upload**: Visualize uploaded MP3, WAV, OGG files
3. **Frequency Analysis**: FFT-based frequency analysis
4. **Beat Detection**: Peak detection in frequency bands
5. **Visual Feedback**: Multi-layer visualization responding to different audio features
6. **Performance**: Efficient canvas rendering with RAF

## Getting Started
1. Open `index.html` in a modern web browser (Chrome, Firefox, Safari, Edge)
2. Click "� Capture System Audio" to visualize audio playing on your computer
   - A screen capture dialog will appear - ensure "Share audio" is enabled
   - You can share your entire screen or just audio
3. Alternatively, click "📁 Upload Audio" to select an audio file
4. The visualizations will automatically respond in real-time

## Audio Source
- **System Audio**: Real-time capture of any audio playing on your computer
- **File Upload**: Supports MP3, WAV, OGG, and other standard audio formats

## Browser Requirements
- Modern browser with Web Audio API support (Chrome, Firefox, Safari, Edge)
- For system audio: Browser must support Screen Capture API with audio
- Canvas 2D and WebGL support

## Customization
- Modify `beatDetector.js` to adjust beat sensitivity
- Edit `colorGradient.js` to change color schemes
- Adjust `particleSystem.js` for particle behavior
- Modify canvas sizes and performance in `index.html`
