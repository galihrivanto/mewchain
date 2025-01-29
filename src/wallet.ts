import crypto from 'crypto';
import fs from 'fs';
import { NetworkClient } from './network';
import { Transaction } from './transaction';
import { getLogger } from './logging';

const logger = getLogger(__filename);

export class Wallet {
  publicKey: string;
  privateKey: string;
  address: string;

  constructor(privateKey?: string) {
    if (privateKey) {
      this.privateKey = privateKey;
      const publicKey = crypto.createPublicKey(privateKey);
      this.publicKey = publicKey.export({ format: 'pem', type: 'spki' }).toString();
    } else {
      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
          modulusLength: 2048,
          publicKeyEncoding: { type: 'spki', format: 'pem' },
          privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });
      this.publicKey = publicKey;
      this.privateKey = privateKey;
    }

    this.address = this.generateAddress();
  }

  private generateAddress(): string {
    return Wallet.generateAddressFromPublicKey(this.publicKey);
  }

  static generateAddressFromPublicKey(publicKey: string): string {
    const cleanPublicKey = publicKey
      .replace('-----BEGIN PUBLIC KEY-----', '')
      .replace('-----END PUBLIC KEY-----', '')
      .replace(/\n/g, '');
    
     // Create a hash of the public key
     const hash = crypto
     .createHash('sha256')
     .update(cleanPublicKey)
     .digest('hex');
   
    // Take the first 40 characters of the hash as the address
    return '0x' + hash.slice(0, 40);
  }

  static load(walletFile: string): Wallet {
    const privateKey = fs.readFileSync(walletFile, 'utf8');
    return new Wallet(privateKey);
  }

  save(walletFile: string): void {
    fs.writeFileSync(walletFile, this.privateKey);
  }

  async getBalance(): Promise<number> {
    return new Promise(async (resolve, reject) => {
      const networkClient = new NetworkClient();
      await networkClient.start();
      let responseReceived = false;

      // timeout after network connected
      const timeout = setTimeout(() => {
        if (!responseReceived) {
          networkClient.close();
          reject(new Error('Balance query timeout'));
        }
      }, 60000); // 60 second timeout
  
      networkClient.swarm.on('connection', (socket: any) => {
        // Send balance query request
        socket.write(JSON.stringify({
          type: 'balance_query',
          data: {
            address: this.address
          }
        }));

        // Listen for response
        socket.on('data', (data: Buffer) => {
          try {
            const response = JSON.parse(data.toString());
            if (response.type === 'balance_response') {
              responseReceived = true;
              clearTimeout(timeout);
              networkClient.close();

              const balance = response.data;
              resolve(balance);
            }
          } catch (error) {
            reject(new Error('Invalid balance response'));
          }
        });
      });
    });
  }

  async send(to: string, amount: number, message?: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const networkClient = new NetworkClient();
      await networkClient.start();

      const transaction = new Transaction(this.publicKey, to, amount, 1, message);
      await networkClient.broadcastTransaction(transaction);
      networkClient.close();

      logger.info('Transaction sent');
      logger.info(`Amount sent: ${amount}`);
    })
  }

  sign(data: string): string {
    const sign = crypto.createSign('SHA256');
    sign.update(data).end();
    return sign.sign(this.privateKey, 'hex');
  }

  static verifySignature(publicKey: string, signature: string, data: string): boolean {
    const verify = crypto.createVerify('SHA256');
    verify.update(data);
    return verify.verify(publicKey, signature, 'hex');
  }
}