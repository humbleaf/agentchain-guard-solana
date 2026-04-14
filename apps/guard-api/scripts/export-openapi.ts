/**
 * export-openapi.ts — Standalone OpenAPI spec exporter.
 *
 * Boots NestJS in-process (no HTTP), extracts the Swagger document,
 * and writes it to docs/guard-api/openapi.json for Mintlify consumption.
 *
 * Usage: npx tsx scripts/export-openapi.ts
 */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';

async function exportSpec() {
    // Dynamic import to avoid loading before reflect-metadata
    const { GuardApiModule } = await import('../src/guard-api.module');

    const app = await NestFactory.create(GuardApiModule, { logger: false });

    const config = new DocumentBuilder()
        .setTitle('AgentChain Guard API')
        .setDescription(
            'Policy engine and settlement gateway for autonomous commerce on Solana. ' +
            'Evaluates intents against configurable policies, generates cryptographic receipts, ' +
            'and orchestrates on-chain settlement via the AgentChain Guard program.',
        )
        .setVersion('1.0.0')
        .addServer('https://guard-api.agentchain.xyz', 'Production')
        .addServer('http://localhost:4337', 'Local Development')
        .addApiKey(
            { type: 'apiKey', in: 'header', name: 'x-api-key', description: 'Optional API key' },
            'x-api-key',
        )
        .addTag('health', 'Service health and readiness')
        .addTag('intents', 'Intent lifecycle — evaluate, list, inspect')
        .addTag('receipts', 'Cryptographic receipt inspection')
        .addTag('approvals', 'Human approval queue for high-value intents')
        .addTag('config', 'Guard program configuration')
        .build();

    const document = SwaggerModule.createDocument(app, config);

    const outputPath = path.resolve(__dirname, '../../docs/guard-api/openapi.json');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(document, null, 2));

    console.log(`✅ OpenAPI spec exported to ${outputPath}`);
    console.log(`   Paths: ${Object.keys(document.paths || {}).length}`);
    console.log(`   Tags: ${(document.tags || []).map((t: any) => t.name).join(', ')}`);

    await app.close();
}

exportSpec().catch((err) => {
    console.error('Failed to export OpenAPI spec:', err);
    process.exit(1);
});
