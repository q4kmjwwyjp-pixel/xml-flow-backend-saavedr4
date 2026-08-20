import { Test, TestingModule } from '@nestjs/testing';
import { XmlController } from './xml.controller';
import { XmlService } from './xml.service';

describe('XmlController', () => {
  let controller: XmlController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [XmlController],
      providers: [XmlService],
    }).compile();

    controller = module.get<XmlController>(XmlController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
