FROM node:18-alpine

# ffmpeg в Alpine ставится через apk
RUN apk add --no-cache ffmpeg

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev

COPY server.js ./

ENV PORT=3000
# можно задать лимит загрузки, см. переменную MAX_FILE_SIZE_MB
CMD ["node", "server.js"]
