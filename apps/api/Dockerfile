FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /api
COPY package.json package-lock.json* ./
RUN npm ci

FROM base AS builder
WORKDIR /api
COPY --from=deps /api/node_modules ./node_modules
COPY . .

FROM base AS runner
WORKDIR /api
ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 expressjs

COPY --from=builder /api ./

USER expressjs

EXPOSE 4000
ENV PORT 4000

CMD ["npm", "start"]
