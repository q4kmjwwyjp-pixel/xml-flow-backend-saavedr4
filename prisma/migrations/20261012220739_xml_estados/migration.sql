-- CreateEnum
CREATE TYPE "XMLEstados" AS ENUM ('pagado', 'pendiente', 'vencido');

-- AlterTable
ALTER TABLE "FacturaXML" ADD COLUMN     "estado" "XMLEstados" NOT NULL DEFAULT 'pendiente';
