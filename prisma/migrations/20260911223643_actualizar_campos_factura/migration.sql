/*
  Warnings:

  - You are about to drop the column `motivoRechazo` on the `FacturaXML` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "FacturaXML" DROP COLUMN "motivoRechazo",
ALTER COLUMN "diasCredito" DROP NOT NULL,
ALTER COLUMN "diasCredito" DROP DEFAULT;
