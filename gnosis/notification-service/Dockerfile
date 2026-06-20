FROM node:22-alpine
WORKDIR /app
RUN apk upgrade --no-cache
RUN npm install prom-client --no-save
WORKDIR /app/notification-service
COPY notification-service/package*.json ./
RUN npm install --production
WORKDIR /app
COPY common ./common
COPY notification-service/. ./notification-service
RUN chown -R node:node /app
WORKDIR /app/notification-service
USER node
EXPOSE 3006
CMD ["node", "server.js"]
