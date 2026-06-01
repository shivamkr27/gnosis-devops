FROM node:18-alpine
WORKDIR /app/auth-service
COPY auth-service/package*.json ./
RUN npm install --production
WORKDIR /app
COPY common ./common
COPY auth-service/. ./auth-service
WORKDIR /app/auth-service
EXPOSE 3001
CMD ["node", "server.js"]
