# GitHub Portfolio Intelligence

A simple, straightforward web application for analyzing GitHub portfolios and generating candidate reports. Built with a Node.js backend (Express) and a minimal HTML/CSS/JS frontend.

## Quick Start Guide

### Prerequisites
- Node.js installed
- GitHub Account

### Local Development

1. **Clone/Download** the repository.
2. **Install Dependencies**:
   Open a terminal in the root directory and run:
   ```bash
   npm install
   ```
3. **Setup Environment Variables**:
   Create a `.env` file in the root directory. Follow the instructions in `docs/github-oauth-setup.md` to get your GitHub Client ID/Secret.
   ```env
   GITHUB_CLIENT_ID=your_id
   GITHUB_CLIENT_SECRET=your_secret
   SESSION_SECRET=local-secret
   OPENAI_API_KEY=your_openai_key_optional
   ```
4. **Start the Server**:
   ```bash
   npm run dev
   ```
5. **Access**:
   Open your browser and navigate to `http://localhost:3000`

### Project Structure
- `/backend`: Node.js Express server, routes, and Firebase integration.
- `/frontend`: Minimal HTML, CSS, and JS files served statically.
- `/docs`: Setup and deployment guides.
