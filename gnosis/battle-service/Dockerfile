FROM node:18-alpine
WORKDIR /app
RUN npm install prom-client --no-save
WORKDIR /app/battle-service
COPY battle-service/package*.json ./
RUN npm install --production
WORKDIR /app
COPY common ./common
COPY battle-service/. ./battle-service
RUN chown -R node:node /app
WORKDIR /app/battle-service
USER node
EXPOSE 3005
CMD ["node", "server.js"]
