# Базовый образ n8n (Alpine)
FROM n8nio/n8n:1.49.1

# Переключаемся в root для установки пакетов
USER root

# Устанавливаем ffmpeg через apk (Alpine Linux)
RUN apk add --no-cache ffmpeg

# Возвращаемся к пользователю node
USER node

EXPOSE 5678
