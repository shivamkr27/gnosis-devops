FROM node:22-alpine
WORKDIR /app
RUN apk upgrade --no-cache
RUN npm install prom-client --no-save
WORKDIR /app/content-service
COPY content-service/package*.json ./
RUN npm install --production
WORKDIR /app
COPY common ./common
COPY content-service/. ./content-service
RUN chown -R node:node /app
WORKDIR /app/content-service
USER node
EXPOSE 3002
CMD ["node", "server.js"]
