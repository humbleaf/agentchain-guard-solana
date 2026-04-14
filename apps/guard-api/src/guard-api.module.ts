import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { SolanaModule } from './solana/solana.module';
import { HealthModule } from './health/health.module';
import { IntentModule } from './intent/intent.module';
import { PolicyModule } from './policy/policy.module';
import { ReceiptModule } from './receipt/receipt.module';
import { ApprovalModule } from './approval/approval.module';
import { GuardConfigModule } from './config/guard-config.module';

/**
 * GuardApiModule — Root module for the AgentChain Guard API.
 *
 * Single-process architecture: policy engine + Solana RPC + REST.
 * Modeled on the monorepo GatewayModule pattern.
 */
@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ['.env.local', '.env', '../../.env'],
        }),
        // ── Infrastructure ──
        PrismaModule,
        SolanaModule,
        // ── API Modules ──
        HealthModule,
        IntentModule,
        PolicyModule,
        ReceiptModule,
        ApprovalModule,
        GuardConfigModule,
    ],
})
export class GuardApiModule {}
