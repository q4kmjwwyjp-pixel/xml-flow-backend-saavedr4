export class CreateProveedorDto {
  codigoProveedor?: string;
  rfc!: string;
  nombre!: string;
  regimenFiscal!: string;
  diasCredito?: number | null;
}
