import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
const bcrypt = require('bcrypt');

@Injectable()
export class AuthService {
  constructor(private readonly prismaService: PrismaService) {}

  async authUser(dataAuth: { email: string; password: string }) {
    const identificador = (dataAuth.email || '').trim().toLowerCase();
    const password = dataAuth.password || '';

    // Permitir ingresar solo "admin" o "daniela", o bien el correo completo
    const emailBusqueda =
      identificador === 'admin'
        ? 'admin@xmlflow.com'
        : identificador === 'daniela'
          ? 'daniela@xmlflow.com'
          : identificador;

    const user = await this.prismaService.users.findFirst({
      where: {
        OR: [
          { email: { equals: emailBusqueda, mode: 'insensitive' } },
          { email: { equals: identificador, mode: 'insensitive' } },
          { name: { equals: identificador, mode: 'insensitive' } },
        ],
      },
    });

    if (!user) {
      throw new BadRequestException('Usuario no encontrado');
    }

    const esValido = await bcrypt.compare(password, user.password);

    if (!esValido) {
      throw new UnauthorizedException('Error de credenciales');
    }

    const emailLower = user.email.toLowerCase();
    const esAdmin =
      emailLower.startsWith('admin') ||
      user.name.toLowerCase().includes('admin');

    return {
      authenticated: true,
      usuario: esAdmin ? 'admin' : 'daniela',
      nombre: esAdmin ? 'Administrador' : 'Daniela',
      email: user.email,
      rol: esAdmin ? 'admin' : 'operador',
    };
  }
}
