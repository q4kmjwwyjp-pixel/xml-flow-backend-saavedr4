/*
  Warnings:

  - The primary key for the `FacturaXML` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `FacturaXML` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `PagoProgramado` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `PagoProgramado` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `Proveedor` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `Proveedor` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `Users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `Users` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[email]` on the table `Users` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `proveedorId` on the `FacturaXML` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `facturaId` on the `PagoProgramado` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "FacturaXML" DROP CONSTRAINT "FacturaXML_proveedorId_fkey";

-- DropForeignKey
ALTER TABLE "PagoProgramado" DROP CONSTRAINT "PagoProgramado_facturaId_fkey";

-- AlterTable
ALTER TABLE "FacturaXML" DROP CONSTRAINT "FacturaXML_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "proveedorId",
ADD COLUMN     "proveedorId" INTEGER NOT NULL,
ADD CONSTRAINT "FacturaXML_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "PagoProgramado" DROP CONSTRAINT "PagoProgramado_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "facturaId",
ADD COLUMN     "facturaId" INTEGER NOT NULL,
ADD CONSTRAINT "PagoProgramado_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Proveedor" DROP CONSTRAINT "Proveedor_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "Proveedor_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Users" DROP CONSTRAINT "Users_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "Users_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE UNIQUE INDEX "PagoProgramado_facturaId_key" ON "PagoProgramado"("facturaId");

-- CreateIndex
CREATE UNIQUE INDEX "Users_email_key" ON "Users"("email");

-- AddForeignKey
ALTER TABLE "FacturaXML" ADD CONSTRAINT "FacturaXML_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoProgramado" ADD CONSTRAINT "PagoProgramado_facturaId_fkey" FOREIGN KEY ("facturaId") REFERENCES "FacturaXML"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
