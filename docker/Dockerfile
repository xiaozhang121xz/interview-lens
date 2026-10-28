FROM node:20-bookworm-slim AS builder

WORKDIR /app
ENV NODE_ENV=production
ENV NODE_OPTIONS=--max-old-space-size=4096
ENV PROJECT_TABLE_PREFIX=talkagent
ENV DATABASE_URL=mongodb://127.0.0.1:27017/talkagent
ENV JWT_SECRET=build-only-jwt-secret-change-at-runtime-000000
ENV REFRESH_SECRET=build-only-refresh-secret-change-runtime-000
ENV VERIFICATION_CODE_SECRET=build-only-code-secret-change-runtime-00000
ENV AI_API_KEY=dummy-key-for-build

COPY package*.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build

FROM node:20-bookworm-slim AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000
CMD ["npm", "start"]
