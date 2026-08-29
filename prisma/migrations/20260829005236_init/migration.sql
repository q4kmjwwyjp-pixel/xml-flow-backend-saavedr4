-- CreateTable
CREATE TABLE "Proveedor" (
    "id" TEXT NOT NULL,
    "rfc" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "regimenFiscal" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Proveedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacturaXML" (
    "id" TEXT NOT NULL,
    "uuid" TEXT NOT NULL,
    "serie" TEXT,
    "folio" TEXT,
    "fechaEmision" TIMESTAMP(3) NOT NULL,
    "subTotal" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "metodoPago" TEXT NOT NULL,
    "formaPago" TEXT,
    "usoCfdi" TEXT NOT NULL,
    "regimenReceptor" TEXT NOT NULL,
    "condicionesPago" TEXT,
    "diasCredito" INTEGER NOT NULL DEFAULT 0,
    "estadoValidacion" TEXT NOT NULL,
    "motivoRechazo" TEXT,
    "proveedorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FacturaXML_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PagoProgramado" (
    "id" TEXT NOT NULL,
    "facturaId" TEXT NOT NULL,
    "fechaEstimadaPago" TIMESTAMP(3) NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "estatusPago" TEXT NOT NULL DEFAULT 'Pendiente',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PagoProgramado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Proveedor_rfc_key" ON "Proveedor"("rfc");

-- CreateIndex
CREATE UNIQUE INDEX "FacturaXML_uuid_key" ON "FacturaXML"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "PagoProgramado_facturaId_key" ON "PagoProgramado"("facturaId");

-- AddForeignKey
ALTER TABLE "FacturaXML" ADD CONSTRAINT "FacturaXML_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoProgramado" ADD CONSTRAINT "PagoProgramado_facturaId_fkey" FOREIGN KEY ("facturaId") REFERENCES "FacturaXML"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
