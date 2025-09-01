# Базовый образ n8n
FROM n8nio/n8n:1.49.1

# Устанавливаем ffmpeg
USER root
RUN apk add --no-cache ffmpeg

# Возвращаемся к пользователю node
USER node

EXPOSE 5678
