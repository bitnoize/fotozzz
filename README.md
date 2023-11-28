Fotozzz
=======

Запуск в окружении разработчика
-------------------------------

```
cp .app-config.secrets.yml.example .app-config.secrets.yml

npm run build
npm run start
```

Сборка контейнера
-----------------

```
cp .env.example .env
cp docker-compose.override.yml.example docker-compose.override.yml

docker compose build
docker compose up -d
docker compose logs
```


Глобальные задачи
-----------------

* Внедрение [Kysely.js](https://kysely.dev) для генерации SQL запросов
* Преход на [Grammy.js](https://grammy.dev) для взаимодействия с телеграмом
* Темплейты для ответов, handlebars
* Скрипт-воркер для выноса тяжелой логики отдельно от бота

