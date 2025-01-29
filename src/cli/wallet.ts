import { Command } from 'commander';
import { Wallet } from '../wallet';
import { getLogger } from '../logging';
import fs from 'fs';

const logger = getLogger(__filename);
const command = new Command('wallet');

command
    .name('wallet')
    .description('Wallet commands')

command.command('create')
    .description('Create a new wallet')
    .option('-n, --name <name> ', 'Name of the wallet', 'default')
    .action(async (options) => {
        // check whether the wallet already exists
        const walletFile = `${process.cwd()}/${options.name}.wallet`;
        if (fs.existsSync(walletFile)) {
            logger.error('Wallet already exists');
            return;
        }

        const wallet = new Wallet();
        wallet.save(walletFile);
        logger.info('Wallet created:', wallet.publicKey);
    });

command.command('balance')
    .description('Get the balance of a wallet')
    .option('-n, --name <name>', 'Name of the wallet', 'default')
    .action(async (options) => {
        const walletFile = `${process.cwd()}/${options.name}.wallet`;
        if (!fs.existsSync(walletFile)) {
            logger.error('Wallet does not exist');
            return;
        }

        const wallet = Wallet.load(walletFile);
        console.log(`Wallet ${options.name}`);
        console.log(`Address: ${wallet.address}`);

        try {
            const balance = await wallet.getBalance();
            console.log(`Balance: ${balance}`);
        } catch (error) {
            logger.error('Error getting balance:', error);
        }
    });

command.command('send')
    .description('Send funds to a wallet')
    .option('-n, --name <name>', 'Name of the wallet', 'default')
    .option('-t, --to <to>', 'Address to send funds to', 'default')
    .option('-a, --amount <amount>', 'Amount to send', '0')
    .option('-m, --message <message>', 'Transaction message')
    .action(async (options) => {
        const walletFile = `${process.cwd()}/${options.name}.wallet`;
        if (!fs.existsSync(walletFile)) {
            logger.error('Wallet does not exist');
            return;
        }

        const wallet = Wallet.load(walletFile);
        const amount = parseInt(options.amount);
        const to = options.to;

        await wallet.send(to, amount, options.message || '')
    });

export { command };
