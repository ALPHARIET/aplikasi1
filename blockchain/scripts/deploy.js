/**
 * Script untuk deploy DocumentRegistry ke blockchain.
 *
 * Cara menjalankan:
 * 1. Jalankan Hardhat local node di terminal terpisah:
 *    npx hardhat node
 *
 * 2. Deploy ke local node:
 *    npx hardhat run scripts/deploy.js --network localhost
 *
 * 3. Catat contract address yang ditampilkan — dibutuhkan oleh backend.
 */

import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("Deploying DocumentRegistry...\n");

  // Buat network connection (Hardhat 3)
  const { ethers, networkName } = await hre.network.connect();

  // Ambil deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deployer address:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", ethers.formatEther(balance), "ETH\n");

  // Deploy contract
  const DocumentRegistry = await ethers.getContractFactory("DocumentRegistry");
  const registry = await DocumentRegistry.deploy();
  await registry.waitForDeployment();

  const contractAddress = await registry.getAddress();

  console.log("========================================");
  console.log("DocumentRegistry deployed successfully!");
  console.log("========================================");
  console.log("Contract address:", contractAddress);
  console.log("Owner address:  ", deployer.address);
  console.log("Network:        ", networkName);
  console.log("========================================\n");

  // Simpan deployment info ke file JSON untuk digunakan backend
  const artifactPath = path.join(
    __dirname,
    "../artifacts/contracts/DocumentRegistry.sol/DocumentRegistry.json"
  );
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  const deploymentInfo = {
    contractAddress: contractAddress,
    ownerAddress: deployer.address,
    network: networkName,
    deployedAt: new Date().toISOString(),
    abi: artifact.abi,
  };

  const outputPath = path.join(__dirname, "../deployment.json");
  fs.writeFileSync(outputPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("Deployment info saved to:", outputPath);
  console.log(
    "\nGunakan contract address di atas untuk konfigurasi backend (.env)"
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
