FROM node:22-alpine
WORKDIR /app
RUN apk upgrade --no-cache
RUN npm install prom-client --no-save
WORKDIR /app/api-gateway
COPY api-gateway/package*.json ./
RUN npm install --production
WORKDIR /app
COPY common ./common
COPY api-gateway/. ./api-gateway
RUN chown -R node:node /app
WORKDIR /app/api-gateway
USER node
EXPOSE 3000
CMD ["node", "server.js"]
