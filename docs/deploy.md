# Deployment Guide (Render)

We recommend using [Render](https://render.com) for an easy, free-tier friendly Node.js deployment.

## Steps

1. **Push your code to GitHub**: Create a repository and push this full project (backend, frontend, package.json).
2. **Sign up for Render**: Go to render.com and link your GitHub.
3. **New Web Service**: Click "New +" and select Web Service.
4. **Connect Repository**: Choose the GitHub repository containing this project.
5. **Configuration**:
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node backend/server.js` or `npm start`
6. **Environment Variables**:
   Under the Advanced tab, add the following variables:
   - `GITHUB_CLIENT_ID`: (Your GitHub App Client ID)
   - `GITHUB_CLIENT_SECRET`: (Your GitHub App Client Secret)
   - `SESSION_SECRET`: A random string (e.g., `my-super-secret-key`)
   - `OPENAI_API_KEY`: (Optional) Your OpenAI key for AI summaries.
   - `BASE_URL`: The URL Render provides you (e.g., `https://github-portfolio.onrender.com`).
7. **Deploy**: Click "Create Web Service".

## Redirect URLs
Once deployed, remember to update your GitHub OAuth App settings with the new base URL:
- Homepage URL: `https://github-portfolio.onrender.com`
- Authorization callback URL: `https://github-portfolio.onrender.com/auth/github/callback`
