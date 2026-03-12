import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';

import { CreateLanguageDto } from './dto/create-language.dto';
import { UpdateLanguageDto } from './dto/update-language.dto';
import { LanguagesService } from './languages.service';

@Controller('admin/languages')
export class LanguagesController {
  constructor(private readonly languagesService: LanguagesService) {}

  @Get()
  findAll() {
    return this.languagesService.findAll();
  }

  @Post()
  create(@Body() dto: CreateLanguageDto) {
    return this.languagesService.create(dto);
  }

  @Patch(':code')
  update(@Param('code') code: string, @Body() dto: UpdateLanguageDto) {
    return this.languagesService.update(code, dto);
  }
}
