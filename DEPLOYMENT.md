# Deployment Guide (Vercel + Render)

## 1) Push repository to GitHub

Your current GitHub repository appears empty. Push these folders/files first:

- `LibraLearnfrontend-main/`
- `LibraLearn-backend-main/`
- `render.yaml`

## 2) Deploy backend on Render

1. In Render, create a **Blueprint** deployment from your repository.
2. Render will detect `render.yaml` and create the backend service.
3. Set secret env vars in Render:
   - `OPENAI_API_KEY`
   - `ELEVEN_LABS_API_KEY`
4. Deploy and copy backend URL (example: `https://libralearn-backend.onrender.com`).

`render.yaml` installs:
- `ffmpeg`
- `rhubarb` (`/usr/local/bin/rhubarb`)

## 3) Deploy frontend on Vercel

1. Import the same repository in Vercel.
2. Set **Root Directory** to `LibraLearnfrontend-main`.
3. Add frontend environment variables from `LibraLearnfrontend-main/.env.example`.
4. Set:
   - `VITE_API_URL=https://<your-render-backend-url>`
5. Deploy.

## 4) Verify

- Open frontend and submit a chat prompt.
- Ensure backend endpoints respond:
  - `/chat`
  - `/tts`
  - `/ragAsk`
- Confirm audio/lipsync generation succeeds in Render logs.
