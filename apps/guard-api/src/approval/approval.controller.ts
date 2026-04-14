import { Controller, Get, Post, Param, Query, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ApprovalService } from './approval.service';

@ApiTags('approvals')
@Controller({ path: 'approvals', version: '1' })
export class ApprovalController {
    private readonly logger = new Logger(ApprovalController.name);

    constructor(private readonly approvalService: ApprovalService) {}

    @Get()
    @ApiOperation({
        summary: 'List approval requests',
        description: 'Returns all approval requests, optionally filtered by status.',
    })
    @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'APPROVED', 'DENIED'] })
    @ApiResponse({ status: 200, description: 'Approval list returned' })
    async list(@Query('status') status?: string) {
        return this.approvalService.list(status);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get approval request detail' })
    @ApiParam({ name: 'id', description: 'Approval request UUID' })
    @ApiResponse({ status: 200, description: 'Approval detail returned' })
    @ApiResponse({ status: 404, description: 'Approval not found' })
    async findById(@Param('id') id: string) {
        return this.approvalService.findById(id);
    }

    @Post(':id/approve')
    @ApiOperation({
        summary: 'Approve a pending intent',
        description: 'Approves the intent and triggers on-chain settlement. ' +
            'Transitions the intent from PENDING_APPROVAL → SETTLED.',
    })
    @ApiParam({ name: 'id', description: 'Approval request UUID' })
    @ApiResponse({ status: 200, description: 'Intent approved and settled' })
    @ApiResponse({ status: 404, description: 'Approval not found' })
    async approve(@Param('id') id: string) {
        return this.approvalService.approve(id);
    }

    @Post(':id/deny')
    @ApiOperation({
        summary: 'Deny a pending intent',
        description: 'Denies the intent. Transitions the intent from PENDING_APPROVAL → DENIED.',
    })
    @ApiParam({ name: 'id', description: 'Approval request UUID' })
    @ApiResponse({ status: 200, description: 'Intent denied' })
    @ApiResponse({ status: 404, description: 'Approval not found' })
    async deny(@Param('id') id: string) {
        return this.approvalService.deny(id);
    }
}
