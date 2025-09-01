# Базовый официальный образ n8n
FROM n8nio/n8n:latest

# Доставляем ffmpeg внутрь контейнера
USER root
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg \
  && rm -rf /var/lib/apt/lists/*

# обратно под node (так требует n8n)
USER node

# n8n слушает 5678; Railway сам пробросит внешний порт
EXPOSE 5678
