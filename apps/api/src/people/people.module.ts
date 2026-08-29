import { Module } from '@nestjs/common';
import { PlatformModule } from '../platform/platform.module';
import { PeopleController } from './people.controller';
import { PeopleService } from './people.service';

@Module({
  imports: [PlatformModule],
  controllers: [PeopleController],
  providers: [PeopleService],
})
export class PeopleModule {}
