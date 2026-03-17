import {
    isConnected,
    getAddress,
    signTransaction,
    requestAccess
} from "@stellar/freighter-api";
import { Horizon, TransactionBuilder, Networks, Asset, Operation } from "@stellar/stellar-sdk";

// Initialize Horizon testnet server
const server = new Horizon.Server("https://horizon-testnet.stellar.org");

export const checkWalletConnection = async () => {
    const connRes = await isConnected();
    if (connRes.isConnected) {
        const accessRes = await requestAccess();
        if (!accessRes.error && accessRes.address) {
            try {
                const pkRes = await getAddress();
                if (pkRes.address) {
                    return pkRes.address;
                }
            } catch (e) {
                return null;
            }
        }
    }
    return null;
}

export const fetchBalance = async (publicKey: string) => {
    try {
        const account = await server.loadAccount(publicKey);
        const nativeBalance = account.balances.find((b: any) => b.asset_type === "native");
        return nativeBalance ? nativeBalance.balance : "0";
    } catch (error) {
        console.error("Error fetching balance:", error);
        return "0.00"; // Account not found on testnet
    }
}

export const fundTestnetAccount = async (publicKey: string) => {
    // Try to use the friendbot to fund the account if it's new
    try {
        const response = await fetch(`https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`);
        const data = await response.json();
        return data;
    } catch (e) {
        console.error("Failed to call friendbot", e);
        return null;
    }
}

export const sendXLM = async (senderPublicKey: string, destinationPublicKey: string, amount: string) => {
    if (senderPublicKey === destinationPublicKey) {
        throw new Error("Cannot send to yourself.");
    }

    // Load the sender account to get sequence number
    let account;
    try {
        account = await server.loadAccount(senderPublicKey);
    } catch (e) {
        throw new Error("Your account does not exist on the testnet. Please fund it first.");
    }

    // Check if destination exists
    let destinationExists = true;
    try {
        await server.loadAccount(destinationPublicKey);
    } catch (e) {
        destinationExists = false;
    }

    const fee = await server.fetchBaseFee();

    // Build the transaction
    let txBuilder = new TransactionBuilder(account, {
        fee: fee.toString(),
        networkPassphrase: Networks.TESTNET,
    });

    if (destinationExists) {
        txBuilder.addOperation(
            Operation.payment({
                destination: destinationPublicKey,
                asset: Asset.native(),
                amount: amount,
            })
        );
    } else {
        // If not exists, use createAccount
        // Minimum starting balance is 1 XLM. Let's make sure amount >= 1.
        if (parseFloat(amount) < 1) {
            throw new Error("Destination account is unfunded. You must send at least 1 XLM to fund it.");
        }
        txBuilder.addOperation(
            Operation.createAccount({
                destination: destinationPublicKey,
                startingBalance: amount,
            })
        );
    }

    txBuilder.setTimeout(60); // 60 seconds timeout
    const transaction = txBuilder.build();

    // Sign transaction using Freighter
    // First convert to XDR string
    const xdr = transaction.toXDR();
    let signResult;
    try {
        signResult = await signTransaction(xdr, { networkPassphrase: Networks.TESTNET });
        if (signResult.error) {
            throw new Error(signResult.error as string);
        }
    } catch (e) {
        throw new Error("User rejected transaction or Freighter error.");
    }

    // Read the signed XDR back
    try {
        const signedTxXdr = signResult.signedTxXdr;
        const tx = TransactionBuilder.fromXDR(signedTxXdr, Networks.TESTNET);
        const response = await server.submitTransaction(tx);
        return response.hash;
    } catch (e) {
        console.error("Error submitting tx:", e);
        throw new Error("Transaction failed on the network. Make sure you have enough XLM.");
    }
}
