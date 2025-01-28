import { Block } from './Block';
import { Transaction } from './Transaction';
import { SmartContract } from './SmartContract';
import { Level } from 'level';

export class Blockchain {
  chain: Block[];
  difficulty: number;
  pendingTransactions: Transaction[];
  miningReward: number;
  contracts: { [key: string]: SmartContract };
  db: any;

  private constructor() {
    this.chain = [];
    this.difficulty = 4;
    this.pendingTransactions = [];
    this.miningReward = 100;
    this.contracts = {};
    this.db = new Level('./db');
  }

  // Factory function for async initialization
  static async create(): Promise<Blockchain> {
    const blockchain = new Blockchain();
    await blockchain.loadChain();
    return blockchain;
  }

  // Load blockchain from storage
  async loadChain(): Promise<void> {
    try {
      const data = await this.db.get('chain');
      if (!data) {
        // Initialize with genesis block if no chain exists
        this.chain = [this.createGenesisBlock()];
        await this.saveChain();
      } else {
        this.chain = JSON.parse(data);
      }
    } catch (error: any) {
      if (error.code === 'LEVEL_NOT_FOUND') {
        // Initialize with genesis block if no chain exists
        this.chain = [this.createGenesisBlock()];
        await this.saveChain();
      } else {
        throw error;
      }
    }

    console.log('Blockchain loaded, latest block:', this.chain[this.chain.length - 1]);
  }

  // Save blockchain to storage
  async saveChain(): Promise<void> {
    await this.db.put('chain', JSON.stringify(this.chain));
  }

  // Create the genesis block
  createGenesisBlock(): Block {
    return new Block(0, '0', Date.now(), [], 0);
  }

  // Get the latest block in the chain
  getLatestBlock(): Block {
    return this.chain[this.chain.length - 1];
  }

  // Add a new block to the chain
  async addBlock(newBlock: Block): Promise<void> {
    newBlock.previousHash = this.getLatestBlock().hash;
    newBlock.mineBlock(this.difficulty);
    this.chain.push(newBlock);
    await this.saveChain(); // Save the updated chain
  }

  // Add a transaction to the pending transactions pool
  addTransaction(transaction: Transaction): void {
    if (!this.isValidTransaction(transaction)) {
      console.log('Invalid transaction');
      return;
    }
    this.pendingTransactions.push(transaction);
  }

  // Validate a transaction
  isValidTransaction(transaction: Transaction): boolean {
    return transaction.isValid();
  }

  // Mine pending transactions and add them to a new block
  async minePendingTransactions(minerAddress: string): Promise<void> {
    const rewardTransaction = new Transaction(null, minerAddress, this.miningReward);
    this.pendingTransactions.push(rewardTransaction);

    // Execute smart contracts
    for (const transaction of this.pendingTransactions) {
      if (this.contracts[transaction.to]) {
        this.contracts[transaction.to].execute(transaction, this);
      }
    }

    const block = new Block(
      this.chain.length,
      this.getLatestBlock().hash,
      Date.now(),
      this.pendingTransactions
    );
    await this.addBlock(block); // Add the new block to the chain
    this.pendingTransactions = [];
  }

  // Add a smart contract to the blockchain
  addContract(address: string, contract: SmartContract): void {
    this.contracts[address] = contract;
  }

  // Validate the integrity of the blockchain
  isChainValid(): boolean {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      if (currentBlock.hash !== currentBlock.calculateHash()) {
        return false;
      }

      if (currentBlock.previousHash !== previousBlock.hash) {
        return false;
      }
    }
    return true;
  }
}