-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('BACKLOG', 'PLAYING', 'COMPLETED', 'DROPPED');

-- CreateTable
CREATE TABLE "user_games" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "game_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "status" "GameStatus" NOT NULL DEFAULT 'BACKLOG',
    "rating" INTEGER,
    "review" TEXT,
    "poster_path" TEXT,
    "backdrop_path" TEXT,
    "platforms" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_game_links" (
    "id" TEXT NOT NULL,
    "game_id" INTEGER NOT NULL,
    "game_title" TEXT NOT NULL,
    "media_type" TEXT NOT NULL,
    "media_id" INTEGER NOT NULL,
    "media_title" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_game_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watch_next_episodes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "show_id" TEXT NOT NULL,
    "show_title" TEXT NOT NULL,
    "tmdb_id" INTEGER NOT NULL,
    "season_number" INTEGER NOT NULL,
    "episode_number" INTEGER NOT NULL,
    "name" TEXT,
    "overview" TEXT,
    "still_path" TEXT,
    "air_date" TEXT,
    "remaining_count" INTEGER NOT NULL DEFAULT 0,
    "last_watched_time" TIMESTAMP(3) NOT NULL,
    "is_new" BOOLEAN NOT NULL DEFAULT false,
    "is_future" BOOLEAN NOT NULL DEFAULT false,
    "days_until" INTEGER NOT NULL DEFAULT 0,
    "total_episodes_watched" INTEGER NOT NULL DEFAULT 0,
    "total_watch_time_minutes" INTEGER NOT NULL DEFAULT 0,
    "is_last_episode_of_last_season" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "watch_next_episodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_games_user_id_game_id_key" ON "user_games"("user_id", "game_id");

-- CreateIndex
CREATE UNIQUE INDEX "media_game_links_game_id_media_type_media_id_key" ON "media_game_links"("game_id", "media_type", "media_id");

-- CreateIndex
CREATE UNIQUE INDEX "watch_next_episodes_user_id_show_id_key" ON "watch_next_episodes"("user_id", "show_id");

-- AddForeignKey
ALTER TABLE "user_games" ADD CONSTRAINT "user_games_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watch_next_episodes" ADD CONSTRAINT "watch_next_episodes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
