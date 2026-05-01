import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { GuardApiModule } from './guard-api.module';

/**
 * ═══════════════════════════════════════════════════════════════════
 * AgentChain Guard API — Bootstrap
 * ═══════════════════════════════════════════════════════════════════
 *
 * Single-process model: policy engine + Solana RPC + REST API.
 * Port 4337 by default (ERC-4337 resonance).
 *
 * Swagger UI: http://localhost:4337/api
 * OpenAPI JSON: http://localhost:4337/api-json
 * ═══════════════════════════════════════════════════════════════════
 */

const logger = new Logger('Bootstrap');

async function bootstrap() {
    const app = await NestFactory.create(GuardApiModule);

    // ── CORS ──────────────────────────────────────────────────────
    app.enableCors({
        origin: (origin, callback) => {
            if (!origin) { callback(null, true); return; }
            if (/^https?:\/\/localhost:\d+$/.test(origin)) { callback(null, true); return; }
            if (/^https?:\/\/[a-z0-9-]+\.agentchain\.xyz$/.test(origin)) { callback(null, true); return; }
            if (/^https?:\/\/[a-z0-9-]+\.a\.run\.app$/.test(origin)) { callback(null, true); return; }
            if (/^https?:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin)) { callback(null, true); return; }
            callback(new Error(`Origin ${origin} not allowed by CORS`));


        },
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    });

    // ── Versioning ────────────────────────────────────────────────
    app.enableVersioning({ type: VersioningType.URI });

    // ── Validation ────────────────────────────────────────────────
    app.useGlobalPipes(new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
    }));

    // ── Swagger / OpenAPI ─────────────────────────────────────────
    const config = new DocumentBuilder()
        .setTitle('AgentChain Guard API')
        .setDescription(
            'Policy engine and settlement gateway for autonomous commerce on Solana. ' +
            'Evaluates intents against configurable policies, generates cryptographic receipts, ' +
            'and orchestrates on-chain settlement via the AgentChain Guard program.',
        )
        .setVersion('1.0.0')
        .addServer('http://localhost:4337', 'Local Development')
        .addServer('https://agentguard-api-[hash].a.run.app', 'Cloud Run Production')

        .addApiKey(
            { type: 'apiKey', in: 'header', name: 'x-api-key', description: 'Optional API key for rate limiting' },
            'x-api-key',
        )
        .addTag('health', 'Service health and readiness')
        .addTag('intents', 'Intent lifecycle — evaluate, list, inspect')
        .addTag('receipts', 'Cryptographic receipt inspection')
        .addTag('approvals', 'Human approval queue for high-value intents')
        .addTag('config', 'Guard program configuration')
        .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);

    // ── Listen ────────────────────────────────────────────────────
    const port = process.env.PORT || 4337;
    await app.listen(port);

    logger.log(`═══════════════════════════════════════════`);
    logger.log(`  AgentChain Guard API`);
    logger.log(`  Port: ${port}`);
    logger.log(`  Mode: ${process.env.GUARD_MODE || 'SIMULATED'}`);
    logger.log(`  Swagger UI: http://localhost:${port}/api`);

    logger.log(`  OpenAPI JSON: http://localhost:${port}/api-json`);
    logger.log(`═══════════════════════════════════════════`);
}

bootstrap();
