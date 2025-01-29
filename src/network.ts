const Hyperswarm = require('hyperswarm');
import crypto from 'crypto';
import { Blockchain } from './blockchain';
import { getLogger } from './logging';

const logger = getLogger(__filename);
const TOPIC: Buffer = crypto.createHash('sha256').update('mewchain-network').digest();

export class Network {
  swarm: any;
  blockchain: Blockchain;

  constructor(blockchain: Blockchain) {
    this.swarm = new Hyperswarm();
    this.blockchain = blockchain;
  }

  async start(): Promise<void> {
    const discovery = this.swarm.join(TOPIC, {
      server: true,
      client: true
    });
    await discovery.flushed();

    this.swarm.on('connection', (socket: any, info: any) => {
      logger.info('New peer connected!', info.server, info.client);

      if (info.server) {
        // Send the latest blockchain to the new peer
        socket.write(JSON.stringify({ type: 'blockchain', data: this.blockchain.chain }));
      }

      // Listen for incoming data
      socket.on('data', (data: any) => {
        try {
          const message = JSON.parse(data.toString());

          if (message.type === 'blockchain') {
            // Replace the local blockchain if the incoming one is longer and valid
            if (message.data.length > this.blockchain.chain.length && this.blockchain.isChainValid()) {
              logger.info('Replacing local blockchain with incoming blockchain');
              this.blockchain.chain = message.data;
            }
          } else if (message.type === 'transaction') {
            // Add the transaction to the pending transactions pool
            logger.info('New transaction received:', message.data);
            this.blockchain.addTransaction(message.data);
          } else if (message.type === 'block') {
            // Add the block to the blockchain
            logger.info('New block received:', message.data);
            this.blockchain.addBlock(message.data);
          } else if (message.type === 'balance_query') {
            // Send the balance of the wallet to the peer
            logger.info('Balance query received:', message.data);
            const balance = this.blockchain.getBalanceByAddress(message.data.address);
            logger.info('Balance response:', balance);
            socket.write(JSON.stringify({ type: 'balance_response', data: balance }));
          }
        } catch (error) {
          logger.error('Error parsing message:', error);
          socket.end();
        }
      });

      // Add error handler for the socket
      socket.on('error', (error: any) => {
        logger.debug('Socket error:', error);
      });

      // Handle peer disconnection
      socket.on('close', () => {
        logger.info('Peer disconnected');
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

  async close(): Promise<void> {
    await this.swarm.leave(TOPIC)
  }
}

export class NetworkClient {
  swarm: any;
  connected: boolean = false;

  constructor() {
    this.swarm = new Hyperswarm();
  }

  async start(): Promise<void> {
   const discovery = this.swarm.join(TOPIC, {
      server: false,
      client: true
    });
    await discovery.flushed();
  }

  async broadcastTransaction(transaction: any): Promise<void> {
    return new Promise((resolve, reject) => {
      let broadcasted = false;
      
      const timeout = setTimeout(() => {
        if (!broadcasted) {
          this.close();
          reject(new Error('Transaction broadcast timeout'));
        }
      }, 30000); // 30 second timeout

      this.swarm.on('connection', (socket: any) => {
        logger.info('Connected to peer for transaction broadcast');
        
        socket.write(JSON.stringify({ type: 'transaction', data: transaction }));
        broadcasted = true;
        
        clearTimeout(timeout);
        this.close();
        resolve();
      });
    });
  }

  async close(): Promise<void> {
    await this.swarm.leave(TOPIC);
  }
}