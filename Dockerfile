FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/shared ./shared
COPY --from=build /app/scripts/feedback-report.ts ./scripts/feedback-report.ts
RUN mkdir -p /app/data /app/artifacts && chown node:node /app/data /app/artifacts
USER node
EXPOSE 3001
CMD ["node", "--import", "tsx", "server/index.ts"]
