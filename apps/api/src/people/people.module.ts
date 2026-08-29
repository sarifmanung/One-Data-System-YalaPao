import { Module } from '@nestjs/common';
import { PlatformModule } from '../platform/platform.module';
import { PeopleController } from './people.controller';
import { PeopleService } from './people.service';
import { PeopleSyncService } from './people-sync.service';
import { SpecialMasterDataClient } from './special-master-data.client';

@Module({
  imports: [PlatformModule],
  controllers: [PeopleController],
  providers: [PeopleService, PeopleSyncService, SpecialMasterDataClient],
})
export class PeopleModule {}
