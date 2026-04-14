import { Module } from '@nestjs/common';
import { GuardConfigController } from './guard-config.controller';
import { GuardConfigService } from './guard-config.service';

@Module({
    controllers: [GuardConfigController],
    providers: [GuardConfigService],
})
export class GuardConfigModule {}
