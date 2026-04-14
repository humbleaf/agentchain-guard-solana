import { Module } from '@nestjs/common';
import { IntentController } from './intent.controller';
import { IntentService } from './intent.service';
import { PolicyModule } from '../policy/policy.module';
import { ReceiptModule } from '../receipt/receipt.module';

@Module({
    imports: [PolicyModule, ReceiptModule],
    controllers: [IntentController],
    providers: [IntentService],
    exports: [IntentService],
})
export class IntentModule {}
