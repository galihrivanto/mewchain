import crypto from 'crypto';

export class Wallet {
  publicKey: string;
  privateKey: string;

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