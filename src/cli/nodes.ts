import { Command } from "commander";
import { Wallet } from "../wallet";
import { getLogger } from "../logging";
import path from 'path';
import fs from 'fs';
import { Blockchain } from "../blockchain";
import { Network } from "../network";

const logger = getLogger(__filename);
const command = new Command('node');
const INTERVAL_S = 10000

command.command('run')
    .description('Run a node')
    .option('-w, --wallet <wallet>', 'Wallet name', 'default')
    .option('-d, --data-dir <data-dir>', 'Data directory', '.')
    .action(async (options) => {
        // creating new wallet
        let walletName = options.wallet;
        let publicKey = '';
        let dataDir = path.isAbsolute(options.dataDir) 
            ? options.dataDir 
            : path.join(process.cwd(), options.dataDir);

        // create data dir if it doesn't exist
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        if (!walletName) {
            // checking for wallet file (.wallet)
            const walletPath = path.join(dataDir, `${walletName}.wallet`);
            if (fs.existsSync(walletPath)) {
                logger.info('Loading wallet from file');
                const wallet = Wallet.load(walletPath);
                publicKey = wallet.publicKey;
            } else {
                logger.info('Creating new wallet');
                const wallet = new Wallet();
                wallet.save(walletPath);
                publicKey = wallet.publicKey;
            }
        }

        logger.info(`Starting node...`);
        const blockchain = await Blockchain.create(dataDir);
        const network = new Network(blockchain);
        await network.start();
        logger.info('Network started');

        // Set up intervals for mining and logging
        const miningInterval = setInterval(() => {
            logger.info('Mining pending transactions...');
            blockchain.minePendingTransactions(publicKey);
            network.broadcastBlockchain();
        }, 10 * INTERVAL_S);

        const loggingInterval = setInterval(() => {
            logger.info('Latest block:', blockchain.chain[blockchain.chain.length - 1]);
        }, 30 * INTERVAL_S);

        // Handle graceful shutdown
        process.on('SIGINT', async() => {
            logger.info('Shutting down node...');
            clearInterval(miningInterval);
            clearInterval(loggingInterval);
            await network.close();
            process.exit(0);
        });

        // Keep the process running
        await new Promise(() => {});

    });

command.command('export_wallet')
    .description('View wallet secret key')
    .action(async () => {
        const walletPath = path.join(process.cwd(), '.wallet');
        if (fs.existsSync(walletPath)) {
            const privateKey = fs.readFileSync(walletPath, 'utf8');
            logger.info('Wallet secret key:', privateKey);
        } else {
            logger.error('Wallet file not found');
        }
    });

export { command };