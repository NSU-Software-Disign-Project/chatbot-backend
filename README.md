# HTTP server for chat-bot editor

### Запуск локально:

1. Склонируйте этот репозиторий себе удобным для вас способом, например:

```bash
git clone git@github.com:NSU-Software-Disign-Project/chatbot-backend.git
```

2. В ту же директорию склонируйте репозиторий фронтенда удобным для вас способом, например:

```bash
git clone git@github.com:NSU-Software-Disign-Project/chatbot-frontend.git
```

3. Перейдите в `chatbot-backend`
4. Запустите docker daemon на своём устройстве.
5. Выполните команду `docker-compose up -d`
6. Сайт доступен в браузере по адресу localhost
7. Остановить контейнеры командой `docker-compose down`
8. Для внесения изменений в конфигурацию запуска, создайте `.env` файл со следующей структурой: 

NODE_ENV= \
CADDY_HTTP_PORT= \
CADDY_HTTPS_PORT= \
FRONTEND_URL= \
BACKEND_URL=