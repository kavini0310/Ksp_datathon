# Zoho Catalyst Deployment Guide - KSP Crime Intelligence Platform

This guide outlines how to deploy the "KSP Crime Intelligence & Predictive Analytics Platform" to **Zoho Catalyst** using **AppSail**.

AppSail is Zoho Catalyst’s Platform-as-a-Service (PaaS) solution, perfect for hosting full-stack applications with dynamic backends (Node.js/Express) and frontend bundles (React).

---

## Method 1: AppSail Custom Runtime (Docker) — RECOMMENDED

Since our project contains a fully optimized multi-stage `Dockerfile` (which builds the React frontend and compiles it into the Express serving static path), this is the cleanest, zero-configuration method.

### Steps to Deploy:
1. **Push Changes to GitHub:**
   Ensure the latest commits (including the Zoho Catalyst changes and `app-config.json`) are pushed to your GitHub repository:
   ```bash
   git add .
   git commit -m "Configure Zoho Catalyst AppSail configurations"
   git push origin main
   ```

2. **Create AppSail Service in Zoho Console:**
   * Go to the [Zoho Catalyst Console](https://console.catalyst.zoho.com/).
   * Select your project (or create a new Datathon project).
   * In the left sidebar under **Compute**, select **AppSail**.
   * Click **Create AppSail Service**.

3. **Configure Service Details:**
   * **Service Name:** `ksp-crime-intel`
   * **Runtime:** Select **Custom Runtime (Docker)**.
   * **Deployment Source:** Choose **GitHub**.
   * Link your repository: `kavini0310/Ksp_datathon` and select the `main` branch.

4. **Environment Configuration:**
   * Catalyst AppSail will automatically detect the root `Dockerfile` and start building the container.
   * Under **Environment Variables**, configure:
     * `NODE_ENV`: `production`
     * `JWT_SECRET`: `ksp-intel-secure-secret-key-2026`
   * Expose Port: **5000** (or keep the default. The Express server automatically binds to Catalyst's default listener variable `X_ZOHO_CATALYST_LISTEN_PORT`).

5. **Deploy:**
   * Click **Deploy**. Catalyst will pull the code, run the multi-stage Docker build, and deploy the application. It will provide a secure HTTPS domain (e.g. `ksp-crime-intel.catalystserverless.com`) once finished!

---

## Method 2: AppSail Managed NodeJS Runtime (CLI)

If you prefer to deploy using the Zoho Catalyst CLI directly from your terminal.

### Steps to Deploy:
1. **Install Zoho Catalyst CLI:**
   ```bash
   npm install -g zcatalyst-cli
   ```

2. **Authenticate with Zoho:**
   ```bash
   catalyst login
   ```

3. **Initialize Catalyst Project in the folder:**
   ```bash
   catalyst init
   ```
   * Select your active Zoho project.
   * Choose **AppSail** when prompted for features.
   * Name your service `ksp-crime-intel`.
   * Select **Node.js 20** as the stack.

4. **Build Frontend Locally:**
   Before deploying, compile your React client assets so they are ready inside the server's static search path:
   ```bash
   npm run build --prefix client
   ```

5. **Deploy App:**
   Deploy the code using the prepared `app-config.json` at the root:
   ```bash
   catalyst deploy
   ```
   * AppSail will package the files, upload them to Zoho's serverless nodes, and output the production deployment URL.
