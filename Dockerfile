# ── Étape 1 : build React ────────────────────────────────────────
FROM node:18-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# .env.production fournit REACT_APP_API_BASE_URL=https://rsc-production.up.railway.app/api/v1
ENV CI=false

RUN npm run build

# ── Étape 2 : servir avec nginx ──────────────────────────────────
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/templates/default.conf.template

# envsubst remplace $PORT dans le template puis démarre nginx
ENV PORT=80
EXPOSE 80
CMD ["/bin/sh", "-c", "envsubst '${PORT}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
