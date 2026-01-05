# Web3

Hands-on blockchain learning - from running nodes to writing smart contracts.

> **Navigation**: [← Back to Apps README](../README.md)

## Documentation

- **[IPFS Documentation](https://docs.ipfs.tech/)** - Distributed file system
- **[Ethereum Node Guide](https://ethereum.org/en/developers/docs/nodes-and-clients/run-a-node/)** - Running Ethereum nodes
- **[Foundry Book](https://book.getfoundry.sh/)** - Smart contract development
- **[EVM Codes](https://www.evm.codes/)** - EVM opcode reference

## Why This Exists

The blockchain space spans infrastructure (running nodes, indexing data, query layers) to application development (smart contracts, dApps). Understanding the full stack requires actually running it, not just reading whitepapers.

This project aims to build that understanding from the ground up - starting with infrastructure fundamentals and progressing to application development.

## Goals

1. **Learn web3 fundamentals** by running actual infrastructure, not just consuming APIs
2. **Understand blockchain architecture** - how nodes work, how networks propagate data, how consensus happens
3. **Build toward EVM expertise** - understand Ethereum Virtual Machine internals for smart contract work
4. **Self-host web3 services** instead of relying on centralized providers (Infura, Alchemy, etc.)

## Design Principles

- **True P2P participation** - interact directly with networks at the protocol level
- **Progressive learning** - start simple, build complexity as understanding grows
- **Practical over theoretical** - learn by running, breaking, and fixing things

## Learning Path

A structured progression from simple to complex:

### Phase 1: IPFS (Content-Addressed Storage)

Start here. IPFS is the foundation of decentralized storage.

**What you'll learn:**

- Content-addressing (files identified by hash, not location)
- P2P networking (how nodes discover and share data)
- Pinning (keeping content available)

**What it is:** A distributed file system where content is addressed by its cryptographic hash. When you "pin" content, you're saying "I'll keep this available for the network."

### Phase 2: Ethereum Full Node

Run the actual Ethereum network locally.

**What you'll learn:**

- Blockchain state (how the chain stores everything)
- Execution vs Consensus layers (post-Merge architecture)
- RPC interfaces (how apps talk to the chain)
- Block propagation (how new blocks spread through the network)

**Key concepts:**

- **Mainnet**: The real Ethereum network. Real money, real consequences. ~2.5TB storage.
- **Testnet**: Practice networks with fake money. Same code, no financial risk.
  - **Sepolia**: Primary testnet for app developers (~50GB storage)
  - **Holesky**: Testnet for staking/validator testing (~200GB storage)

Start with a testnet to validate the setup, then graduate to mainnet if resources allow.

### Phase 3: EVM Deep Dive

Once the node is running, understand what it's actually doing.

**What you'll learn:**

- How the EVM executes bytecode
- Gas mechanics (why transactions cost what they cost)
- State storage (how contract data is organized)
- Transaction lifecycle (from submission to finality)

### Phase 4: Smart Contract Development

Write and deploy your own contracts.

**What you'll learn:**

- Solidity fundamentals
- Testing patterns (unit tests, fuzz tests)
- Deployment workflows (testnet → mainnet)
- Contract verification and interaction

**What you'll need:**

- Local development environment (Foundry/Anvil or Hardhat)
- Testnet ETH (free from faucets)

### Phase 5: Oracles and Middleware

Blockchains are intentionally isolated - they can't access external data on their own. Oracles solve this.

**What you'll learn:**

- Why blockchains can't access external data (determinism requirement)
- How oracles bridge on-chain and off-chain worlds
- Chainlink architecture (decentralized oracle network)
- Consuming oracle data in smart contracts (price feeds, VRF, automation)

**What it is:** Chainlink is the de facto standard for Web3 oracles. It provides:

- **Price Feeds** - real-time asset prices for DeFi
- **VRF** - verifiable randomness for games/NFTs
- **Automation** - trigger contract functions based on conditions
- **Functions** - call external APIs from contracts

**Infrastructure option:** Running a Chainlink node is possible but complex. Start by consuming existing oracle data, explore running a node later.

### Phase 6: dApp Development

Build a complete decentralized application.

**What you'll learn:**

- Frontend integration with smart contracts (ethers.js, viem, wagmi)
- Wallet connection flows (MetaMask, WalletConnect)
- Transaction lifecycle from UI to chain
- IPFS-hosted frontends (truly decentralized hosting)

**The full stack:**

| Layer     | Component     | Where it runs          |
| --------- | ------------- | ---------------------- |
| Frontend  | React/Vue app | Your cluster (or IPFS) |
| RPC       | Ethereum node | Your cluster           |
| Oracles   | Chainlink     | Chainlink network      |
| Contracts | Solidity      | On-chain               |
| Storage   | IPFS          | Your cluster           |

End goal: a self-hosted dApp where you control everything from node to UI, with zero dependency on centralized providers.

### Side Quest: CPU Mining

Not part of the learning path, but a practical "proof it works" project.

**What it is:** Monero (XMR) CPU mining, controlled by solar power availability.

**Why Monero:**

- CPU-mineable (no GPU required)
- RandomX algorithm is ASIC-resistant by design
- Can run on existing cluster nodes

**Phased approach:**

1. **Always-on miner** - Deploy XMRig, let it run, validate it works
2. **Webhook control** - Home Assistant sends binary signal (mine/don't mine) based on solar generation
3. **KEDA integration (future)** - Kubernetes-native autoscaling based on solar metrics

**Architecture:**

```
SolarEdge → Home Assistant → Webhook → Mining Deployment (0 or N replicas)
```

**Future enhancement:** Replace webhook with KEDA ScaledObject reading solar metrics from Prometheus for proper cloud-native autoscaling.

## Planned Deployments

### IPFS Node

- **Purpose**: Learn content-addressing, host your own content, contribute to the swarm
- **Resources**: Low (~200m CPU, 512Mi RAM, 100Gi storage)
- **Ports**: 4001 (swarm), 5001 (API), 8080 (gateway)

### Ethereum Node (Testnet First)

- **Purpose**: Understand blockchain state, serve your own queries, help propagate blocks
- **Resources (Sepolia)**: Moderate (~2 CPU cores, 8Gi RAM, 100Gi storage)
- **Resources (Mainnet)**: High (~3 CPU cores, 12Gi RAM, 2.5Ti storage)
- **Components**:
  - Execution layer (Nethermind/Geth/Erigon) - processes transactions
  - Consensus layer (Lighthouse/Prysm) - participates in block finalization

### Future: Smart Contract Dev Environment

- **Purpose**: Write, test, and deploy smart contracts locally
- **Tools**: Foundry (Anvil for local chain, Forge for testing)
- **Deployment**: Comes after Ethereum node is understood

## Resource Considerations

| Deployment         | CPU         | Memory    | Storage | Network      |
| ------------------ | ----------- | --------- | ------- | ------------ |
| IPFS               | 200m-2000m  | 512Mi-4Gi | 100Gi   | 4001/tcp+udp |
| Ethereum (Sepolia) | 1500m-3000m | 6Gi-12Gi  | 100Gi   | 30303, 9000  |
| Ethereum (Mainnet) | 3000m-6000m | 12Gi-24Gi | 2.5Ti   | 30303, 9000  |

Start with Sepolia testnet. Graduate to mainnet when comfortable and storage is available.
