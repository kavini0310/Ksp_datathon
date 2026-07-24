# --- Stage 1: Build React Frontend ---
FROM node:24-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# --- Stage 2: Package Node.js Backend & Serve ---
FROM node:24-alpine
WORKDIR /app
COPY server/package*.json ./server/
RUN npm install --prefix server
COPY server/ ./server/

# Copy client build to server static folder
COPY --from=client-builder /app/client/dist ./client/dist

ENV PORT=5000
ENV NODE_ENV=production
EXPOSE 5000

CMD ["node", "server/server.js"]
