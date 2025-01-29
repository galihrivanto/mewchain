import { Block } from './block';
import { Transaction } from './transaction';
import { SmartContract } from './smart_contract';
import { Level } from 'level';
import { getLogger } from './logging';
import { Wallet } from './wallet';
import path from 'path';

const logger = getLogger(__filename);
const GENESIS_ADDRESS = '0x2dbadd757ab58bf8103877eef34b3a31dac8c1eb';
const GENESIS_REWARD = 10000;

export class Blockchain {
  chain: Block[];
  difficulty: number;
  pendingTransactions: Transaction[];
  miningReward: number;
  contracts: { [key: string]: SmartContract };
  db: any;
  private currentSupply: number;
  private readonly maxSupply: number;
  private readonly tokenName: string;
  private readonly tokenSymbol: string;
  private lastHalvingBlock: number;
  private readonly halvingInterval: number;

  private constructor(dataDir: string) {
    this.maxSupply = 21000000;
    this.tokenName = 'MewChain';
    this.tokenSymbol = 'MCH';
    this.lastHalvingBlock = 0;
    this.halvingInterval = 210000;    
    this.miningReward = 5000;

    this.currentSupply = 0;
    this.chain = [];
    this.difficulty = 4;
    this.pendingTransactions = [];
    this.contracts = {};
    this.db = new Level(path.join(dataDir, 'db'));
  }

  // Factory function for async initialization
  static async create(dataDir?: string): Promise<Blockchain> {
    const blockchain = new Blockchain(path.join(dataDir || '.'));
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

    logger.debug('Blockchain loaded, latest block:', this.chain[this.chain.length - 1]);
  }

  // Save blockchain to storage
  async saveChain(): Promise<void> {
    await this.db.put('chain', JSON.stringify(this.chain));
  }

  // Create the genesis block
  createGenesisBlock(): Block {
    // create an initial distribution transaction
    const genesisDistribution = new Transaction(
      null, 
      GENESIS_ADDRESS, 
      GENESIS_REWARD,
      1,
      'Genesis distribution'
    );

    return new Block(0, '0', Date.now(), [genesisDistribution], 0);
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
    if (transaction.fee || transaction.fee < 1) {
      logger.error('Transaction fee must be greater than 0');
      return;
    }

    if (!this.isValidTransaction(transaction)) {
      logger.error('Invalid transaction');
      return;
    }

    this.pendingTransactions.push(transaction);
  }

  private calculateBlockReward(): number {
    const halvings = Math.floor(this.chain.length / this.halvingInterval);
    const reward = this.miningReward / Math.pow(2, halvings);
    return reward < 1 ? 1 : reward;
  }

  // Validate a transaction
  isValidTransaction(transaction: Transaction): boolean {
    if (!transaction.isValid()) {
      logger.error('Invalid transaction');
      return false;
    }

    // genesis transaction
    if (transaction.from === null) {
      return true;
    }

    // ensure sender balance is sufficient
    const senderBalance = this.getBalance(transaction.from);
    if (senderBalance < transaction.amount) {
      logger.error('Insufficient balance');
      return false;
    }

    return true;
  }

  getBalance(publicKey: string): number {
    const address = Wallet.generateAddressFromPublicKey(publicKey);

    return this.getBalanceByAddress(address);
  }

  getBalanceByAddress(address: string): number {
    let balance = 0;
    for (const block of this.chain) {
      for (const transaction of block.transactions) {
        if (transaction.to === address) {
          balance += transaction.amount;
        }

        if (transaction.from === address) {
          balance -= transaction.amount;
        }
      }
    }

    return balance;
  }

  // Mine pending transactions and add them to a new block
  async minePendingTransactions(minerAddress: string): Promise<void> {
    const totalFee = this.pendingTransactions.reduce((sum, transaction) => sum + transaction.fee, 0);
    const blockReward = this.calculateBlockReward();

    // check if adding token exceeds max supply
    if (this.currentSupply + blockReward > this.maxSupply) {
      // miner only gets the fee
      const rewardTransaction = new Transaction(
        null, 
        minerAddress, 
        totalFee, 
        0, // no fee for reward
        'Block reward'
      );
      this.pendingTransactions.push(rewardTransaction);
    } else {
      const rewardTransaction = new Transaction(
        null, 
        minerAddress, 
        this.miningReward, 
        0, // no fee for reward
        'Block reward'
      );
      this.pendingTransactions.push(rewardTransaction);
    }

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

  getCurrentSupply(): number {
    return this.currentSupply;
  }

  getRemainingSupply(): number {
    return this.maxSupply - this.currentSupply;
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