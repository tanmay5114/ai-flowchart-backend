-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."questions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."answers" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answerText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."visualizations" (
    "id" TEXT NOT NULL,
    "answerId" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "fps" INTEGER NOT NULL DEFAULT 30,
    "metadata" JSONB,

    CONSTRAINT "visualizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."layers" (
    "id" TEXT NOT NULL,
    "visualizationId" TEXT NOT NULL,
    "layerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "props" JSONB NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "layers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."animations" (
    "id" TEXT NOT NULL,
    "layerId" TEXT NOT NULL,
    "property" TEXT NOT NULL,
    "fromValue" JSONB,
    "toValue" JSONB,
    "startTime" INTEGER NOT NULL,
    "endTime" INTEGER NOT NULL,
    "easing" TEXT NOT NULL DEFAULT 'linear',

    CONSTRAINT "animations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "public"."users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "answers_questionId_key" ON "public"."answers"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "visualizations_answerId_key" ON "public"."visualizations"("answerId");

-- CreateIndex
CREATE UNIQUE INDEX "layers_visualizationId_layerId_key" ON "public"."layers"("visualizationId", "layerId");

-- AddForeignKey
ALTER TABLE "public"."questions" ADD CONSTRAINT "questions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."answers" ADD CONSTRAINT "answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "public"."questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."visualizations" ADD CONSTRAINT "visualizations_answerId_fkey" FOREIGN KEY ("answerId") REFERENCES "public"."answers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."layers" ADD CONSTRAINT "layers_visualizationId_fkey" FOREIGN KEY ("visualizationId") REFERENCES "public"."visualizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."animations" ADD CONSTRAINT "animations_layerId_fkey" FOREIGN KEY ("layerId") REFERENCES "public"."layers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
