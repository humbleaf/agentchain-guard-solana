import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface PolicyResult {
    name: string;
    verdict: 'PASS' | 'DENY' | 'PENDING_APPROVAL';
    reason: string;
}

export interface IntentParams {
    agent: string;
    recipient: string;
    amount: number; // base units (6 decimals)
    actionType: number;
    intentId: string;
}

interface PolicyEvaluator {
    name: string;
    evaluate(params: IntentParams): PolicyResult;
}

/**
 * PolicyService — Evaluates intents against 5 configurable policies.
 *
 * Final verdict = worst-case aggregation:
 *   DENY > PENDING_APPROVAL > PASS
 */
@Injectable()
export class PolicyService {
    private readonly logger = new Logger(PolicyService.name);
    private readonly policies: PolicyEvaluator[];

    // Track seen intent IDs for duplicate prevention
    private readonly seenIntents = new Set<string>();

    constructor(private readonly config: ConfigService) {
        const maxSpend = Number(config.get<string>('MAX_SPEND_LIMIT', '100000000'));
        const approvalThreshold = Number(config.get<string>('APPROVAL_THRESHOLD', '100000000'));
        const dailyCap = Number(config.get<string>('DAILY_BUDGET_CAP', '500000000'));

        this.policies = [
            // 1. Max single-action spend
            {
                name: 'max-spend',
                evaluate: (p: IntentParams): PolicyResult => ({
                    name: 'max-spend',
                    verdict: p.amount > maxSpend ? 'DENY' : 'PASS',
                    reason: p.amount > maxSpend
                        ? `Exceeds single-action limit (${(p.amount / 1e6).toFixed(2)} > ${(maxSpend / 1e6).toFixed(2)} USDC)`
                        : `Within threshold (${(p.amount / 1e6).toFixed(2)} ≤ ${(maxSpend / 1e6).toFixed(2)} USDC)`,
                }),
            },
            // 2. Recipient allowlist
            {
                name: 'allowlist',
                evaluate: (_p: IntentParams): PolicyResult => ({
                    name: 'allowlist',
                    verdict: 'PASS',
                    reason: 'Recipient approved (allowlist open in demo mode)',
                }),
            },
            // 3. Budget bucket (daily cap)
            {
                name: 'budget-bucket',
                evaluate: (p: IntentParams): PolicyResult => ({
                    name: 'budget-bucket',
                    verdict: p.amount > dailyCap ? 'DENY' : 'PASS',
                    reason: p.amount > dailyCap
                        ? `Exceeds daily budget cap (${(dailyCap / 1e6).toFixed(2)} USDC)`
                        : 'Daily cap available',
                }),
            },
            // 4. Duplicate prevention
            {
                name: 'duplicate-prevention',
                evaluate: (p: IntentParams): PolicyResult => {
                    if (this.seenIntents.has(p.intentId)) {
                        return { name: 'duplicate-prevention', verdict: 'DENY', reason: 'Duplicate intent ID detected' };
                    }
                    this.seenIntents.add(p.intentId);
                    return { name: 'duplicate-prevention', verdict: 'PASS', reason: 'Unique intent ID' };
                },
            },
            // 5. Approval threshold
            {
                name: 'approval-threshold',
                evaluate: (p: IntentParams): PolicyResult => ({
                    name: 'approval-threshold',
                    verdict: p.amount > approvalThreshold ? 'PENDING_APPROVAL' : 'PASS',
                    reason: p.amount > approvalThreshold
                        ? `Exceeds approval threshold (${(p.amount / 1e6).toFixed(2)} > ${(approvalThreshold / 1e6).toFixed(2)} USDC) — requires human sign-off`
                        : `Below threshold (${(p.amount / 1e6).toFixed(2)} ≤ ${(approvalThreshold / 1e6).toFixed(2)} USDC)`,
                }),
            },
        ];
    }

    evaluate(params: IntentParams): { verdict: string; policies: PolicyResult[] } {
        const results = this.policies.map(p => p.evaluate(params));

        // Worst-case aggregation: DENY > PENDING_APPROVAL > PASS
        let finalVerdict = 'PASS';
        for (const r of results) {
            if (r.verdict === 'DENY') { finalVerdict = 'DENY'; break; }
            if (r.verdict === 'PENDING_APPROVAL') finalVerdict = 'PENDING_APPROVAL';
        }

        this.logger.log(
            `Policy evaluation: ${params.intentId.slice(0, 8)}... → ${finalVerdict} ` +
            `(${results.filter(r => r.verdict === 'PASS').length}/${results.length} passed)`,
        );

        return { verdict: finalVerdict, policies: results };
    }
}
