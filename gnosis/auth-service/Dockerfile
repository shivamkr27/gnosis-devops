FROM node:18-alpine
WORKDIR /app
RUN npm install prom-client --no-save
WORKDIR /app/auth-service
COPY auth-service/package*.json ./
RUN npm install --production
WORKDIR /app
COPY common ./common
COPY auth-service/. ./auth-service
RUN chown -R node:node /app
WORKDIR /app/auth-service
USER node
EXPOSE 3001
CMD ["node", "server.js"]
