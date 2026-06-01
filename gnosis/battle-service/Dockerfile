FROM node:18-alpine
WORKDIR /app/battle-service
COPY battle-service/package*.json ./
RUN npm install --production
WORKDIR /app
COPY common ./common
COPY battle-service/. ./battle-service
WORKDIR /app/battle-service
EXPOSE 3005
CMD ["node", "server.js"]
