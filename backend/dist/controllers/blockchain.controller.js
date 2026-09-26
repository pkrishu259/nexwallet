"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.depositVaultSmartContractHandler = exports.swapSparksToNexTokensHandler = exports.mintSbtHandler = exports.getWeb3WalletHandler = exports.verifyChainHandler = exports.getChainHandler = void 0;
const db_1 = require("../services/db");
const blockchainEngine_1 = require("../services/blockchainEngine");
const getChainHandler = async (req, res) => {
    try {
        await blockchainEngine_1.BlockchainEngine.initGenesisBlock();
        const blocks = await db_1.prisma.block.findMany({
            orderBy: { index: 'desc' },
            take: 20,
        });
        const chainIntegrity = await blockchainEngine_1.BlockchainEngine.verifyChainIntegrity();
        return res.json({
            chainIntegrity,
            totalBlocks: blocks.length,
            blocks: blocks.map((b) => ({
                index: b.index,
                hash: b.hash,
                previousHash: b.previousHash,
                timestamp: b.timestamp,
                nonce: b.nonce,
                merkleRoot: b.merkleRoot,
                transactionsCount: b.transactionsCount,
                data: JSON.parse(b.dataJson),
            })),
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.getChainHandler = getChainHandler;
const verifyChainHandler = async (req, res) => {
    try {
        const result = await blockchainEngine_1.BlockchainEngine.verifyChainIntegrity();
        return res.json({
            status: result.valid ? 'VALID_SECURE' : 'COMPROMISED',
            message: result.valid
                ? 'All blocks and Merkle roots verified against SHA-256 cryptographic signatures.'
                : `Hash mismatch found at Block #${result.brokenBlockIndex}`,
            ...result,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.verifyChainHandler = verifyChainHandler;
const getWeb3WalletHandler = async (req, res) => {
    try {
        let wallet = await db_1.prisma.web3Wallet.findUnique({
            where: { userId: req.userId },
        });
        if (!wallet) {
            const generated = blockchainEngine_1.BlockchainEngine.generateWeb3Wallet(req.userId);
            wallet = await db_1.prisma.web3Wallet.create({
                data: {
                    userId: req.userId,
                    walletAddress: generated.walletAddress,
                    privateKeyEnc: generated.privateKeyEnc,
                    nexTokenBalance: 150.0,
                    maticBalance: 0.50,
                },
            });
        }
        const nfts = await db_1.prisma.nftBadge.findMany({
            where: { userId: req.userId },
        });
        const vaultDeposits = await db_1.prisma.vaultDeposit.findMany({
            where: { account: { userId: req.userId } },
            orderBy: { lockedAt: 'desc' },
        });
        return res.json({
            walletAddress: wallet.walletAddress,
            nexTokenBalance: wallet.nexTokenBalance,
            maticBalance: wallet.maticBalance,
            nfts,
            vaultDeposits,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.getWeb3WalletHandler = getWeb3WalletHandler;
const mintSbtHandler = async (req, res) => {
    try {
        const user = await db_1.prisma.user.findUnique({ where: { id: req.userId } });
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        if (user.kycStatus !== 'VERIFIED') {
            return res.status(400).json({ error: 'Student KYC verification required before minting Soulbound Identity NFT' });
        }
        const existingBadge = await db_1.prisma.nftBadge.findFirst({
            where: { userId: req.userId, name: { contains: 'Soulbound Student ID' } },
        });
        if (existingBadge) {
            return res.status(400).json({ error: 'Soulbound Student Identity NFT has already been minted to your address.' });
        }
        // Mine on-chain NFT minting transaction block
        const mintTxHash = '0x' + Math.floor(100000000000 + Math.random() * 900000000000).toString(16) + 'feedcaff';
        const tokenId = 'NEX-SBT-' + Math.floor(1000 + Math.random() * 9000);
        const nft = await db_1.prisma.nftBadge.create({
            data: {
                userId: user.id,
                tokenId,
                name: `Soulbound Student ID #${tokenId}`,
                description: `Verified Student Soulbound Identity NFT for ${user.name} (${user.collegeName || 'Campus'})`,
                imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80',
                metadataUri: `ipfs://bafybeigdyr32${tokenId.toLowerCase()}`,
                mintTxHash,
            },
        });
        // Record on NexChain
        await blockchainEngine_1.BlockchainEngine.mineNextBlock([
            {
                type: 'MINT_SBT_IDENTITY_NFT',
                userId: user.id,
                studentName: user.name,
                college: user.collegeName,
                tokenId,
                mintTxHash,
            },
        ]);
        return res.json({
            message: '🎓 Soulbound Student Identity NFT Minted Successfully!',
            nft,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.mintSbtHandler = mintSbtHandler;
const swapSparksToNexTokensHandler = async (req, res) => {
    try {
        const { sparksAmount } = req.body;
        if (!sparksAmount || sparksAmount < 100) {
            return res.status(400).json({ error: 'Minimum 100 Sparks points required for DEX swap' });
        }
        const user = await db_1.prisma.user.findUnique({ where: { id: req.userId } });
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        if (user.sparksPoints < sparksAmount) {
            return res.status(400).json({ error: 'Insufficient Sparks points balance' });
        }
        // Rate: 100 Sparks = 25 $NEX Tokens
        const nexTokensEarned = (sparksAmount / 100) * 25.0;
        let wallet = await db_1.prisma.web3Wallet.findUnique({ where: { userId: req.userId } });
        if (!wallet) {
            const generated = blockchainEngine_1.BlockchainEngine.generateWeb3Wallet(req.userId);
            wallet = await db_1.prisma.web3Wallet.create({
                data: {
                    userId: req.userId,
                    walletAddress: generated.walletAddress,
                    privateKeyEnc: generated.privateKeyEnc,
                },
            });
        }
        const [updatedUser, updatedWallet] = await db_1.prisma.$transaction([
            db_1.prisma.user.update({
                where: { id: user.id },
                data: { sparksPoints: { decrement: sparksAmount } },
            }),
            db_1.prisma.web3Wallet.update({
                where: { id: wallet.id },
                data: { nexTokenBalance: { increment: nexTokensEarned } },
            }),
        ]);
        // Mine DEX swap on NexChain
        const swapBlock = await blockchainEngine_1.BlockchainEngine.mineNextBlock([
            {
                type: 'DEX_SPARKS_SWAP',
                userId: user.id,
                sparksBurned: sparksAmount,
                nexTokensMinted: nexTokensEarned,
                recipientWallet: wallet.walletAddress,
            },
        ]);
        return res.json({
            message: `🎉 Swapped ${sparksAmount} Sparks for ${nexTokensEarned} $NEX Tokens on-chain!`,
            nexTokensEarned,
            newNexBalance: updatedWallet.nexTokenBalance,
            blockHash: swapBlock.hash,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.swapSparksToNexTokensHandler = swapSparksToNexTokensHandler;
const depositVaultSmartContractHandler = async (req, res) => {
    try {
        const { amount, lockDays = 30 } = req.body;
        if (!amount || amount <= 0)
            return res.status(400).json({ error: 'Valid positive deposit amount required' });
        const user = await db_1.prisma.user.findUnique({
            where: { id: req.userId },
            include: { accounts: true },
        });
        if (!user || !user.accounts[0])
            return res.status(404).json({ error: 'Account not found' });
        const account = user.accounts[0];
        if (account.walletBalance < amount) {
            return res.status(400).json({ error: 'Insufficient wallet balance for Vault deposit' });
        }
        const unlocksAt = new Date(Date.now() + lockDays * 24 * 60 * 60 * 1000);
        const contractTx = '0x' + Math.floor(100000000000 + Math.random() * 900000000000).toString(16) + 'vault';
        const [updatedAccount, vaultDeposit] = await db_1.prisma.$transaction([
            db_1.prisma.account.update({
                where: { id: account.id },
                data: { walletBalance: { decrement: amount } },
            }),
            db_1.prisma.vaultDeposit.create({
                data: {
                    accountId: account.id,
                    amount: Number(amount),
                    apy: 12.5,
                    lockDays,
                    unlocksAt,
                    contractTx,
                },
            }),
        ]);
        // Record Smart Contract execution on NexChain
        await blockchainEngine_1.BlockchainEngine.mineNextBlock([
            {
                type: 'SMART_CONTRACT_VAULT_DEPOSIT',
                contract: 'NexSavingsVault.sol',
                accountId: account.id,
                amount,
                apy: 12.5,
                lockDays,
                contractTx,
            },
        ]);
        return res.json({
            message: `🎉 Smart Contract Vault Deposit of ₹${amount} locked for ${lockDays} days @ 12.5% APY!`,
            vaultDeposit,
            newWalletBalance: updatedAccount.walletBalance,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.depositVaultSmartContractHandler = depositVaultSmartContractHandler;
