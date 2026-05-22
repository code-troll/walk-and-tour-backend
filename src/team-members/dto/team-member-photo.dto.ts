import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class SetTeamMemberPhotoDto {
  @ApiProperty({
    description: 'Media asset UUID to attach as the team member photo.',
    format: 'uuid',
  })
  @IsUUID()
  mediaId!: string;
}
