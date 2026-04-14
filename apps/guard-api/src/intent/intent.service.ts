import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PolicyService } from '../policy/policy.service';
import { ReceiptService } from '../receipt/receipt.service';
import { EvaluateIntentDto } from './dto/evaluate-intent.dto';

@Injectable()
export class IntentService {
    private readonly logger = new Logger(IntentService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly policyService: PolicyService,
        private readonly receiptService: ReceiptService,
    ) {}

    /**
     * Evaluate an intent against all policies, generate receipt, store result.
     */
    async evaluate(dto: EvaluateIntentDto) {
        const amount = Number(dto.amount);
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24h

        // 1. Evaluate policies
        const { verdict, policies } = this.policyService.evaluate({
            intentId: dto.intentId,
            agent: dto.agent,
            recipient: dto.recipient,
            amount,
            actionType: dto.actionType,
        });

        // 2. Create intent record
        const intent = await this.prisma.intent.create({
            data: {
                intentId: dto.intentId,
                agent: dto.agent,
                requester: dto.requester,
                recipient: dto.recipient,
                amount: BigInt(amount),
                actionType: dto.actionType,
                status: verdict === 'PASS' ? 'SETTLED' : verdict === 'DENY' ? 'DENIED' : 'PENDING_APPROVAL',
                policyVerdict: verdict,
                receiptHash: '', // Placeholder — updated after receipt creation
                settledAt: verdict === 'PASS' ? now : null,
                expiresAt,
            },
        });

        // 3. Generate receipt
        const { receiptHash } = await this.receiptService.create(
            intent.id,
            policies,
            verdict,
            amount,
        );

        // 4. Update intent with receipt hash
        await this.prisma.intent.update({
            where: { id: intent.id },
            data: { receiptHash },
        });

        // 5. If PENDING_APPROVAL, create approval request
        if (verdict === 'PENDING_APPROVAL') {
            await this.prisma.approvalRequest.create({
                data: { intentId: intent.id },
            });
            this.logger.log(`Approval request created for intent ${intent.id}`);
        }

        this.logger.log(
            `Intent evaluated: ${dto.intentId.slice(0, 12)}... → ${verdict} ` +
            `(${(amount / 1e6).toFixed(2)} USDC)`,
        );

        return {
            verdict,
            intentId: dto.intentId,
            id: intent.id,
            receiptHash,
            amount: (amount / 1e6).toFixed(2),
            policies,
            policyResults: policies,
            status: intent.status,
        };
    }

    /**
     * List intents with optional filters.
     */
    async list(params: { status?: string; agent?: string; limit?: number; offset?: number }) {
        const { status, agent, limit = 20, offset = 0 } = params;

        const where: any = {};
        if (status) where.status = status;
        if (agent) where.agent = agent;

        const [intents, total] = await Promise.all([
            this.prisma.intent.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset,
                include: { receipt: true },
            }),
            this.prisma.intent.count({ where }),
        ]);

        return {
            data: intents.map(i => ({
                ...i,
                amount: i.amount.toString(),
                receipt: i.receipt ? { ...i.receipt, policies: JSON.parse(i.receipt.policies) } : null,
            })),
            total,
            limit,
            offset,
        };
    }

    /**
     * Get a single intent by ID.
     */
    async findById(id: string) {
        const intent = await this.prisma.intent.findUnique({
            where: { id },
            include: { receipt: true, approval: true },
        });

        if (!intent) return null;

        return {
            ...intent,
            amount: intent.amount.toString(),
            receipt: intent.receipt
                ? { ...intent.receipt, policies: JSON.parse(intent.receipt.policies) }
                : null,
        };
    }
}
