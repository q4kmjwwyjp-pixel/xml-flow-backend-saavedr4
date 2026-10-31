import { PartialType } from '@nestjs/mapped-types';
import { CreateXmlDto } from './create-xml.dto';

export class UpdateXmlDto extends PartialType(CreateXmlDto) {
  estado?: 'pagado' | 'pendiente' | 'vencido';
  folioContrarrecibo?: string | null;
  fechaEstimadaPago?: string | null;
  diasCredito?: number | null;
}
