# Deployment Guide for GitHub Pages

This guide explains how to deploy the Color Mastery app to GitHub Pages and handle environment variables securely.

## Quick Start

1. **Push your code to GitHub**
2. **Enable GitHub Pages** in repository settings
3. **Set up GitHub Secrets** (optional, for default API settings)
4. **Push to main branch** - deployment happens automatically!

## Step-by-Step Instructions

### 1. Initial Setup

```bash
# Initialize git if not already done
git init
git add .
git commit -m "Initial commit"

# Add your GitHub remote
git remote add origin https://github.com/your-username/color_pccs.git
git branch -M main
git push -u origin main
```

### 2. Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** → **Pages**
3. Under **Source**, select **"GitHub Actions"**
4. Save the settings

### 3. Configure Repository Name

**Important**: Update `vite.config.js` if your repository name differs:

```javascript
// If your repo is named "my-color-app", change this:
base: process.env.GITHUB_PAGES === 'true' ? '/my-color-app/' : '/',
```

For root domain (`username.github.io`), use:
```javascript
base: '/',
```

### 4. Set Up GitHub Secrets (Optional)

GitHub Secrets allow you to inject environment variables at build time. However, remember that **these will still be visible in the client bundle**.

**To add secrets:**

1. Go to your repository → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add these secrets (all optional):
   - `VITE_API_KEY`: Your API key (if you want a default)
   - `VITE_BASE_URL`: API base URL (defaults to `https://models.inference.ai.azure.com`)
   - `VITE_MODEL`: Model name (defaults to `gpt-4o`)

**Why optional?** The app has a Settings modal where users can enter their own API keys, which is more secure.

### 5. Deploy

Simply push to the `main` branch:

```bash
git add .
git commit -m "Deploy to GitHub Pages"
git push origin main
```

The GitHub Action will automatically:
- Build your app
- Deploy to GitHub Pages
- Make it available at `https://your-username.github.io/color_pccs/`

### 6. Monitor Deployment

- Go to the **Actions** tab in your repository
- Watch the workflow run
- Once complete, your site is live!

## Environment Variables Security

### ⚠️ Important Security Considerations

**Client-side environment variables are PUBLIC**

Any `VITE_*` environment variable is:
- Embedded in the JavaScript bundle
- Visible to anyone who views the page source
- Accessible via browser developer tools

### Recommended Approaches

#### Option 1: User-Entered Keys (Most Secure for Public Apps)
- Users enter their own API keys via the Settings modal
- Keys stored in localStorage (browser-only)
- No keys exposed in repository or build
- **Best for**: Public repositories, open-source projects

#### Option 2: GitHub Secrets (For Default Values)
- Set default API settings via GitHub Secrets
- Users can still override via Settings modal
- Keys are visible in bundle but not in repository
- **Best for**: Internal tools, demos with shared keys

#### Option 3: Backend Proxy (Most Secure)
- Create a backend API that proxies requests
- Keep API keys on server only
- Requires backend infrastructure
- **Best for**: Production applications with sensitive data

### Current Implementation

This app uses **Option 1** by default:
- No API keys in the repository
- Users configure their own keys via the Settings modal
- Keys stored locally in browser localStorage
- GitHub Secrets are optional for convenience defaults

## Troubleshooting

### Build Fails

- Check the Actions tab for error messages
- Ensure Node.js version is compatible (18+)
- Verify all dependencies are in `package.json`

### Site Shows 404

- Verify the `base` path in `vite.config.js` matches your repository name
- Check GitHub Pages settings (should be "GitHub Actions")
- Wait a few minutes for DNS propagation

### API Calls Fail

- Verify API keys are set (either via GitHub Secrets or Settings modal)
- Check browser console for CORS errors
- Ensure API endpoint URL is correct

### Assets Not Loading

- Check that `base` path in `vite.config.js` is correct
- Verify all paths use relative URLs (Vite handles this automatically)
- Clear browser cache

## Custom Domain Setup

1. Update `vite.config.js`:
   ```javascript
   base: '/',
   ```

2. Create `public/CNAME` file:
   ```
   yourdomain.com
   ```

3. Configure DNS:
   - Add CNAME record: `yourdomain.com` → `your-username.github.io`

4. Update GitHub Pages settings:
   - Settings → Pages → Custom domain
   - Enter your domain

## Manual Deployment (Alternative)

If you prefer not to use GitHub Actions:

```bash
# Install gh-pages
npm install --save-dev gh-pages

# Add to package.json scripts:
# "deploy": "npm run build:gh-pages && gh-pages -d dist"

# Deploy
npm run deploy
```

## Need Help?

- Check GitHub Actions logs in the Actions tab
- Review Vite documentation: https://vitejs.dev/guide/static-deploy.html#github-pages
- GitHub Pages docs: https://docs.github.com/en/pages

