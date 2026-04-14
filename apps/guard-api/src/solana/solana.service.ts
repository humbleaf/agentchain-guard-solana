import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * SolanaService — Shared Solana RPC connection and keypair management.
 *
 * Provides the Connection object and optional signing keypair
 * for submitting on-chain transactions to the Guard program.
 */
@Injectable()
export class SolanaService implements OnModuleInit {
    private readonly logger = new Logger(SolanaService.name);

    connection: Connection;
    keypair: Keypair | null = null;
    programId: PublicKey;

    constructor(private readonly config: ConfigService) {}

    async onModuleInit() {
        const rpcUrl = this.config.get<string>('SOLANA_RPC_URL', 'https://api.devnet.solana.com');
        const programIdStr = this.config.get<string>(
            'GUARD_PROGRAM_ID',
            'HutGfrkJTsaGMC4bs7X2EFsbbP8LaTEDkWsEBM86RGHz',
        );

        this.connection = new Connection(rpcUrl, 'confirmed');
        this.programId = new PublicKey(programIdStr);

        // Load keypair if path is provided
        const keypairPath = this.config.get<string>('GUARD_KEYPAIR');
        if (keypairPath) {
            try {
                const resolved = path.isAbsolute(keypairPath)
                    ? keypairPath
                    : path.resolve(process.cwd(), keypairPath);
                const raw = JSON.parse(fs.readFileSync(resolved, 'utf-8'));
                this.keypair = Keypair.fromSecretKey(Uint8Array.from(raw));
                this.logger.log(
                    `Keypair loaded: ${this.keypair.publicKey.toBase58().slice(0, 8)}...`,
                );
            } catch (e: any) {
                this.logger.warn(`Keypair not loaded: ${e.message} — on-chain TX disabled`);
            }
        } else {
            this.logger.warn('GUARD_KEYPAIR not set — on-chain TX disabled (read-only mode)');
        }

        // Verify RPC connectivity
        try {
            const slot = await this.connection.getSlot();
            this.logger.log(`Solana RPC connected — slot ${slot} (${rpcUrl})`);
        } catch (e: any) {
            this.logger.error(`Solana RPC unreachable: ${e.message}`);
        }
    }

    /**
     * Derive a PDA address for the Guard program.
     */
    findPda(seeds: Buffer[]): [PublicKey, number] {
        return PublicKey.findProgramAddressSync(seeds, this.programId);
    }
}
