import crypto from 'crypto';
import { Wallet } from './Wallet';

export class Transaction {
  from: string | null;
  to: string;
  amount: number;
  data: any;
  timestamp: number;
  signature: string | null;

  constructor(from: string | null, to: string, amount: number, data: any = null) {
    this.from = from;
    this.to = to;
    this.amount = amount;
    this.data = data;
    this.timestamp = Date.now();
    this.signature = null;
  }

  calculateHash(): string {
    return crypto
      .createHash('sha256')
      .update(this.from + this.to + this.amount + this.timestamp)
      .digest('hex');
  }

  signTransaction(wallet: Wallet): void {
    if (wallet.publicKey !== this.from) {
      throw new Error('You cannot sign transactions for other wallets!');
    }
    const hash = this.calculateHash();
    this.signature = wallet.sign(hash);
  }

  isValid(): boolean {
    if (this.from === null) return true; // Reward transaction (coinbase)
    if (!this.signature || this.signature.length === 0) {
      throw new Error('No signature in this transaction');
    }
    return Wallet.verifySignature(this.from, this.signature, this.calculateHash());
  }
}