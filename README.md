# Student CGPA Calculator (AWS EC2 + S3 Ready)

Full-stack app to calculate and store student CGPA with optional S3 report export.

## Stack
- Frontend: React + Vite
- Backend: Node.js + Express
- Database: MongoDB Atlas (recommended for EC2 deployment)
- Object Storage: AWS S3 (stores JSON report snapshots after each calculation)

## What Was Added For AWS
- Backend S3 integration using `@aws-sdk/client-s3`
- Automatic JSON report upload to S3 after `POST /api/students/calculate`
- `GET /health` now returns S3 status: `{ status: "ok", s3Reporting: true|false }`
- `.env.example` templates for backend/frontend

## Local Run

### 1) Backend
```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

### 2) Frontend
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Environment Variables

### `backend/.env`
```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@<cluster-url>/<db-name>
ALLOWED_ORIGINS=http://<ec2-public-ip>,http://localhost:5173

# Optional but recommended (enables S3 report uploads)
AWS_REGION=ap-south-1
S3_BUCKET_NAME=your-cgpa-reports-bucket
S3_REPORTS_PREFIX=cgpa-reports
AWS_ACCESS_KEY_ID=your-iam-access-key-id
AWS_SECRET_ACCESS_KEY=your-iam-secret-access-key
```

### `frontend/.env`
```env
VITE_API_URL=http://<ec2-public-ip>:5000
```

## API
- `POST /api/students/calculate`: Calculates SGPA/CGPA, stores student in MongoDB, uploads report JSON to S3 (if enabled).
- `GET /api/students`: Returns all saved students.
- `GET /health`: Service health and S3 enabled status.

---

## Step-by-Step: Host On AWS EC2 + Use S3

## A) AWS Setup
1. Create an S3 bucket (example: `cgpa-reports-prod`).
2. In S3 bucket permissions, keep Block Public Access enabled for security.
3. Create IAM user (or role) with minimum S3 permissions on this bucket:
   - `s3:PutObject`
   - `s3:ListBucket`
4. Create an EC2 instance (Ubuntu 22.04, t2.micro/t3.micro for testing).
5. Security group inbound rules:
   - `22` (SSH) from your IP only
   - `80` (HTTP) from `0.0.0.0/0`
   - `443` (HTTPS) from `0.0.0.0/0`
   - optional `5000` for direct backend testing (remove in production)

## B) Connect EC2 And Install Runtime
SSH into instance:
```bash
ssh -i <your-key>.pem ubuntu@<ec2-public-ip>
```

Install Node, npm, nginx, pm2:
```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx git
sudo npm install -g pm2
```

## C) Deploy Backend On EC2
```bash
git clone <your-repo-url>
cd "aws s3 + ec2/backend"
npm install
cp .env.example .env
nano .env
```

Update `.env` with:
- Mongo Atlas connection string
- EC2/domain in `ALLOWED_ORIGINS`
- S3 bucket + IAM credentials

Start backend with PM2:
```bash
pm2 start src/index.js --name cgpa-backend
pm2 save
pm2 startup
```

Verify:
```bash
curl http://localhost:5000/health
```

## D) Deploy Frontend On EC2 (Nginx Static Hosting)
```bash
cd "../frontend"
npm install
cp .env.example .env
nano .env
npm run build
sudo rm -rf /var/www/html/*
sudo cp -r dist/* /var/www/html/
sudo systemctl restart nginx
```

Now open:
- `http://<ec2-public-ip>`

## E) Nginx Reverse Proxy (Recommended)
Serve backend through nginx so frontend uses same host:

Create nginx site config:
```bash
sudo nano /etc/nginx/sites-available/cgpa
```

Paste:
```nginx
server {
    listen 80;
    server_name <your-domain-or-ec2-ip>;

    root /var/www/html;
    index index.html;

    location / {
        try_files $uri /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /health {
        proxy_pass http://127.0.0.1:5000/health;
    }
}
```

Enable and reload:
```bash
sudo ln -s /etc/nginx/sites-available/cgpa /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Then set frontend env as:
```env
VITE_API_URL=
```
If empty, app can be adjusted to use relative path; otherwise keep:
```env
VITE_API_URL=http://<ec2-public-ip>
```

## F) HTTPS (Production)
If using domain:
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d <your-domain>
```

## G) Optional: Host Frontend On S3 (+ CloudFront), Keep Backend On EC2
1. Build frontend locally/EC2: `npm run build`
2. Create another S3 bucket for static site files.
3. Upload `frontend/dist/*` to bucket.
4. Put CloudFront in front of S3.
5. Set `VITE_API_URL=https://<your-backend-domain-or-ec2>`
6. Update backend `ALLOWED_ORIGINS` to include CloudFront domain.

---

## Quick Troubleshooting
- CORS error: check backend `ALLOWED_ORIGINS` exactly matches frontend URL.
- S3 upload not working: verify IAM permissions, region, bucket name, and credentials.
- Backend down after reboot: run `pm2 status` and ensure `pm2 startup` was executed.
- Frontend blank page: rebuild frontend and confirm `VITE_API_URL` is correct before build.
