FROM node:18-alpine
WORKDIR /app/notification-service
COPY notification-service/package*.json ./
RUN npm install --production
WORKDIR /app
COPY common ./common
COPY notification-service/. ./notification-service
WORKDIR /app/notification-service
EXPOSE 3006
CMD ["node", "server.js"]
