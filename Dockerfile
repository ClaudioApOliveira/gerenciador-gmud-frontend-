FROM oven/bun:1.2.15-alpine AS build

WORKDIR /app

ARG VITE_API_BASE_URL=https://api-vortexcodetech.com.br/api/v1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

RUN bun run build

# Stage de Produção com Nginx
FROM nginx:alpine

# Copia os arquivos gerados no build para a pasta padrão do Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Cria uma configuração rápida para o Nginx não dar 404 nas rotas do React
RUN echo 'server { \
    listen 3001; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 3001

# 👇 O comando correto para iniciar o Nginx que configuramos acima
CMD ["nginx", "-g", "daemon off;"]