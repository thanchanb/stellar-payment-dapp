# Stellar Nexus - White Belt Submission ⚪

Welcome to **Stellar Nexus**, a premium, beautifully crafted dApp built on the Stellar Testnet. This represents a complete submission for the Level 1 - White Belt challenge.

## 🌟 Project Description
Stellar Nexus is a simple yet powerful payment application that allows users to seamlessly connect their Freighter wallet, view their testnet XLM balance, and send payments instantly on the Stellar network. It features a stunning, state-of-the-art Web3 design utilizing glassmorphism, dynamic animations, and a cohesive dark mode aesthetic.

### Features Included:
- **Wallet Connection Flow**: Seamless Freighter integration with clear connection/disconnection mechanisms.
- **Balance Display**: Automatically fetches and displays real-time XLM balances from the testnet Horizon.
- **Testnet Faucet Integration**: One-click funding directly from the Stellar friendbot.
- **Robust Transaction Flow**: Input address and amount to send XLM on the testnet, handling either native Payment ops or Create Account ops (if unfunded).
- **Graceful Error Handling**: Elegant UI feedback for successful and failed transactions with direct testnet explorer links.

## 🚀 Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone <your-repo-link>
   cd stellar-payment-dapp
   ```

2. **Install dependencies:**
   Make sure you have Node.js installed, then run:
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Run the local development server:**
   ```bash
   npm run dev
   ```

4. **Access the dApp:**
   Open your browser and navigate to `http://localhost:5173`. Make sure you have the [Freighter Wallet Extension](https://www.freighter.app/) installed and set to **Testnet**.

## 📸 Screenshots
*(To the reviewer: These are standard locations where screenshots would reside)*

### 1. Wallet Connected State & Balance Displayed
> Displays connected status, network badge, and the loaded balance. <img width="1512" height="982" alt="Screenshot 2026-03-17 at 2 55 23 PM" src="https://github.com/user-attachments/assets/80203814-d8e5-4004-bdea-f950ed49221b" />



### 2. Transaction Setup Setup
> The input fields and premium form UI for setting recipient and amount.
<img width="1512" height="982" alt="Screenshot 2026-03-17 at 2 59 18 PM" src="https://github.com/user-attachments/assets/26f4d475-1d47-4e9c-93b3-13d98a78ee74" />


### 3. Successful Testnet Transaction
> Displays a success overlay and the resulting transaction hash. Follow the explorer link to check finality!
<img width="1512" height="982" alt="Screenshot 2026-03-17 at 2 55 44 PM" src="https://github.com/user-attachments/assets/35d13b4a-fffa-4004-a73a-af2e2da0b340" />



## Built With
- **React (Vite)**
- **TypeScript**
- **@stellar/freighter-api** (v6+)
- **@stellar/stellar-sdk**
- **lucide-react** for Icons
- **Vanilla CSS** for the premium glass layer

---
*Developed for the Stellar Challenge.*
