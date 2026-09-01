import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';
const bcrypt = require('bcrypt')

@Injectable()
export class UsersService {

  constructor(private readonly prismaService: PrismaService) {}

  async createUser(dataUser: {
    name: string,
    email: string,
    password: string
  }) {
    const encryptedPassword = await bcrypt.hash(dataUser.password, 10)

    return this.prismaService.users.create({
      data: {
        name: dataUser.name,
        email: dataUser.email,
        password: encryptedPassword
      }
    })
  }

  findAllUsers() {
    return this.prismaService.users.findMany()
  }

  findOneUser(userId: number) {
    return this.prismaService.users.findUnique({
      where: {
        id: userId
      }
    })
  }
}
