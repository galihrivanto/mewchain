import { Blockchain } from '../src/Blockchain';
import { Wallet } from '../src/Wallet';
import { SmartContract } from '../src/SmartContract';
import { Transaction } from '../src/Transaction';

async function main() {
  // Create a new blockchain
  const blockchain = await Blockchain.create();

  // Create wallets
  const wallet1 = new Wallet();
  const wallet2 = new Wallet();

  // Deploy a smart contract
  const contractAddress = 'contract-address';
  const contract = new SmartContract(contractAddress);
  blockchain.addContract(contractAddress, contract);

  // Create and sign a transaction
  const transaction = new Transaction(wallet1.publicKey, wallet2.publicKey, 10);
  transaction.signTransaction(wallet1);
  blockchain.addTransaction(transaction);

  // Mine pending transactions
  blockchain.minePendingTransactions(wallet1.publicKey);

  // Interact with the smart contract
  const contractTransaction = new Transaction(wallet1.publicKey, contractAddress, 0, 'Hello, World!');
  contractTransaction.signTransaction(wallet1);
  blockchain.addTransaction(contractTransaction);
  blockchain.minePendingTransactions(wallet1.publicKey);

  console.log('Contract data:', contract.getData(wallet1.publicKey)); // Output: Hello, World!
}

main();