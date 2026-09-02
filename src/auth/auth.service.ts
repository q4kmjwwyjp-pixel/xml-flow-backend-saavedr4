import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { PrismaService } from 'src/prisma/prisma.service';
const bcrypt = require('bcrypt')

@Injectable()
export class AuthService {

  constructor(private readonly prismaService: PrismaService) {}

  async authUser(dataAuth: {
    email: string,
    password: string
  }) {
    const user = await this.prismaService.users.findUnique({
      where: {
        email: dataAuth.email
      }
    })

    if(!user) {
      throw new BadRequestException('Usuario no encontrado')
    }

    const response = await bcrypt.compare(dataAuth.password, user.password)

    if(!response) {
      throw new UnauthorizedException('Error de credenciales')
    }

    return response
  }
}
