# syntax=docker/dockerfile:1
FROM node:22-alpine AS base

FROM base AS basebuilder
RUN apk add --no-cache python3 make g++ py3-pip

FROM basebuilder AS builder
WORKDIR /app
COPY package.json package-lock.json tsconfig.json ./
RUN npm ci
COPY src/ src/
RUN npm run build

FROM basebuilder AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM base
WORKDIR /app
RUN \
  addgroup --system --gid 1001 nodejs && \
  adduser --system --uid 1001 nodejs

COPY --chown=1001:1001 assets/ ./assets
COPY --chown=1001:1001 package.json ./
COPY --chown=1001:1001 --from=deps /app/node_modules ./node_modules
COPY --chown=1001:1001 --from=builder /app/build ./build

USER nodejs
EXPOSE 5001
ENV NODE_ENV=production
ENV IS_DOCKER=true
ARG GIT_VERSION=unknown
ARG GIT_REPO=unknown
ENV GIT_VERSION=$GIT_VERSION
ENV GIT_REPO=$GIT_REPO

CMD ["npm", "run", "start"]