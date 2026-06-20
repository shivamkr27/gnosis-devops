FROM --platform=linux/amd64 node:22-alpine AS build
WORKDIR /app
RUN apk upgrade --no-cache
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

FROM nginx:1.27-alpine
RUN apk upgrade --no-cache
COPY --from=build /app/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
RUN chown -R nginx:nginx /usr/share/nginx/html /etc/nginx/conf.d
EXPOSE 8080
USER nginx
CMD ["nginx", "-g", "daemon off;"]
