"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlockchainEngine = void 0;
const crypto_1 = __importDefault(require("crypto"));
const db_1 = require("./db");
class BlockchainEngine {
    /**
     * Computes SHA-256 hash for block header
     */
    static calculateHash(index, previousHash, timestamp, merkleRoot, nonce) {
        const headerStr = `${index}-${previousHash}-${timestamp}-${merkleRoot}-${nonce}`;
        return crypto_1.default.createHash('sha256').update(headerStr).digest('hex');
    }
    /**
     * Computes Merkle Root hash from an array of transaction data objects
     */
    static calculateMerkleRoot(transactions) {
        if (!transactions || transactions.length === 0) {
            return crypto_1.default.createHash('sha256').update('EMPTY_BLOCK').digest('hex');
        }
        const txHashes = transactions.map((tx) => crypto_1.default.createHash('sha256').update(JSON.stringify(tx)).digest('hex'));
        return crypto_1.default.createHash('sha256').update(txHashes.join('')).digest('hex');
    }
    /**
     * Initializes Genesis Block if chain is empty
     */
    static async initGenesisBlock() {
        const existingCount = await db_1.prisma.block.count();
        if (existingCount > 0)
            return;
        const timestamp = new Date('2026-09-01T00:00:00.000Z');
        const previousHash = '0000000000000000000000000000000000000000000000000000000000000000';
        const genesisData = [{ type: 'GENESIS', message: 'NexChain Immutable Student Ledger Initialized' }];
        const merkleRoot = this.calculateMerkleRoot(genesisData);
        const hash = this.calculateHash(0, previousHash, timestamp.toISOString(), merkleRoot, 10892);
        const block = await db_1.prisma.block.create({
            data: {
                index: 0,
                timestamp,
                hash,
                previousHash,
                nonce: 10892,
                merkleRoot,
                transactionsCount: 1,
                dataJson: JSON.stringify(genesisData),
            },
        });
        console.log(`⛓️ NexChain Genesis Block #0 created: ${hash.slice(0, 16)}...`);
        return block;
    }
    /**
     * Mines a new block on NexChain with proof-of-work (difficulty prefix '00')
     */
    static async mineNextBlock(txData) {
        await this.initGenesisBlock();
        const lastBlock = await db_1.prisma.block.findFirst({
            orderBy: { index: 'desc' },
        });
        const index = (lastBlock?.index ?? 0) + 1;
        const previousHash = lastBlock?.hash ?? '0'.repeat(64);
        const timestamp = new Date();
        const merkleRoot = this.calculateMerkleRoot(txData);
        let nonce = 0;
        let hash = '';
        const difficultyPrefix = '00'; // Lightweight 2-zero POW difficulty for instant student transaction consensus
        do {
            nonce++;
            hash = this.calculateHash(index, previousHash, timestamp.toISOString(), merkleRoot, nonce);
        } while (!hash.startsWith(difficultyPrefix) && nonce < 100000);
        const block = await db_1.prisma.block.create({
            data: {
                index,
                timestamp,
                hash,
                previousHash,
                nonce,
                merkleRoot,
                transactionsCount: txData.length,
                dataJson: JSON.stringify(txData),
            },
        });
        console.log(`⛏️ Mined Block #${index} [Hash: ${hash.slice(0, 16)}... Nonce: ${nonce}]`);
        return block;
    }
    /**
     * Verifies the cryptographic integrity of all blocks on NexChain
     */
    static async verifyChainIntegrity() {
        const blocks = await db_1.prisma.block.findMany({
            orderBy: { index: 'asc' },
        });
        for (let i = 1; i < blocks.length; i++) {
            const current = blocks[i];
            const previous = blocks[i - 1];
            if (current.previousHash !== previous.hash) {
                return { valid: false, totalBlocks: blocks.length, brokenBlockIndex: current.index };
            }
            const txData = JSON.parse(current.dataJson);
            const recalculatedMerkle = this.calculateMerkleRoot(txData);
            const recalculatedHash = this.calculateHash(current.index, current.previousHash, current.timestamp.toISOString(), recalculatedMerkle, current.nonce);
            if (current.hash !== recalculatedHash) {
                return { valid: false, totalBlocks: blocks.length, brokenBlockIndex: current.index };
            }
        }
        return { valid: true, totalBlocks: blocks.length };
    }
    /**
     * Generates a deterministic EVM Web3 wallet address for a student
     */
    static generateWeb3Wallet(userId) {
        const seed = crypto_1.default.createHash('sha256').update(`NEXWALLET_${userId}_SECRET`).digest('hex');
        const walletAddress = '0x' + seed.slice(0, 40);
        const privateKeyEnc = '0x' + crypto_1.default.createHash('sha256').update(seed + '_PRIV').digest('hex');
        return { walletAddress, privateKeyEnc };
    }
}
exports.BlockchainEngine = BlockchainEngine;
