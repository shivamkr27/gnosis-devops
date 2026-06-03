FROM node:18-alpine
WORKDIR /app
RUN npm install prom-client --no-save
WORKDIR /app/progress-service
COPY progress-service/package*.json ./
RUN npm install --production
WORKDIR /app
COPY common ./common
COPY progress-service/. ./progress-service
RUN chown -R node:node /app
WORKDIR /app/progress-service
USER node
EXPOSE 3003
CMD ["node", "server.js"]
