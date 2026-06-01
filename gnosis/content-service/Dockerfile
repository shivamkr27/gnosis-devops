FROM node:18-alpine
WORKDIR /app
RUN npm install prom-client --no-save
WORKDIR /app/content-service
COPY content-service/package*.json ./
RUN npm install --production
WORKDIR /app
COPY common ./common
COPY content-service/. ./content-service
WORKDIR /app/content-service
EXPOSE 3002
CMD ["node", "server.js"]
