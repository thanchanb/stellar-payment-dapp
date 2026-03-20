import { useState, useEffect } from 'react';
import { Wallet, LogOut, Send, ArrowRight, CheckCircle, AlertCircle, RefreshCw, Code } from 'lucide-react';
import {
  checkWalletConnection,
  connectWalletKit,
  fetchBalance,
  sendXLM,
  invokeContractMethod,
  getTransactionStatus
} from './lib/stellar';
import './index.css';

function App() {
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>("0.00");

  // Payment State
  const [recipient, setRecipient] = useState<string>("");
  const [amount, setAmount] = useState<string>("");

  // Contract State
  const [contractId, setContractId] = useState<string>("");
  const [method, setMethod] = useState<string>("");
  const [args, setArgs] = useState<string>("");
  const [contractTxStatus, setContractTxStatus] = useState<string>("");

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'pending', message: string, txHash?: string } | null>(null);

  // Auto connect logic
  useEffect(() => {
    const init = async () => {
      const addr = await checkWalletConnection();
      if (addr) {
        setAddress(addr);
        updateBalance(addr);
      }
    };
    init();
  }, []);

  const updateBalance = async (pubKey: string) => {
    try {
      const b = await fetchBalance(pubKey);
      setBalance(b);
    } catch {
      setBalance("0.00");
    }
  };

  const connectWallet = async () => {
    setStatus(null);
    setIsConnecting(true);
    try {
      const connectedAddress = await connectWalletKit();
      if (connectedAddress) {
        setAddress(connectedAddress);
        await updateBalance(connectedAddress);
        setStatus({ type: 'success', message: 'Wallet connected successfully!' });
      } else {
        throw new Error("Wallet not found or rejected popup.");
      }
    } catch (err: unknown) {
      setStatus({ type: 'error', message: err instanceof Error ? err.message : "Failed to connect wallet via Kit." });
    }
    setIsConnecting(false);
  };

  const disconnectWallet = () => {
    setAddress(null);
    setBalance("0.00");
    setStatus(null);
    setRecipient("");
    setAmount("");
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;

    setIsLoading(true);
    setStatus(null);

    try {
      if (!recipient || !amount) {
        throw new Error("Please fill in both recipient and amount.");
      }

      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error("Invalid amount.");
      }

      if (parseFloat(balance) < parsedAmount) {
        throw new Error("Insufficient XLM balance.");
      }

      const txHash = await sendXLM(address, recipient, amount);

      setStatus({
        type: 'success',
        message: `Transaction verified successfully.`,
        txHash: typeof txHash === 'string' ? txHash : JSON.stringify(txHash)
      });

      setAmount("");
      setRecipient("");

      await updateBalance(address);
    } catch (err: unknown) {
      setStatus({ type: 'error', message: err instanceof Error ? err.message : "Transaction failed." });
    }
    setIsLoading(false);
  };

  const requestFaucet = async () => {
    if (!address) return;
    setIsLoading(true);
    try {
      const res = await fetch(`https://friendbot.stellar.org?addr=${encodeURIComponent(address)}`);
      if (!res.ok) throw new Error("Friendbot failed or you're already funded.");
      setStatus({ type: 'success', message: '10,000 Testnet XLM requested seamlessly!' });
      await updateBalance(address);
    } catch (e: unknown) {
      setStatus({ type: 'error', message: e instanceof Error ? e.message : "Faucet error." });
    }
    setIsLoading(false);
  };

  const handleContractSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;
    setIsLoading(true);
    setStatus(null);
    setContractTxStatus("Deploying/Executing...");

    try {
      const argsArray = args ? args.split(",").map(a => a.trim()) : [];
      const hash = await invokeContractMethod(address, contractId, method, argsArray);

      setStatus({ type: 'pending', message: 'Transaction submitted. Waiting for confirmation...', txHash: hash });
      setContractTxStatus("PENDING");

      // Event Listening & Status Synchronization logic
      let attempts = 0;
      const pollInterval = setInterval(async () => {
        attempts++;
        const statusResp = await getTransactionStatus(hash);

        if (statusResp.status === "SUCCESS") {
          clearInterval(pollInterval);
          setContractTxStatus("SUCCESS");
          setStatus({ type: 'success', message: 'Contract execution SUCCESSFUL! Reads/Writes fully confirmed.', txHash: hash });
          setIsLoading(false);
          await updateBalance(address);
        } else if (statusResp.status === "FAILED") {
          clearInterval(pollInterval);
          setContractTxStatus("FAILED");
          setStatus({ type: 'error', message: 'Contract execution FAILED on-chain.' });
          setIsLoading(false);
        } else if (attempts > 15) {
          clearInterval(pollInterval);
          setContractTxStatus("UNKNOWN");
          setStatus({ type: 'error', message: 'Timed out waiting for confirmation.' });
          setIsLoading(false);
        }
      }, 3000);

    } catch (err: unknown) {
      setContractTxStatus("REJECTED/FAILED");
      setStatus({ type: 'error', message: err instanceof Error ? err.message : "Contract call failed." });
      setIsLoading(false);
    }
  }

  return (
    <div className="app-container animate-fade-in">
      <div className="glass-panel" style={{ maxWidth: '600px', width: '100%' }}>
        <div className="header">
          <h1>Stellar Nexus</h1>
          <p>Seamless Light-Speed Payments & Smart Contracts</p>
        </div>

        {!address ? (
          <div className="connect-prompt">
            <button
              className="btn"
              onClick={connectWallet}
              disabled={isConnecting}
              style={{ fontSize: '1.2rem', padding: '1rem 2.5rem' }}
            >
              {isConnecting ? (
                <RefreshCw className="spinner" size={24} />
              ) : (
                <Wallet size={24} />
              )}
              {isConnecting ? "Connecting..." : "Connect Stellar Wallets Kit"}
            </button>
            <p style={{ marginTop: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Interact with multiple wallets seamlessly via StellarWalletsKit.
            </p>
          </div>
        ) : (
          <div>
            <div className="wallet-badge">
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success-color)' }}></span>
              {address.substring(0, 6)}...{address.substring(address.length - 4)}
              <span className="network-badge">TESTNET</span>
            </div>

            <div className="balance-card">
              <div>
                <div className="balance-label">Available Balance</div>
                <div className="balance-amount">
                  {parseFloat(balance).toLocaleString()} <span style={{ fontSize: '1.25rem', color: 'var(--text-secondary)' }}>XLM</span>
                </div>
              </div>
              <div>
                <button className="btn btn-outline" onClick={requestFaucet} disabled={isLoading} style={{ padding: '0.6rem 1rem', fontSize: '0.85rem', marginBottom: '0.5rem', width: '100%', display: 'flex' }}>
                  ⚡ Fund Wallet
                </button>
                <button className="btn btn-outline" onClick={disconnectWallet} style={{ padding: '0.6rem 1rem', fontSize: '0.85rem', width: '100%', borderColor: 'rgba(255, 118, 117, 0.3)', color: 'var(--error-color)' }}>
                  <LogOut size={16} /> Disconnect
                </button>
              </div>
            </div>

            <div style={{ marginTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem' }}>
              <h3 style={{ marginBottom: '1rem', color: '#fff', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Send size={18} /> Direct Payment
              </h3>
              <form onSubmit={handleSend}>
                <div className="form-group">
                  <label className="label">Recipient Address</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="G..."
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div className="form-group">
                  <label className="label">Amount (XLM)</label>
                  <input
                    type="number"
                    step="0.0000001"
                    className="input-field"
                    placeholder="0.0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <button
                  type="submit"
                  className="btn"
                  style={{ width: '100%', marginTop: '0.5rem' }}
                  disabled={isLoading}
                >
                  {isLoading && contractTxStatus === "" ? (
                    <RefreshCw className="spinner" size={20} />
                  ) : (
                    <Send size={20} />
                  )}
                  {"Send XLM"}
                </button>
              </form>
            </div>

            <div style={{ marginTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem' }}>
              <h3 style={{ marginBottom: '1rem', color: '#fff', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Code size={18} /> Interact with Smart Contract
              </h3>
              <form onSubmit={handleContractSubmit}>
                <div className="form-group">
                  <label className="label">Contract ID</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="C..."
                    value={contractId}
                    onChange={(e) => setContractId(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="label">Method</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. increment"
                      value={method}
                      onChange={(e) => setMethod(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="form-group" style={{ flex: 2 }}>
                    <label className="label">Arguments (comma separated)</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. 10, value2"
                      value={args}
                      onChange={(e) => setArgs(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="btn"
                  style={{ width: '100%', marginTop: '0.5rem', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
                  disabled={isLoading}
                >
                  {isLoading && contractTxStatus !== "" ? (
                    <RefreshCw className="spinner" size={20} />
                  ) : (
                    <Code size={20} />
                  )}
                  {contractTxStatus ? `Status: ${contractTxStatus}` : "Invoke Contract"}
                </button>
              </form>
            </div>
          </div>
        )}

        {status && (
          <div className={`status-message ${status.type === 'success' ? 'status-success' : status.type === 'pending' ? 'status-pending' : 'status-error'} animate-fade-in`} style={{ marginTop: '1.5rem' }}>
            {status.type === 'success' ? <CheckCircle size={20} /> : status.type === 'pending' ? <RefreshCw className="spinner" size={20} /> : <AlertCircle size={20} />}
            <div style={{ wordBreak: 'break-word' }}>
              <div>{status.message}</div>
              {status.txHash && (
                <div style={{ marginTop: '0.25rem', fontSize: '0.8rem', opacity: 0.9 }}>
                  Tx: {status.txHash.length > 30 ? status.txHash.substring(0, 15) + "..." + status.txHash.substring(status.txHash.length - 15) : status.txHash}
                  <a href={`https://testnet.steexp.com/tx/${status.txHash}`} target="_blank" rel="noreferrer" style={{ color: 'inherit', marginLeft: '0.5rem', textDecoration: 'underline' }}>
                    View Explorer <ArrowRight size={12} style={{ display: 'inline' }} />
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
