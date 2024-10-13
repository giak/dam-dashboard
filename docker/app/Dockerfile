# Utiliser une image de base plus légère et spécifique à Node.js
FROM node:20-alpine AS deps

# Utiliser PNPM_VERSION pour faciliter les mises à jour
ARG PNPM_VERSION=8.15.1
RUN npm install -g pnpm@$PNPM_VERSION

# Définir le répertoire de travail
WORKDIR /app

# Copier uniquement les fichiers nécessaires pour l'installation
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# Utiliser un utilisateur non-root pour plus de sécurité
USER node

EXPOSE 3000
CMD ["node", "dist/server.js"]
