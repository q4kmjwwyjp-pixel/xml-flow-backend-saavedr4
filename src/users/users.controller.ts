import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  createUser(@Body() dataUser: {
    name: string,
    email: string,
    password: string
  }) {
    return this.usersService.createUser(dataUser);
  }

  @Get()
  findAllUsers() {
    return this.usersService.findAllUsers();
  }

  @Get(':userId')
  findOneUser(@Param('userId') userId: string) {
    return this.usersService.findOneUser(+userId);
  }
}
