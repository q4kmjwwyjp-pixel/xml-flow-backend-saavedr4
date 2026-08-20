import { Injectable } from '@nestjs/common';
import { CreateXmlDto } from './dto/create-xml.dto';
import { UpdateXmlDto } from './dto/update-xml.dto';

@Injectable()
export class XmlService {
  create(createXmlDto: CreateXmlDto) {
    return 'This action adds a new xml';
  }

  findAll() {
    return `This action returns all xml`;
  }

  findOne(id: number) {
    return `This action returns a #${id} xml`;
  }

  update(id: number, updateXmlDto: UpdateXmlDto) {
    return `This action updates a #${id} xml`;
  }

  remove(id: number) {
    return `This action removes a #${id} xml`;
  }
}
