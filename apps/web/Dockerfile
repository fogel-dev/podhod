FROM node:22.20.0-alpine AS build
WORKDIR /src
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
RUN npm install --global npm@11.6.1 && npm ci
COPY apps/web/ apps/web/
RUN npm run build

FROM nginxinc/nginx-unprivileged:stable-alpine
ENV API_UPSTREAM=http://api:8080
COPY apps/web/nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /src/apps/web/dist /usr/share/nginx/html
EXPOSE 8080
