import { defineConfig } from "hardhat/config";
import hardhatEthers from "@nomicfoundation/hardhat-ethers";
import hardhatNodeTestRunner from "@nomicfoundation/hardhat-node-test-runner";
import hardhatIgnition from "@nomicfoundation/hardhat-ignition";

// ponytail: single config for local + amoy, no plugin bloat — add hardhat-verify only if Polygonscan verify needed
const AMOY_RPC = process.env.POLYGON_AMOY_RPC_URL || "https://rpc-amoy.polygon.technology";
const AMOY_KEY = process.env.POLYGON_AMOY_PRIVATE_KEY || "";

export default defineConfig({
  plugins: [hardhatEthers, hardhatNodeTestRunner, hardhatIgnition],
  solidity: {
    version: "0.8.28",
    settings: { optimizer: { enabled: true, runs: 200 } }
  },
  networks: {
    hardhat: { type: "edr-simulated", chainType: "l1" },
    localhost: {
      type: "http",
      chainType: "l1",
      url: "http://127.0.0.1:8545"
    },
    amoy: {
      type: "http",
      chainType: "l1",
      url: AMOY_RPC,
      accounts: AMOY_KEY ? [AMOY_KEY] : [],
      chainId: 80002
    }
  }
});
