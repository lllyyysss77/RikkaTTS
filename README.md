# SiliconFlow TTS Client

A modern, responsive Text-to-Speech client for SiliconFlow APIs, built with React, TypeScript, and Vite.

## Features

- **High-Quality TTS**: Support for models like IndexTTS and CosyVoice.
- **Voice Cloning**: Upload reference audio to create custom voices.
- **Audio Management**: Waveform-style player with download support.
- **Persistency**: History and settings saved locally.
- **Mobile First**: Optimized UI for both desktop and mobile devices.

## 🚀 Getting Started

### 1. Installation

Clone the repository and install dependencies:

```bash
npm install
```

### 2. Development

Start the local development server:

```bash
npm run dev
```

### 3. Build

Build for production:

```bash
npm run build
```

## 🌐 Deploy to GitHub Pages

This project is pre-configured for one-command deployment to GitHub Pages.

1. Ensure your project is pushed to a GitHub repository.
2. Run the deployment script:

```bash
npm run deploy
```

This command will:
1. Build the project (`npm run build`).
2. Push the `dist` folder to a `gh-pages` branch on your repository.

**Note**: Make sure to go to your GitHub Repository Settings -> Pages, and ensure the source is set to the `gh-pages` branch.

## 🔑 Configuration

To use the TTS features, you need a SiliconFlow API Key.
- Click the Menu icon in the top right.
- Enter your API Key.
- The key is stored safely in your browser's LocalStorage.

## License

MIT
