import { Command } from 'commander';
import { Wallet } from '../Wallet';
const program = new Command('wallet');

program
    .name('wallet')
    .description('Wallet commands');

// create a new wallet
program.command('create')
    .description('Create a new wallet')
    .action(() => {
        const wallet = new Wallet();
        console.log('Wallet created:', wallet.publicKey);
    });

program.parse(process.argv);