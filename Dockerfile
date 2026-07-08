# syntax=docker/dockerfile:1
# Wasaa Music Admin — Next.js 14 (App Router). NEXT_PUBLIC_* baked at build.
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build-time public env (baked into client bundle)
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_IDENTITY_URL
ARG NEXT_PUBLIC_UPSTREAM_ORIGIN
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_IDENTITY_URL=$NEXT_PUBLIC_IDENTITY_URL \
    NEXT_PUBLIC_UPSTREAM_ORIGIN=$NEXT_PUBLIC_UPSTREAM_ORIGIN \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=4003 NEXT_TELEMETRY_DISABLED=1
# carry upstream origin to runtime (next.config rewrites read it server-side)
ARG NEXT_PUBLIC_UPSTREAM_ORIGIN
ENV NEXT_PUBLIC_UPSTREAM_ORIGIN=$NEXT_PUBLIC_UPSTREAM_ORIGIN
COPY --from=build /app/.next ./.next
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/next.config.js ./next.config.js
EXPOSE 4003
CMD ["npm","run","start"]
