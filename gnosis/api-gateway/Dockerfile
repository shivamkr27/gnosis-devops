FROM node:18-alpine
WORKDIR /app/api-gateway
COPY api-gateway/package*.json ./
RUN npm install --production
WORKDIR /app
COPY common ./common
COPY api-gateway/. ./api-gateway
WORKDIR /app/api-gateway
EXPOSE 3000
CMD ["node", "server.js"]
