# Базовый официальный образ n8n (Alpine)
FROM n8nio/n8n:latest

# Переключаемся в root для установки пакетов
USER root

# Устанавливаем ffmpeg через apk (Alpine Linux)
RUN apk add --no-cache ffmpeg

# Возвращаемся к пользователю node
USER node

EXPOSE 5678
