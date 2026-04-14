import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PolicyResult } from '../policy/policy.service';
import * as crypto from 'crypto';

@Injectable()
export class ReceiptService {
    private readonly logger = new Logger(ReceiptService.name);

    constructor(private readonly prisma: PrismaService) {}

    /**
     * Create a receipt from policy evaluation results.
     * Returns the SHA-256 hash of the receipt JSON.
     */
    async create(intentId: string, policies: PolicyResult[], verdict: string, amount: number): Promise<{ receiptHash: string }> {
        const receiptData = {
            intentId,
            verdict,
            amount,
            policies,
            evaluatedAt: new Date().toISOString(),
            version: '1.0.0',
        };

        const rawJson = JSON.stringify(receiptData, null, 2);
        const receiptHash = crypto.createHash('sha256').update(rawJson).digest('hex');

        await this.prisma.receipt.create({
            data: {
                receiptHash,
                intentId,
                policies: JSON.stringify(policies),
                rawJson,
            },
        });

        this.logger.log(`Receipt created: ${receiptHash.slice(0, 12)}... for intent ${intentId.slice(0, 8)}...`);
        return { receiptHash };
    }

    /**
     * Fetch a receipt by its hash.
     */
    async findByHash(hash: string) {
        return this.prisma.receipt.findUnique({
            where: { receiptHash: hash },
            include: { intent: true },
        });
    }
}
