# ── Étape 1 : build React ────────────────────────────────────────
FROM node:18-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# URL relative → nginx proxie vers le backend (pas de CORS)
ENV REACT_APP_API_BASE_URL=/api/v1
ENV CI=false

RUN npm run build

# ── Étape 2 : servir avec nginx ──────────────────────────────────
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
