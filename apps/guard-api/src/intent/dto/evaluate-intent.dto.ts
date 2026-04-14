import { IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EvaluateIntentDto {
    @ApiProperty({ description: 'Unique intent identifier', example: 'intent-001-abc' })
    @IsString()
    intentId: string;

    @ApiProperty({ description: 'Agent wallet address or identifier', example: 'DemoAgent' })
    @IsString()
    agent: string;

    @ApiProperty({ description: 'Wallet funding this action', example: 'DemoRequester' })
    @IsString()
    requester: string;

    @ApiProperty({ description: 'Destination wallet for settlement', example: 'DemoRecipient' })
    @IsString()
    recipient: string;

    @ApiProperty({ description: 'Amount in token base units (6 decimals for USDC)', example: '3000000' })
    @IsString()
    amount: string;

    @ApiProperty({ description: 'Action classification: 0=api_payment, 1=reward, 2=treasury', example: 0 })
    @IsNumber()
    actionType: number;

    @ApiPropertyOptional({ description: 'SPL token mint address', example: 'USDC' })
    @IsOptional()
    @IsString()
    mint?: string;
}
