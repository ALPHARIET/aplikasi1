const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Define deployment file path
const deploymentPath = path.join(__dirname, '../../../blockchain/deployment.json');

class BlockchainService {
  constructor() {
    this.provider = null;
    this.wallet = null;
    this.contract = null;
    this.initialized = false;
  }

  async initialize() {
    try {
      if (!fs.existsSync(deploymentPath)) {
        throw new Error('deployment.json not found. Did you deploy the contract?');
      }

      const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
      const contractAddress = process.env.CONTRACT_ADDRESS || deploymentData.contractAddress;
      const rpcUrl = process.env.RPC_URL || 'http://127.0.0.1:8545';
      const privateKey = process.env.OWNER_PRIVATE_KEY; 

      this.provider = new ethers.JsonRpcProvider(rpcUrl);

      // Jika ada private key, buat Wallet (untuk Admin/Write operations)
      if (privateKey) {
        this.wallet = new ethers.Wallet(privateKey, this.provider);
        this.contract = new ethers.Contract(contractAddress, deploymentData.abi, this.wallet);
      } else {
        // Jika tidak, hanya bisa baca (Read-only operations)
        this.contract = new ethers.Contract(contractAddress, deploymentData.abi, this.provider);
      }

      this.initialized = true;
      console.log('✅ Blockchain Service Initialized. Contract:', contractAddress);
    } catch (error) {
      console.error('❌ Failed to initialize Blockchain Service:', error.message);
    }
  }

  /**
   * Menerbitkan dokumen ke blockchain (WRITE)
   */
  async issueDocument(docId, docHash) {
    if (!this.initialized || !this.wallet) throw new Error('Blockchain Service not fully initialized (Requires Private Key)');
    
    try {
      const tx = await this.contract.issueDocument(docId, docHash);
      const receipt = await tx.wait();
      return {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        issuer: receipt.from
      };
    } catch (error) {
      console.error('Blockchain Issue Error:', error);
      throw new Error(`Failed to issue to blockchain: ${error.reason || error.message}`);
    }
  }

  /**
   * Mencabut (revoke) dokumen di blockchain (WRITE)
   */
  async revokeDocument(docId) {
    if (!this.initialized || !this.wallet) throw new Error('Blockchain Service not fully initialized (Requires Private Key)');
    
    try {
      const tx = await this.contract.revokeDocument(docId);
      const receipt = await tx.wait();
      return {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber
      };
    } catch (error) {
      throw new Error(`Failed to revoke on blockchain: ${error.reason || error.message}`);
    }
  }

  /**
   * Verifikasi apakah hash cocok dengan yang ada di blockchain (READ)
   */
  async verifyHash(docId, docHash) {
    if (!this.initialized) throw new Error('Blockchain Service not initialized');
    return await this.contract.verifyHash(docId, docHash);
  }

  /**
   * Dapatkan status validitas dokumen (READ)
   */
  async isDocumentValid(docId) {
    if (!this.initialized) throw new Error('Blockchain Service not initialized');
    return await this.contract.isDocumentValid(docId);
  }
}

// Export a singleton instance
const blockchainService = new BlockchainService();
// Initialize it asynchronously right away, or wait until needed
blockchainService.initialize();

module.exports = blockchainService;
