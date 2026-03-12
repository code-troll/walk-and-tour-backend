import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';

import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { TagsService } from './tags.service';

@Controller('admin/tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  findAll() {
    return this.tagsService.findAll();
  }

  @Post()
  create(@Body() dto: CreateTagDto) {
    return this.tagsService.create(dto);
  }

  @Patch(':key')
  update(@Param('key') key: string, @Body() dto: UpdateTagDto) {
    return this.tagsService.update(key, dto);
  }
}
