import {
    Controller, Post, Get, Body, Param, Query,
    HttpCode, HttpStatus, Logger, NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';
import { IntentService } from './intent.service';
import { EvaluateIntentDto } from './dto/evaluate-intent.dto';

@ApiTags('intents')
@Controller({ path: 'intents', version: '1' })
export class IntentController {
    private readonly logger = new Logger(IntentController.name);

    constructor(private readonly intentService: IntentService) {}

    @Post('evaluate')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Evaluate an intent against policies',
        description:
            'Submits a proposed value-moving action for evaluation against the policy engine. ' +
            'Returns the verdict (PASS, DENY, or PENDING_APPROVAL), detailed per-policy results, ' +
            'and a cryptographic receipt hash. If PASS, the intent is auto-settled. ' +
            'If PENDING_APPROVAL, an approval request is queued for human review.',
    })
    @ApiBody({ type: EvaluateIntentDto })
    @ApiResponse({
        status: 200,
        description: 'Intent evaluated successfully',
        schema: {
            type: 'object',
            properties: {
                verdict: { type: 'string', enum: ['PASS', 'DENY', 'PENDING_APPROVAL'] },
                intentId: { type: 'string' },
                id: { type: 'string', format: 'uuid' },
                receiptHash: { type: 'string' },
                amount: { type: 'string', example: '3.00' },
                status: { type: 'string' },
                policyResults: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            name: { type: 'string' },
                            verdict: { type: 'string' },
                            reason: { type: 'string' },
                        },
                    },
                },
            },
        },
    })
    @ApiResponse({ status: 400, description: 'Invalid request body' })
    async evaluate(@Body() dto: EvaluateIntentDto) {
        return this.intentService.evaluate(dto);
    }

    @Get()
    @ApiOperation({
        summary: 'List intents',
        description: 'Returns a paginated list of guarded intents with optional status and agent filters.',
    })
    @ApiQuery({ name: 'status', required: false, enum: ['SETTLED', 'DENIED', 'PENDING_APPROVAL'] })
    @ApiQuery({ name: 'agent', required: false, description: 'Filter by agent identifier' })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
    @ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
    @ApiResponse({ status: 200, description: 'Intent list returned' })
    async list(
        @Query('status') status?: string,
        @Query('agent') agent?: string,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
    ) {
        return this.intentService.list({
            status,
            agent,
            limit: limit ? Number(limit) : undefined,
            offset: offset ? Number(offset) : undefined,
        });
    }

    @Get(':id')
    @ApiOperation({
        summary: 'Get intent by ID',
        description: 'Returns full intent detail including receipt and approval status.',
    })
    @ApiParam({ name: 'id', description: 'Intent UUID' })
    @ApiResponse({ status: 200, description: 'Intent found' })
    @ApiResponse({ status: 404, description: 'Intent not found' })
    async findById(@Param('id') id: string) {
        const intent = await this.intentService.findById(id);
        if (!intent) throw new NotFoundException(`Intent not found: ${id}`);
        return intent;
    }
}
