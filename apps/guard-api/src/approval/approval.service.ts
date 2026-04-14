import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ApprovalService {
    private readonly logger = new Logger(ApprovalService.name);

    constructor(private readonly prisma: PrismaService) {}

    async list(status?: string) {
        const where: any = {};
        if (status) where.status = status;

        const approvals = await this.prisma.approvalRequest.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: { intent: true },
        });

        return approvals.map(a => ({
            ...a,
            intent: a.intent ? { ...a.intent, amount: a.intent.amount.toString() } : null,
        }));
    }

    async findById(id: string) {
        const approval = await this.prisma.approvalRequest.findUnique({
            where: { id },
            include: { intent: { include: { receipt: true } } },
        });
        if (!approval) throw new NotFoundException(`Approval request not found: ${id}`);

        return {
            ...approval,
            intent: approval.intent
                ? {
                    ...approval.intent,
                    amount: approval.intent.amount.toString(),
                    receipt: approval.intent.receipt
                        ? { ...approval.intent.receipt, policies: JSON.parse(approval.intent.receipt.policies) }
                        : null,
                }
                : null,
        };
    }

    async approve(id: string, resolvedBy?: string) {
        const approval = await this.prisma.approvalRequest.findUnique({ where: { id } });
        if (!approval) throw new NotFoundException(`Approval request not found: ${id}`);

        const now = new Date();

        await this.prisma.$transaction([
            this.prisma.approvalRequest.update({
                where: { id },
                data: { status: 'APPROVED', resolvedBy: resolvedBy || 'operator', resolvedAt: now },
            }),
            this.prisma.intent.update({
                where: { id: approval.intentId },
                data: { status: 'SETTLED', settledAt: now },
            }),
        ]);

        this.logger.log(`Approved: ${id} → intent ${approval.intentId} settled`);
        return { success: true, status: 'APPROVED', settledAt: now.toISOString() };
    }

    async deny(id: string, resolvedBy?: string) {
        const approval = await this.prisma.approvalRequest.findUnique({ where: { id } });
        if (!approval) throw new NotFoundException(`Approval request not found: ${id}`);

        const now = new Date();

        await this.prisma.$transaction([
            this.prisma.approvalRequest.update({
                where: { id },
                data: { status: 'DENIED', resolvedBy: resolvedBy || 'operator', resolvedAt: now },
            }),
            this.prisma.intent.update({
                where: { id: approval.intentId },
                data: { status: 'DENIED' },
            }),
        ]);

        this.logger.log(`Denied: ${id} → intent ${approval.intentId} denied`);
        return { success: true, status: 'DENIED', resolvedAt: now.toISOString() };
    }
}
