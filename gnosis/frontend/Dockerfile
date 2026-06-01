FROM node:22-alpine AS build
WORKDIR /app
COPY frontend/package.json ./
RUN npm install
ENV VITE_API_URL=/api
ENV VITE_SOCKET_URL=
COPY frontend/index.html ./index.html
COPY frontend/vite.config.js ./vite.config.js
COPY frontend/postcss.config.js ./postcss.config.js
COPY frontend/tailwind.config.js ./tailwind.config.js
COPY frontend/public ./public
COPY frontend/src ./src
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
