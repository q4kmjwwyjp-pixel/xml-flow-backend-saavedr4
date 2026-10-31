import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Request, Response, NextFunction } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Control de horario laboral (8:00 AM a 7:00 PM hora CDMX) cuando corre en la nube (Render)
  // para ahorrar horas de servicio y restringir actividad fuera de horario laboral.
  app.use((req: Request, res: Response, next: NextFunction) => {
    const esProduccionNube =
      process.env.RENDER === 'true' ||
      process.env.RESTRINGIR_HORARIO === 'true';

    if (!esProduccionNube || req.method === 'OPTIONS') {
      return next();
    }

    const zonaHoraria = process.env.TZ_HORARIO || 'America/Mexico_City';
    const horaInicio = Number(process.env.HORA_INICIO ?? 8); // 8:00 AM
    const horaFin = Number(process.env.HORA_FIN ?? 19); // 7:00 PM (19:00 hrs)

    const ahoraMx = new Date(
      new Date().toLocaleString('en-US', { timeZone: zonaHoraria }),
    );
    const horaActual = ahoraMx.getHours();

    if (horaActual < horaInicio || horaActual >= horaFin) {
      return res.status(503).json({
        statusCode: 503,
        message:
          'El servidor de XML FLOW se encuentra en modo ahorro nocturno. Horario de servicio activo: 8:00 AM a 7:00 PM.',
        horarioActivo: '08:00 AM - 07:00 PM',
        horaServidor: ahoraMx.toTimeString().slice(0, 5),
      });
    }

    next();
  });

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
}
bootstrap();
