# Deployment Guide: Chat w/ Ontology

This project is deployed in two parts:
1. **Backend**: FastAPI + Cognee (Deployed on Railway)
2. **Frontend**: Remix (Deployed on Vercel)

## Prerequisites
- GitHub Account (Repo pushed to GitHub)
- Railway Account (railway.app)
- Vercel Account (vercel.com)
- OpenAI API Key

---

## Part 1: Backend (Railway)

1. **Login to Railway** and create a "New Project" -> "Deploy from GitHub repo".
2. Select this repository.
3. **Configure the Service**:
   - **Root Directory**: Set to `/backend` (Important!).
   - **Variables**: Add the following environment variables:
     - `OPENAI_API_KEY`: sk-... (Your key)
     - `COGNEE_ENV`: production
     - `PORT`: 8000
   - **Networking**: Enable "Public Networking" (Generate a Domain). Copy this URL (e.g., `https://web-production-1234.up.railway.app`).
4. **Persistent Storage (Volume)**:
   - Go to the Service "Settings" or "Volumes" tab.
   - Click "Add Volume".
   - **Mount Path**: `/usr/local/lib/python3.11/site-packages/cognee/.cognee_system`
   - *Note*: This is required to persist the knowledge graph between restarts.
5. **Deploy**: Click "Deploy" if it hasn't started.
6. **Initialize Data**:
   - Once the service is running, send a POST request to the ingest endpoint to build the graph.
   - You can use `curl`:
     ```bash
     curl -X POST https://your-railway-url.up.railway.app/ingest
     ```
   - This parses the Resume PDF/HTML and builds the ontology.

---

## Part 2: Frontend (Vercel)

1. **Login to Vercel** and "Add New" -> "Project".
2. Import the same GitHub repository.
3. **Build Settings**:
   - **Framework Preset**: Remix (Should be auto-detected).
   - **Root Directory**: `./` (Default).
4. **Environment Variables**:
   - `BACKEND_URL`: Paste the Railway URL from Part 1 (e.g., `https://web-production-1234.up.railway.app`).
   - *Note*: Do NOT include a trailing slash.
5. **Deploy**: Click "Deploy".
6. **Custom Domain**:
   - Go to "Settings" -> "Domains".
   - Add `pedroreichow.com.br`.
   - Follow the DNS configuration instructions provided by Vercel.

---

## Troubleshooting

- **Backend Graph Empty?**
  - Ensure you ran the `/ingest` command after deployment.
  - Check Railway logs for errors during ingestion.
  - Verify the Volume is mounted correctly.

- **Frontend Connection Error?**
  - Check the browser console.
  - Ensure `BACKEND_URL` in Vercel is correct (no trailing slash, starts with https).
  - Ensure the Backend is running and healthy (visit the Backend URL in browser, should see `{"status": "ok"}`).
