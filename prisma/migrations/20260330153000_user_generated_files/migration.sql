CREATE TABLE "user_generated_files" (
  "id" TEXT NOT NULL,
  "owner_session_id" TEXT NOT NULL,
  "job_id" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "template_id" TEXT,
  "template_name" TEXT,
  "available_formats" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "user_generated_files_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_generated_files_job_id_key" ON "user_generated_files"("job_id");
CREATE INDEX "idx_user_generated_files_owner_created_at" ON "user_generated_files"("owner_session_id", "created_at" DESC);
CREATE INDEX "idx_user_generated_files_owner_expires_at" ON "user_generated_files"("owner_session_id", "expires_at");