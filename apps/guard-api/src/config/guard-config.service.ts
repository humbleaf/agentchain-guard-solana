import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SolanaService } from '../solana/solana.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GuardConfigService {
    private readonly logger = new Logger(GuardConfigService.name);

    constructor(
        private readonly config: ConfigService,
        private readonly solana: SolanaService,
        private readonly prisma: PrismaService,
    ) {}

    async getConfig() {
        // Read stats from local DB
        const [totalActions, totalSettled, totalDenied, totalPending] = await Promise.all([
            this.prisma.intent.count(),
            this.prisma.intent.count({ where: { status: 'SETTLED' } }),
            this.prisma.intent.count({ where: { status: 'DENIED' } }),
            this.prisma.approvalRequest.count({ where: { status: 'PENDING' } }),
        ]);

        // Read policy config from env
        const maxSpend = Number(this.config.get('MAX_SPEND_LIMIT', '100000000'));
        const approvalThreshold = Number(this.config.get('APPROVAL_THRESHOLD', '100000000'));
        const dailyCap = Number(this.config.get('DAILY_BUDGET_CAP', '500000000'));

        return {
            programId: this.solana.programId.toBase58(),
            network: this.config.get('SOLANA_RPC_URL', 'https://api.devnet.solana.com').includes('devnet')
                ? 'devnet' : 'mainnet',
            policies: {
                maxSpend: { limit: maxSpend, limitUsdc: (maxSpend / 1e6).toFixed(2) },
                approvalThreshold: { limit: approvalThreshold, limitUsdc: (approvalThreshold / 1e6).toFixed(2) },
                dailyBudgetCap: { limit: dailyCap, limitUsdc: (dailyCap / 1e6).toFixed(2) },
                allowlist: 'open',
                duplicatePrevention: 'active',
            },
            stats: {
                totalActions,
                totalSettled,
                totalDenied,
                totalPending,
            },
            signerConfigured: !!this.solana.keypair,
        };
    }
}
