# Installation Guide

## Prerequisites

- Node.js 18+ (recommended: use nvm)
- npm or bun package manager
- Git

## Getting the Code

### Option 1: Clone from GitHub
1. Connect your Lovable project to GitHub (Settings → Connectors → GitHub)
2. Clone the repository:
```bash
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
```

### Option 2: Download from Lovable
1. Go to your Lovable project
2. Click on Settings → GitHub → Transfer to GitHub
3. Clone the transferred repository

## Local Development Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:8080`

## Environment Variables

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_SUPABASE_PROJECT_ID=your-project-id
```

## Production Deployment

### Option 1: Self-Hosting with Docker

Create a `Dockerfile`:
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Create `nginx.conf`:
```nginx
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    server {
        listen 80;
        server_name _;
        root /usr/share/nginx/html;
        index index.html;

        location / {
            try_files $uri $uri/ /index.html;
        }

        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

Build and run:
```bash
docker build -t smart-suite .
docker run -p 80:80 smart-suite
```

### Option 2: Static Hosting (Vercel, Netlify, etc.)

```bash
# Build production bundle
npm run build

# The dist/ folder contains static files to deploy
```

### Option 3: VPS/Cloud Server

1. **Build the application:**
```bash
npm run build
```

2. **Upload dist/ folder to your server**

3. **Configure Nginx:**
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/smart-suite;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

4. **SSL with Let's Encrypt:**
```bash
sudo certbot --nginx -d your-domain.com
```

## Supabase Backend Setup

### Option 1: Use Existing Lovable Cloud (Recommended)
- Your backend is already configured via Lovable Cloud
- Edge functions are automatically deployed

### Option 2: Self-Hosted Supabase

1. **Install Supabase CLI:**
```bash
npm install -g supabase
```

2. **Start local Supabase:**
```bash
supabase start
```

3. **Apply migrations:**
```bash
supabase db push
```

4. **Deploy Edge Functions:**
```bash
supabase functions deploy
```

### Option 3: New Supabase Project

1. Create project at https://supabase.com
2. Run migrations from `supabase/migrations/` folder
3. Update `.env` with new credentials
4. Deploy edge functions

## Changing Public IP / Domain

1. Update `.env` file with new Supabase URL if applicable
2. Update CORS settings in Supabase dashboard
3. Rebuild the application:
```bash
npm run build
```

## Troubleshooting

### Common Issues

1. **CORS Errors**: Add your new domain to Supabase CORS settings
2. **Auth Redirect Issues**: Update redirect URLs in Supabase Auth settings
3. **Edge Function Errors**: Check function logs in Supabase dashboard

