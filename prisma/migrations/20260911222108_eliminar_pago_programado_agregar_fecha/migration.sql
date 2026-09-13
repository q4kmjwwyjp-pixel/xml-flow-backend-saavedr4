/*
  Warnings:

  - You are about to drop the `PagoProgramado` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "PagoProgramado" DROP CONSTRAINT "PagoProgramado_facturaId_fkey";

-- AlterTable
ALTER TABLE "FacturaXML" ADD COLUMN     "fechaEstimadaPago" TIMESTAMP(3),
ALTER COLUMN "diasCredito" SET DEFAULT 30;

-- DropTable
DROP TABLE "PagoProgramado";
