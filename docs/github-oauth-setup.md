# GitHub OAuth Setup

To enable login, you need to create a GitHub OAuth App.

## Steps

1. Go to your GitHub Settings -> Developer settings -> OAuth Apps.
2. Click **New OAuth App**.
3. Fill in the details:
   - **Application name**: GitHub Portfolio Intelligence (Local)
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/auth/github/callback`
4. Click **Register application**.
5. Generate a **New client secret**.
6. Copy the **Client ID** and **Client Secret**.

## Environment File
Create a `.env` file in the root directory (where `package.json` is located) with the following content:

```env
GITHUB_CLIENT_ID=your_client_id_here
GITHUB_CLIENT_SECRET=your_client_secret_here
SESSION_SECRET=a_random_secret_string
OPENAI_API_KEY=your_openai_api_key_optional
```

When deploying, replace `localhost:3000` with your production URL.
