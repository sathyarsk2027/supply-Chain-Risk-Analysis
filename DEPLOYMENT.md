# Deployment Guide: Free-Tier Stack

This guide walks through deploying the Supply Chain Risk Monitor to a completely free-tier production stack:
- **Database**: Supabase (PostgreSQL + `pgvector`)
- **Backend (NLP Microservice)**: Render (Python/FastAPI)
- **Backend (API)**: Render (Java/Spring Boot)
- **Frontend**: Vercel (React/Vite)

## Prerequisites
- A GitHub account with this repository pushed to it.
- Free tier accounts on [Supabase](https://supabase.com), [Render](https://render.com), and [Vercel](https://vercel.com).
- A [NewsAPI](https://newsapi.org/) key.
- A [Groq API](https://console.groq.com/keys) key.

---

## 1. Database (Supabase)

Supabase is recommended because its free tier only pauses after 7 days of total inactivity, which prevents the constant "cold starts" you would get with Neon (which pauses after 5 minutes).

### Provisioning
1. Go to the [Supabase Dashboard](https://app.supabase.com/) and create a new project.
2. Provide a secure database password and choose a region close to your Render services (e.g., US East / US West).
3. Wait ~2 minutes for the database to provision.

### Enable `pgvector`
1. Navigate to the **SQL Editor** in the Supabase left sidebar.
2. Run the following command:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

### Get Connection String
1. Go to **Settings > Database**.
2. Scroll down to **Connection String** and select the **URI** tab.
3. It will look like this: `postgresql://postgres.[project-id]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres`.
4. We will break this URI down into environment variables for the Spring Boot backend.

> [!NOTE]
> **Connection Pools:** Supabase automatically routes port 6543 through PgBouncer, giving you up to 200 concurrent connections on the free tier. Our Spring Boot backend (HikariCP) only uses a maximum pool size of 10, so you will never exhaust this limit.

---

## 2. NLP Microservice (Render)

Because Render's free tier is strictly limited to **512MB RAM**, we must deploy the Python NLP service and the Java Spring Boot service as two *separate* Web Services. If combined, they would use ~900MB and crash (OOM).

1. Go to the [Render Dashboard](https://dashboard.render.com/) and click **New > Web Service**.
2. Connect your GitHub repository.
3. Configure the service:
   - **Name**: `supply-chain-nlp`
   - **Root Directory**: `nlp-service`
   - **Environment**: Python
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port 10000`
   - **Instance Type**: Free
4. Click **Create Web Service**.
5. Once deployed, copy the Render URL (e.g., `https://supply-chain-nlp.onrender.com`).

---

## 3. Spring Boot Backend (Render)

1. Click **New > Web Service** again on Render and connect your repository.
2. Configure the service:
   - **Name**: `supply-chain-backend`
   - **Root Directory**: `backend`
   - **Environment**: Docker *(Render will automatically detect the Dockerfile in the backend folder)*
   - **Instance Type**: Free
3. **Environment Variables**: Scroll down and add the following:
   - `SPRING_DATASOURCE_URL`: `jdbc:postgresql://aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require` *(Replace the host with your Supabase pooler host!)*
   - `POSTGRES_USER`: `postgres.[project-id]` *(The pooler requires your project ID in the username)*
   - `POSTGRES_PASSWORD`: `[YOUR-PASSWORD]`
   - `NEWSAPI_KEY`: `[your-newsapi-key]`
   - `GROQ_API_KEY`: `[your-groq-key]`
   - `NLP_SERVICE_EXTRACT_URL`: `https://[nlp-service-url].onrender.com/extract` *(Use the URL from Step 2)*
   - `NLP_SERVICE_EMBED_URL`: `https://[nlp-service-url].onrender.com/embed` *(Use the URL from Step 2)*
4. Click **Create Web Service**.
5. Copy the Backend URL once deployed (e.g., `https://supply-chain-backend.onrender.com`).

---

## 4. Frontend (Vercel)

1. Go to the [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New > Project**.
2. Import your GitHub repository.
3. Configure the Project:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. **Environment Variables**:
   - Name: `VITE_API_URL`
   - Value: `https://[backend-service-url].onrender.com` *(Use the URL from Step 3, with no trailing slash)*
5. Click **Deploy**.
6. Once finished, visit your live Vercel URL!

---

## 5. End-to-End Verification & Known Limitations

### Testing the Live System
1. Open the Vercel URL. Ensure the 3D globe and panels load.
2. Wait a few moments. If the news articles populate on the right panel, the database connection and the scheduled NewsAPI ingestion are working perfectly!
3. Click on a country pin (e.g., "China"). The side panel should show relevant articles and an AI-generated risk summary. This confirms the DB vector search (`pgvector`) and the Groq LLM are fully operational.
4. Type a custom query in the search bar. This confirms the Python NLP service is actively generating embeddings.

> [!WARNING]
> **Known Free-Tier Limitation: The Cold Start Delay**
> Render automatically spins down free Web Services after **15 minutes of inactivity**. 
> - If you visit the site after 15 minutes, the Vercel frontend will load instantly, but the API calls will stall for **~30-50 seconds** while the Spring Boot backend wakes up.
> - **Critical Impact**: The 15-minute background NewsAPI ingestion cron job will ALSO stop running when the server sleeps. It will only fetch articles when the server is awake.
> 
> **How to Fix This (True 24/7 Live Ingestion):**
> To prevent your Render backend from sleeping and ensure your automated 15-minute data ingestion runs continuously:
> 1. Create a free account on [cron-job.org](https://cron-job.org) or [UptimeRobot](https://uptimerobot.com).
> 2. Create a new HTTP monitor pointing to your live backend health endpoint: `https://[your-backend-url].onrender.com/actuator/health`
> 3. Set the ping interval to **10 minutes**.
> 4. This simple ping keeps Render awake permanently, ensuring your AI database is always ingesting the absolute latest supply chain news.
> 
> *Tip for academic review: Simply "warm up" the backend by opening the site and running a search 5 minutes before your presentation begins!*
