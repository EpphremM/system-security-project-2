-- CreateEnum
CREATE TYPE "AttributeType" AS ENUM ('USER', 'RESOURCE', 'ENVIRONMENT', 'COMPOSITE');

-- CreateEnum
CREATE TYPE "AttributeCategory" AS ENUM ('IDENTITY', 'EMPLOYMENT', 'SECURITY', 'CLASSIFICATION', 'METADATA', 'ENVIRONMENT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ValueType" AS ENUM ('STRING', 'NUMBER', 'BOOLEAN', 'DATE', 'DATETIME', 'ENUM', 'JSON');

-- CreateTable
CREATE TABLE "attribute_definitions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "attributeType" "AttributeType" NOT NULL,
    "category" "AttributeCategory" NOT NULL,
    "valueType" "ValueType" NOT NULL,
    "allowedValues" TEXT[],
    "defaultValue" TEXT,
    "minValue" TEXT,
    "maxValue" TEXT,
    "pattern" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attribute_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_attributes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "attributeId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "source" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_attributes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_attributes" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "attributeId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "source" TEXT,
    "calculated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resource_attributes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "attribute_definitions_name_key" ON "attribute_definitions"("name");

-- CreateIndex
CREATE INDEX "attribute_definitions_attributeType_idx" ON "attribute_definitions"("attributeType");

-- CreateIndex
CREATE INDEX "attribute_definitions_category_idx" ON "attribute_definitions"("category");

-- CreateIndex
CREATE INDEX "attribute_definitions_enabled_idx" ON "attribute_definitions"("enabled");

-- CreateIndex
CREATE INDEX "user_attributes_userId_idx" ON "user_attributes"("userId");

-- CreateIndex
CREATE INDEX "user_attributes_attributeId_idx" ON "user_attributes"("attributeId");

-- CreateIndex
CREATE INDEX "user_attributes_expiresAt_idx" ON "user_attributes"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_attributes_userId_attributeId_key" ON "user_attributes"("userId", "attributeId");

-- CreateIndex
CREATE INDEX "resource_attributes_resourceId_idx" ON "resource_attributes"("resourceId");

-- CreateIndex
CREATE INDEX "resource_attributes_attributeId_idx" ON "resource_attributes"("attributeId");

-- CreateIndex
CREATE UNIQUE INDEX "resource_attributes_resourceId_attributeId_key" ON "resource_attributes"("resourceId", "attributeId");

-- AddForeignKey
ALTER TABLE "user_attributes" ADD CONSTRAINT "user_attributes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_attributes" ADD CONSTRAINT "user_attributes_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "attribute_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_attributes" ADD CONSTRAINT "resource_attributes_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_attributes" ADD CONSTRAINT "resource_attributes_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "attribute_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
