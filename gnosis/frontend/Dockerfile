FROM node:22-alpine AS build
WORKDIR /app

COPY package.json ./
RUN npm install

ENV VITE_API_URL=/api
ENV VITE_SOCKET_URL=

COPY index.html ./index.html
COPY vite.config.js ./vite.config.js
COPY postcss.config.js ./postcss.config.js
COPY tailwind.config.js ./tailwind.config.js
COPY public ./public
COPY src ./src

RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]