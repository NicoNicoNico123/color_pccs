# 色彩大師 (Color Mastery) - PCCS

A modern React web application for learning and practicing the PCCS (Practical Color Coordinate System) color system. Features include color reference charts, interactive quizzes, and AI-powered color matching.

## Features

- 📚 **Color Reference**: Browse all 12 PCCS tones with 12 hues each
- 🎯 **Interactive Quiz**: Test your knowledge with flashcards
- 🤖 **AI Color Matching**: Describe a mood or scene and get color recommendations
- ⚙️ **Customizable API Settings**: Configure your OpenAI-compatible API endpoint

## Getting Started

### Prerequisites

- Node.js 16+ and npm/yarn/pnpm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables (optional):
```bash
cp .env.example .env
# Edit .env and add your API key and settings
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory. You can preview the production build with:

```bash
npm run preview
```

## Environment Variables

### Local Development

Create a `.env` file in the root directory with the following variables:

- `VITE_API_KEY`: Your API key for OpenAI-compatible endpoints
- `VITE_BASE_URL`: Base URL for the API (default: `https://models.inference.ai.azure.com`)
- `VITE_MODEL`: Model name to use (default: `gpt-4o`)

**Note**: In Vite, environment variables must be prefixed with `VITE_` to be exposed to the client.

### GitHub Pages Deployment

⚠️ **Important Security Note**: Environment variables in client-side React apps are **publicly visible** in the built JavaScript bundle. Anyone can view your API key in the browser's developer tools.

**Options for GitHub Pages:**

1. **Use GitHub Secrets (Build-time injection)** - Recommended for default values
   - Go to your repository → Settings → Secrets and variables → Actions
   - Add secrets: `VITE_API_KEY`, `VITE_BASE_URL`, `VITE_MODEL`
   - These will be injected at build time (but still visible in the final bundle)

2. **Use the Settings Modal** - Recommended for user-specific keys
   - Users can enter their own API keys via the Settings modal in the app
   - Keys are stored in localStorage (browser-only, not shared)
   - This is the most secure approach for production

3. **Use a Backend Proxy** - Most secure (requires backend)
   - Create a backend API that proxies requests to OpenAI
   - Keep API keys on the server only
   - Not included in this setup, but recommended for production apps

## Project Structure

```
color_pccs/
├── src/
│   ├── App.jsx          # Main application component
│   ├── main.jsx         # React entry point
│   └── index.css        # Tailwind CSS imports
├── index.html           # HTML template
├── package.json         # Dependencies and scripts
├── vite.config.js       # Vite configuration
├── tailwind.config.js   # Tailwind CSS configuration
└── README.md            # This file
```

## Technologies Used

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **OpenAI API** - AI color matching

## Deployment to GitHub Pages

### Automatic Deployment (Recommended)

1. **Enable GitHub Pages:**
   - Go to your repository → Settings → Pages
   - Source: Select "GitHub Actions"

2. **Configure Repository Name:**
   - Update `vite.config.js` if your repository name is different from `color_pccs`
   - Change the `base` path to match your repository name: `base: '/your-repo-name/'`
   - For root domain deployment, use `base: '/'`

3. **Set GitHub Secrets (Optional):**
   - Go to Settings → Secrets and variables → Actions
   - Add these secrets if you want default API settings:
     - `VITE_API_KEY`: Your API key
     - `VITE_BASE_URL`: API base URL (optional, has default)
     - `VITE_MODEL`: Model name (optional, has default)

4. **Push to main branch:**
   ```bash
   git add .
   git commit -m "Setup GitHub Pages deployment"
   git push origin main
   ```

5. **Monitor Deployment:**
   - Go to Actions tab to see the deployment progress
   - Once complete, your site will be available at:
     `https://your-username.github.io/color_pccs/`

### Manual Deployment

If you prefer to deploy manually:

```bash
# Build for GitHub Pages
npm run build:gh-pages

# The dist folder contains the built files
# You can deploy this folder using gh-pages or manually
```

### Custom Domain

If deploying to a custom domain:
1. Update `vite.config.js` to use `base: '/'`
2. Add a `CNAME` file in the `public` folder (if using Vite public folder)
3. Configure DNS settings in your domain provider

## License

MIT

