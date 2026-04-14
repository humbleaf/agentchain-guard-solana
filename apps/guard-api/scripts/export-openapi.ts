/**
 * export-openapi.ts — OpenAPI spec exporter.
 *
 * Fetches the spec from the running Guard API server at /api-json
 * and writes it to docs/guard-api/openapi.json for Mintlify consumption.
 *
 * Requires the Guard API to be running: make dev-api
 *
 * Usage: npx tsx scripts/export-openapi.ts
 */
import * as fs from 'fs';
import * as path from 'path';

const GUARD_API_URL = process.env.GUARD_API_URL ?? 'http://localhost:4337';
const OUTPUT_PATH = path.resolve(__dirname, '../../../docs/guard-api/openapi.json');

async function main() {
    console.log(`Fetching OpenAPI spec from ${GUARD_API_URL}/api-json ...`);

    const res = await fetch(`${GUARD_API_URL}/api-json`);
    if (!res.ok) {
        console.error(`FATAL: Failed to fetch spec — ${res.status} ${res.statusText}`);
        console.error('Is the Guard API running? → make dev-api');
        process.exit(1);
    }

    const spec = await res.json();

    // Validate basic structure
    if (!spec.openapi || !spec.paths) {
        console.error('FATAL: Response is not a valid OpenAPI document');
        process.exit(1);
    }

    // Ensure output directory exists
    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(spec, null, 2));

    const pathCount = Object.keys(spec.paths).length;
    const tagNames = (spec.tags || []).map((t: any) => t.name).join(', ');

    console.log(`✅ OpenAPI spec exported to ${OUTPUT_PATH}`);
    console.log(`   Version: ${spec.openapi}`);
    console.log(`   Paths: ${pathCount}`);
    console.log(`   Tags: ${tagNames}`);
}

main().catch((err) => {
    console.error('Failed to export OpenAPI spec:', err.message);
    console.error('Is the Guard API running? → make dev-api');
    process.exit(1);
});
