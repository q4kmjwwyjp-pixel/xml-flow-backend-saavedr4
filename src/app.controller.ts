import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  getHealth() {
    const ahoraMx = new Date(
      new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' }),
    );
    const hora = ahoraMx.getHours();
    const enHorario = hora >= 8 && hora < 19;

    return {
      status: 'ok',
      servicio: 'XML FLOW Backend',
      zonaHoraria: 'America/Mexico_City',
      horaActual: ahoraMx.toTimeString().slice(0, 8),
      horarioOperacion: '08:00 - 19:00',
      enHorarioLaboral: enHorario,
    };
  }
}
