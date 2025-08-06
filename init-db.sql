-- Инициализация базы данных для системы мониторинга лошадей
-- Этот файл автоматически выполняется при первом запуске PostgreSQL контейнера

-- Создание расширений
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Создание таблицы сессий для express-session
CREATE TABLE IF NOT EXISTS "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL
) WITH (OIDS=FALSE);

ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX "IDX_session_expire" ON "session" ("expire");

-- Предоставление прав
GRANT ALL PRIVILEGES ON DATABASE horse_tracker TO postgres;
GRANT ALL ON SCHEMA public TO postgres;