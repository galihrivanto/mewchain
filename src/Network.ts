const Hyperswarm = require('hyperswarm');
import crypto from 'crypto';
import { Blockchain } from './Blockchain';

export class Network {
  swarm: any;
  blockchain: Blockchain;
  topic: Buffer;

  constructor(blockchain: Blockchain) {
    this.swarm = new Hyperswarm();
    this.blockchain = blockchain;
    this.topic = crypto.createHash('sha256').update('mewchain-network').digest();

    this.swarm.join(this.topic, {
      lookup: true,
      announce: true,
    });

    this.swarm.on('connection', (socket: any, info: any) => {
      console.log('New peer connected!');

      // Send the latest blockchain to the new peer
      socket.write(JSON.stringify({ type: 'blockchain', data: this.blockchain.chain }));

      // Listen for incoming data
      socket.on('data', (data: any) => {
        const message = JSON.parse(data.toString());

        if (message.type === 'blockchain') {
          // Replace the local blockchain if the incoming one is longer and valid
          if (message.data.length > this.blockchain.chain.length && this.blockchain.isChainValid()) {
            console.log('Replacing local blockchain with incoming blockchain');
            this.blockchain.chain = message.data;
          }
        } else if (message.type === 'transaction') {
          // Add the transaction to the pending transactions pool
          console.log('New transaction received:', message.data);
          this.blockchain.addTransaction(message.data);
        } else if (message.type === 'block') {
          // Add the block to the blockchain
          console.log('New block received:', message.data);
          this.blockchain.addBlock(message.data);
        }
      });

      // Handle peer disconnection
      socket.on('close', () => {
        console.log('Peer disconnected');
      });
    });
  }

  broadcastBlockchain(): void {
    for (const peer of this.swarm.connections) {
      peer.write(JSON.stringify({ type: 'blockchain', data: this.blockchain.chain }));
    }
  }

  broadcastTransaction(transaction: any): void {
    for (const peer of this.swarm.connections) {
      peer.write(JSON.stringify({ type: 'transaction', data: transaction }));
    }
  }

  broadcastBlock(block: any): void {
    for (const peer of this.swarm.connections) {
      peer.write(JSON.stringify({ type: 'block', data: block }));
    }
  }
}