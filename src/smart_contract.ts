import { Transaction } from './transaction';
import { Blockchain } from './blockchain';

export class SmartContract {
  address: string;
  data: { [key: string]: any };

  constructor(address: string) {
    this.address = address;
    this.data = {};
  }

  execute(transaction: Transaction, blockchain: Blockchain): void {
    if (transaction.to !== this.address) {
      throw new Error('Transaction not addressed to this contract');
    }

    if (transaction.amount === 0) {
      if (transaction.from !== null) {
        this.data[transaction.from] = transaction.data;
      }
    }
  }

  getData(address: string): any {
    return this.data[address];
  }
}