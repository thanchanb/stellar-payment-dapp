import { StellarWalletsKit } from '@creit.tech/stellar-wallets-kit/sdk';
import { defaultModules } from '@creit.tech/stellar-wallets-kit/modules/utils';
import {
    Horizon,
    TransactionBuilder,
    Networks,
    Asset,
    Operation,
    rpc,
    Contract,
    nativeToScVal
} from "@stellar/stellar-sdk";

// Initialize Wallets Kit
StellarWalletsKit.init({
    modules: defaultModules(),
    network: Networks.TESTNET
});

export const kit = StellarWalletsKit;

// Initialize Horizon & RPC servers
export const server = new Horizon.Server("https://horizon-testnet.stellar.org");
export const rpcServer = new rpc.Server("https://soroban-testnet.stellar.org");

export const checkWalletConnection = async () => {
    try {
        const { address } = await kit.getAddress();
        return address;
    } catch {
        return null;
    }
}

export const connectWalletKit = async () => {
    try {
        const { address } = await kit.authModal();
        return address;
    } catch {
        return null; // User likely closed the modal or rejected connection
    }
}


export const fetchBalance = async (publicKey: string) => {
    try {
        const account = await server.loadAccount(publicKey);
        const nativeBalance = account.balances.find((b: { asset_type: string; balance: string }) => b.asset_type === "native");
        return nativeBalance ? nativeBalance.balance : "0";
    } catch {
        return "0.00";
    }
}

export const fundTestnetAccount = async (publicKey: string) => {
    try {
        const response = await fetch(`https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`);
        return await response.json();
    } catch {
        return null;
    }
}

export const sendXLM = async (senderPublicKey: string, destinationPublicKey: string, amount: string) => {
    // Basic verification
    if (senderPublicKey === destinationPublicKey) throw new Error("Cannot send to yourself.");

    let account;
    try {
        account = await server.loadAccount(senderPublicKey);
    } catch {
        throw new Error("Your account does not exist on testnet.");
    }

    let destinationExists = true;
    try {
        await server.loadAccount(destinationPublicKey);
    } catch {
        destinationExists = false;
    }

    const fee = await server.fetchBaseFee();
    const txBuilder = new TransactionBuilder(account, {
        fee: fee.toString(),
        networkPassphrase: Networks.TESTNET,
    });

    if (destinationExists) {
        txBuilder.addOperation(
            Operation.payment({ destination: destinationPublicKey, asset: Asset.native(), amount })
        );
    } else {
        if (parseFloat(amount) < 1) throw new Error("Send at least 1 XLM to fund new account.");
        txBuilder.addOperation(
            Operation.createAccount({ destination: destinationPublicKey, startingBalance: amount })
        );
    }

    const transaction = txBuilder.setTimeout(60).build();
    try {
        const { signedTxXdr } = await kit.signTransaction(transaction.toXDR(), { networkPassphrase: Networks.TESTNET, address: senderPublicKey });
        const signedTx = TransactionBuilder.fromXDR(signedTxXdr, Networks.TESTNET);
        const response = await server.submitTransaction(signedTx);
        return response.hash;
    } catch (e) {
        throw new Error(e instanceof Error ? e.message : "User rejected transaction.");
    }
}

// SOROBAN SMART CONTRACT INTERACTIONS
export const invokeContractMethod = async (
    senderPublicKey: string,
    contractId: string,
    method: string,
    args: string[] // We'll assume sending basic inputs as strings/numbers parseable
) => {
    try {
        const account = await server.loadAccount(senderPublicKey);
        const contract = new Contract(contractId);

        const txBuilder = new TransactionBuilder(account, {
            fee: "100000",
            networkPassphrase: Networks.TESTNET,
        });

        // Convert string arguments to ScVal
        const scValArgs = args.map(a => nativeToScVal(isNaN(Number(a)) ? a : Number(a)));

        txBuilder.addOperation(contract.call(method, ...scValArgs));

        const transaction = txBuilder.setTimeout(60).build();

        // Prepare TX
        const preparedTx = await rpcServer.prepareTransaction(transaction);

        // Sign
        const { signedTxXdr } = await kit.signTransaction(preparedTx.toXDR(), { networkPassphrase: Networks.TESTNET, address: senderPublicKey });
        const signedTx = TransactionBuilder.fromXDR(signedTxXdr, Networks.TESTNET);

        // Submit
        const response = await rpcServer.sendTransaction(signedTx);
        // Workaround for error parsing since response type changed
        const anyResp = response as unknown as Record<string, unknown>;
        if (anyResp.errorResultXdr || anyResp.errorResult) {
            throw new Error(`Transaction failed: ${String(anyResp.errorResultXdr || anyResp.errorResult)}`);
        }

        return response.hash;
    } catch (e) {
        throw new Error(e instanceof Error ? e.message : "Contract invocation failed.");
    }
}

export const getTransactionStatus = async (txHash: string) => {
    const statusResp = await rpcServer.getTransaction(txHash);
    return statusResp;
}
