FROM node:20-bookworm-slim AS builder

WORKDIR /usr/src/app

# Baked into the static client bundle by `vite build` — must be build-args,
# not runtime env, since import.meta.env.VITE_* is inlined at build time.
ARG VITE_APP_VERSION
ARG VITE_OPENOBSERVE_APP_ID
ARG VITE_OPENOBSERVE_CLIENT_TOKEN
ARG VITE_OPENOBSERVE_ORG
ARG VITE_OPENOBSERVE_SITE
ENV VITE_APP_VERSION=$VITE_APP_VERSION
ENV VITE_OPENOBSERVE_APP_ID=$VITE_OPENOBSERVE_APP_ID
ENV VITE_OPENOBSERVE_CLIENT_TOKEN=$VITE_OPENOBSERVE_CLIENT_TOKEN
ENV VITE_OPENOBSERVE_ORG=$VITE_OPENOBSERVE_ORG
ENV VITE_OPENOBSERVE_SITE=$VITE_OPENOBSERVE_SITE

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build
RUN npm prune --omit=dev

FROM node:20-bookworm-slim AS runner

ARG NODE_ENV=production
ENV NODE_ENV=$NODE_ENV
WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/config ./config
# For `npx sequelize-cli db:migrate` / `db:seed` from this image (compose `migrate` service).
COPY --from=builder /usr/src/app/.sequelizerc ./.sequelizerc
COPY --from=builder /usr/src/app/migrations ./migrations
COPY --from=builder /usr/src/app/seeders ./seeders

EXPOSE 9000

CMD ["node", "-r", "./dist/server/instrumentation.js", "dist/server/index.js"]
