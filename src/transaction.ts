import crypto from 'crypto';
import { Wallet } from './wallet';

export class Transaction {
  from: string | null;
  to: string;
  amount: number;
  data: any;
  timestamp: number;
  signature: string | null;
  fee: number;
  
  // sender public key
  publicKey: string | null;

  constructor(from: string | null, to: string, amount: number, fee: number, data: any = null) {
    this.from = from;
    this.to = to;
    this.amount = amount;
    this.fee = fee;
    this.data = data;
    this.timestamp = Date.now();
    this.signature = null;
    this.publicKey = null;
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

    this.publicKey = wallet.publicKey;
    const hash = this.calculateHash();
    this.signature = wallet.sign(hash);
  }

  isValid(): boolean {
    if (this.from === null) return true;
    
    if (!this.signature || !this.publicKey) {
      throw new Error('No signature in this transaction');
    }

    const derivedAddress = Wallet.generateAddressFromPublicKey(this.publicKey);
    if (derivedAddress !== this.from) {
      throw new Error('Invalid signature');
    }

    return Wallet.verifySignature(derivedAddress, this.signature, this.calculateHash());
  }
}