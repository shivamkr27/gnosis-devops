FROM node:18-alpine
WORKDIR /app/xp-service
COPY xp-service/package*.json ./
RUN npm install --production
WORKDIR /app
COPY common ./common
COPY xp-service/. ./xp-service
WORKDIR /app/xp-service
EXPOSE 3004
CMD ["node", "server.js"]
