import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LanguageEntity } from '../languages/language.entity';
import { TeamMembersModule } from '../team-members/team-members.module';
import { TourEntity } from '../tours/entities/tour.entity';
import { EventDayNoteEntity } from './entities/event-day-note.entity';
import { EventOccurrenceEntity } from './entities/event-occurrence.entity';
import { EventEntity } from './entities/event.entity';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EventEntity,
      EventOccurrenceEntity,
      EventDayNoteEntity,
      TourEntity,
      LanguageEntity,
    ]),
    TeamMembersModule,
  ],
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}
