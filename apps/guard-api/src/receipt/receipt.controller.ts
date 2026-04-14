import { Controller, Get, Param, NotFoundException, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ReceiptService } from './receipt.service';

@ApiTags('receipts')
@Controller({ path: 'receipts', version: '1' })
export class ReceiptController {
    private readonly logger = new Logger(ReceiptController.name);

    constructor(private readonly receiptService: ReceiptService) {}

    @Get(':hash')
    @ApiOperation({
        summary: 'Get receipt by hash',
        description: 'Fetch the full policy evaluation receipt by its SHA-256 hash. ' +
            'The on-chain program stores only the 32-byte hash — this endpoint provides the full JSON.',
    })
    @ApiParam({ name: 'hash', description: 'SHA-256 receipt hash (64 hex characters)', example: 'a1b2c3d4...' })
    @ApiResponse({
        status: 200,
        description: 'Receipt found',
        schema: {
            type: 'object',
            properties: {
                receiptHash: { type: 'string' },
                intentId: { type: 'string' },
                policies: { type: 'array', items: { type: 'object' } },
                rawJson: { type: 'string' },
                createdAt: { type: 'string', format: 'date-time' },
            },
        },
    })
    @ApiResponse({ status: 404, description: 'Receipt not found' })
    async getByHash(@Param('hash') hash: string) {
        const receipt = await this.receiptService.findByHash(hash);
        if (!receipt) {
            throw new NotFoundException(`Receipt not found: ${hash.slice(0, 12)}...`);
        }
        return {
            ...receipt,
            policies: JSON.parse(receipt.policies),
        };
    }
}
