# VPS Deployment Guide

This guide will help you deploy your Grow application to a VPS using Docker.

## Prerequisites

- VPS with Docker and Docker Compose installed
- Domain name (optional but recommended)
- SSH access to your VPS

## Step 1: Prepare Your VPS

### Install Docker and Docker Compose

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout and login again for group changes to take effect
```

## Step 2: Set Up Environment Variables

Create a `.env` file on your VPS:

```bash
# Create .env file
nano .env
```

Add your environment variables:

```env
# API Credentials
OUTBRAIN_TOKEN=your_actual_outbrain_token
TABOOLA_CLIENT_ID=your_actual_taboola_client_id
TABOOLA_CLIENT_SECRET=your_actual_taboola_client_secret
TABOOLA_ACCOUNT_ID=your_actual_taboola_account_id
ADUP_CLIENT_ID=your_actual_adup_client_id
ADUP_CLIENT_SECRET=your_actual_adup_client_secret
CHECKOUT_CHAMP_USERNAME=your_actual_checkout_champ_username
CHECKOUT_CHAMP_PASSWORD=your_actual_checkout_champ_password

# Optional
FOREX_API=your_actual_forex_api_key
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

## Step 3: Deploy Your Application

### Option A: Using Docker Compose (Recommended)

1. **Upload your project files to VPS:**
   ```bash
   # On your local machine
   scp -r . user@your-vps-ip:/home/user/grow
   ```

2. **SSH into your VPS:**
   ```bash
   ssh user@your-vps-ip
   cd /home/user/grow
   ```

3. **Build and run with Docker Compose:**
   ```bash
   # Build and start the application
   docker-compose up -d --build
   
   # Check logs
   docker-compose logs -f
   
   # Check status
   docker-compose ps
   ```

### Option B: Using Docker directly

```bash
# Build the image
docker build -t grow-app .

# Run the container
docker run -d \
  --name grow-app \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file .env \
  grow-app
```

## Step 4: Set Up Reverse Proxy (Optional but Recommended)

### Using Nginx

1. **Install Nginx:**
   ```bash
   sudo apt install nginx
   ```

2. **Create Nginx configuration:**
   ```bash
   sudo nano /etc/nginx/sites-available/grow
   ```

   Add this configuration:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com www.your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

3. **Enable the site:**
   ```bash
   sudo ln -s /etc/nginx/sites-available/grow /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

## Step 5: Set Up SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal
sudo crontab -e
# Add this line:
# 0 12 * * * /usr/bin/certbot renew --quiet
```

## Step 6: Monitoring and Maintenance

### Check Application Status
```bash
# Check if container is running
docker ps

# Check application logs
docker-compose logs -f grow-app

# Check health status
curl http://localhost:3000/api/tokens/status
```

### Update Application
```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose up -d --build
```

### Backup Environment Variables
```bash
# Backup .env file
cp .env .env.backup.$(date +%Y%m%d)
```

## Troubleshooting

### Common Issues

1. **Port already in use:**
   ```bash
   # Check what's using port 3000
   sudo netstat -tulpn | grep :3000
   
   # Kill the process or change port in docker-compose.yml
   ```

2. **Environment variables not working:**
   ```bash
   # Check if .env file exists and has correct format
   cat .env
   
   # Test environment variables in container
   docker exec -it grow-app env | grep OUTBRAIN
   ```

3. **Application not starting:**
   ```bash
   # Check logs
   docker-compose logs grow-app
   
   # Check if all environment variables are set
   docker exec -it grow-app node -e "console.log(process.env.OUTBRAIN_TOKEN ? 'Token set' : 'Token missing')"
   ```

### Performance Optimization

1. **Enable Docker BuildKit:**
   ```bash
   export DOCKER_BUILDKIT=1
   docker-compose build
   ```

2. **Use multi-stage builds** (already implemented in Dockerfile)

3. **Monitor resource usage:**
   ```bash
   docker stats
   ```

## Security Considerations

1. **Keep .env file secure:**
   ```bash
   chmod 600 .env
   ```

2. **Regular updates:**
   ```bash
   # Update base images
   docker-compose pull
   docker-compose up -d
   ```

3. **Firewall setup:**
   ```bash
   # Allow only necessary ports
   sudo ufw allow 22    # SSH
   sudo ufw allow 80    # HTTP
   sudo ufw allow 443   # HTTPS
   sudo ufw enable
   ```

## Next Steps

- Set up automated deployments with GitHub Actions
- Configure monitoring with tools like Prometheus/Grafana
- Set up automated backups
- Configure log rotation
- Set up CI/CD pipeline

Your application should now be accessible at `http://your-vps-ip:3000` or `https://your-domain.com` if you set up the reverse proxy and SSL. 