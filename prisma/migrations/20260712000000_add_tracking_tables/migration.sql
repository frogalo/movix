-- CreateTable
CREATE TABLE "watchlists" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "movieId" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watchlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ratings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "movieId" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tv_shows" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tvdb_id" INTEGER NOT NULL,
    "tmdb_id" INTEGER,
    "imdb_id" TEXT,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'watching',
    "is_favorite" BOOLEAN NOT NULL DEFAULT false,
    "poster_path" TEXT,
    "backdrop_path" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tv_shows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tv_episodes" (
    "id" TEXT NOT NULL,
    "show_id" TEXT NOT NULL,
    "tvdb_id" INTEGER NOT NULL,
    "season_number" INTEGER NOT NULL,
    "episode_number" INTEGER NOT NULL,
    "name" TEXT,
    "is_watched" BOOLEAN NOT NULL DEFAULT false,
    "watched_at" TIMESTAMP(3),
    "rewatch_count" INTEGER NOT NULL DEFAULT 0,
    "vote" TEXT,
    "rating" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tv_episodes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "watchlists_user_id_movieId_key" ON "watchlists"("user_id", "movieId");

-- CreateIndex
CREATE UNIQUE INDEX "ratings_user_id_movieId_key" ON "ratings"("user_id", "movieId");

-- CreateIndex
CREATE UNIQUE INDEX "tv_shows_user_id_tvdb_id_key" ON "tv_shows"("user_id", "tvdb_id");

-- CreateIndex
CREATE UNIQUE INDEX "tv_episodes_show_id_season_number_episode_number_key" ON "tv_episodes"("show_id", "season_number", "episode_number");

-- AddForeignKey
ALTER TABLE "watchlists" ADD CONSTRAINT "watchlists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tv_shows" ADD CONSTRAINT "tv_shows_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tv_episodes" ADD CONSTRAINT "tv_episodes_show_id_fkey" FOREIGN KEY ("show_id") REFERENCES "tv_shows"("id") ON DELETE CASCADE ON UPDATE CASCADE;
