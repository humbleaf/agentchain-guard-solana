import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GuardConfigService } from './guard-config.service';

@ApiTags('config')
@Controller({ path: 'config', version: '1' })
export class GuardConfigController {
    constructor(private readonly configService: GuardConfigService) {}

    @Get()
    @ApiOperation({
        summary: 'Get Guard configuration',
        description:
            'Returns the current Guard program configuration including policy thresholds, ' +
            'network info, and aggregate intent statistics.',
    })
    @ApiResponse({
        status: 200,
        description: 'Guard configuration returned',
        schema: {
            type: 'object',
            properties: {
                programId: { type: 'string' },
                network: { type: 'string', enum: ['devnet', 'mainnet'] },
                policies: { type: 'object' },
                stats: {
                    type: 'object',
                    properties: {
                        totalActions: { type: 'number' },
                        totalSettled: { type: 'number' },
                        totalDenied: { type: 'number' },
                        totalPending: { type: 'number' },
                    },
                },
                signerConfigured: { type: 'boolean' },
            },
        },
    })
    async getConfig() {
        return this.configService.getConfig();
    }
}
