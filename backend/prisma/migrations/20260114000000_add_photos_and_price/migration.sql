-- Add pricePerHour to Resource
ALTER TABLE "Resource" ADD COLUMN "pricePerHour" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Create ResourcePhoto table
CREATE TABLE "ResourcePhoto" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "isCover" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ResourcePhoto_pkey" PRIMARY KEY ("id")
);

-- Index for fast photo lookups by resource
CREATE INDEX "ResourcePhoto_resourceId_isCover_idx" ON "ResourcePhoto"("resourceId", "isCover");

-- Foreign key
ALTER TABLE "ResourcePhoto" ADD CONSTRAINT "ResourcePhoto_resourceId_fkey"
    FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
