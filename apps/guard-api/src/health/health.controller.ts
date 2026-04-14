import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SolanaService } from '../solana/solana.service';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('health')
@Controller({ path: 'health', version: '1' })
export class HealthController {
    private readonly logger = new Logger(HealthController.name);

    constructor(
        private readonly solana: SolanaService,
        private readonly prisma: PrismaService,
    ) {}

    @Get()
    @ApiOperation({ summary: 'Service health check', description: 'Returns health status of the Guard API, database, and Solana RPC connection.' })
    @ApiResponse({
        status: 200,
        description: 'Service is healthy',
        schema: {
            type: 'object',
            properties: {
                status: { type: 'string', example: 'ok' },
                timestamp: { type: 'string', format: 'date-time' },
                solana: {
                    type: 'object',
                    properties: {
                        connected: { type: 'boolean' },
                        slot: { type: 'number' },
                        programId: { type: 'string' },
                    },
                },
                database: {
                    type: 'object',
                    properties: {
                        connected: { type: 'boolean' },
                        intentCount: { type: 'number' },
                    },
                },
            },
        },
    })
    async check() {
        let solanaSlot = 0;
        let solanaConnected = false;
        let dbConnected = false;
        let intentCount = 0;

        try {
            solanaSlot = await this.solana.connection.getSlot();
            solanaConnected = true;
        } catch (e: any) {
            this.logger.warn(`Solana RPC health check failed: ${e.message}`);
        }

        try {
            intentCount = await this.prisma.intent.count();
            dbConnected = true;
        } catch (e: any) {
            this.logger.warn(`Database health check failed: ${e.message}`);
        }

        return {
            status: solanaConnected && dbConnected ? 'ok' : 'degraded',
            timestamp: new Date().toISOString(),
            solana: {
                connected: solanaConnected,
                slot: solanaSlot,
                programId: this.solana.programId.toBase58(),
            },
            database: {
                connected: dbConnected,
                intentCount,
            },
        };
    }
}
