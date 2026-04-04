-- DropIndex
DROP INDEX "idx_user_generated_files_owner_created_at";

-- AlterTable
ALTER TABLE "user_api_keys" ADD COLUMN     "expires_at" TIMESTAMPTZ(6),
ALTER COLUMN "ownership_history" SET DEFAULT '[]'::jsonb;

-- AlterTable
ALTER TABLE "user_templates" ALTER COLUMN "fields" SET DEFAULT '[]'::jsonb;

-- CreateIndex
CREATE INDEX "idx_user_generated_files_owner_created_at" ON "user_generated_files"("owner_session_id", "created_at");
