import { Blockchain } from '../src/Blockchain';
import { Network } from '../src/Network';
import { Wallet } from '../src/Wallet';

async function main() {
  // Create a new blockchain
  const blockchain = await Blockchain.create();

  // Create a wallet for this node
  const wallet = new Wallet();

  // Initialize the network
  const network = new Network(blockchain);

  // Mine pending transactions every 10 seconds
  setInterval(() => {
    console.log('Mining pending transactions...');
    blockchain.minePendingTransactions(wallet.publicKey);
    network.broadcastBlockchain();
  }, 10000);

  // Log the blockchain state every 30 seconds
  setInterval(() => {
    console.log('Current blockchain:', JSON.stringify(blockchain.chain, null, 2));
  }, 30000);
}

main();