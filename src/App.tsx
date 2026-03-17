import { useState, useEffect } from 'react';
import { Wallet, LogOut, Send, ArrowRight, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import {
  checkWalletConnection,
  fetchBalance,
  sendXLM
} from './lib/stellar';
import './index.css';

function App() {
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>("0.00");
  const [recipient, setRecipient] = useState<string>("");
  const [amount, setAmount] = useState<string>("");

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string, txHash?: string } | null>(null);

  // Auto connect logic
  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    setIsConnecting(true);
    try {
      // The freighter API checkWalletConnection returns a string (the public key) if connected
      const connectedAddress = await checkWalletConnection();
      if (typeof connectedAddress === 'string') {
        setAddress(connectedAddress);
        updateBalance(connectedAddress);
      }
    } catch (error) {
      console.error("Connection error", error);
    }
    setIsConnecting(false);
  };

  const updateBalance = async (pubKey: string) => {
    try {
      const b = await fetchBalance(pubKey);
      setBalance(b);
    } catch (e) {
      console.error(e);
      setBalance("0.00");
    }
  };

  const connectWallet = async () => {
    setStatus(null);
    setIsConnecting(true);
    try {
      // For some reason if the promise returns a string, we treat it as address
      // Need a proper way to request access but checkWalletConnection handles it.
      const connectedAddress = await checkWalletConnection();
      if (typeof connectedAddress === 'string') {
        setAddress(connectedAddress);
        await updateBalance(connectedAddress);
        setStatus({ type: 'success', message: 'Wallet connected successfully!' });
      } else {
        throw new Error("Freighter not installed or connection rejected.");
      }
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message || "Failed to connect wallet." });
    }
    setIsConnecting(false);
  };

  const disconnectWallet = () => {
    // Freighter doesn't have a direct "disconnect" that revokes permissions via API currently without extra logic, 
    // but we can clear local state to simulate logout
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

      // 1. sendXLM returns the transaction hash
      const txHash = await sendXLM(address, recipient, amount);

      setStatus({
        type: 'success',
        message: `Transaction verified successfully.`,
        txHash: typeof txHash === 'string' ? txHash : JSON.stringify(txHash)
      });

      setAmount("");
      setRecipient("");

      // Update balance
      await updateBalance(address);
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message || "Transaction failed." });
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
    } catch (e: any) {
      setStatus({ type: 'error', message: e.message || "Faucet error." });
    }
    setIsLoading(false);
  };

  return (
    <div className="app-container animate-fade-in">
      <div className="glass-panel">
        <div className="header">
          <h1>Stellar Nexus</h1>
          <p>Seamless Light-Speed Payments on testnet</p>
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
              {isConnecting ? "Connecting..." : "Connect Freighter Browser Wallet"}
            </button>
            <p style={{ marginTop: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Requires Freighter Wallet browser extension on Stellar Testnet.
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
                {isLoading ? (
                  <RefreshCw className="spinner" size={20} />
                ) : (
                  <Send size={20} />
                )}
                {isLoading ? "Processing Transaction..." : "Send Transaction"}
              </button>
            </form>
          </div>
        )}

        {status && (
          <div className={`status-message ${status.type === 'success' ? 'status-success' : 'status-error'} animate-fade-in`}>
            {status.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
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
