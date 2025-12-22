import React, { useState, useEffect } from 'react';
import { parseEther } from 'ethers';
import { useWallets } from '@privy-io/react-auth'; // Ensure you have this installed
import { socket } from './App'; // Imports the socket connection from main App

// ⚠️ REPLACE THIS WITH YOUR OWN WALLET ADDRESS
const TREASURY_ADDRESS = "0x946E8F196a0da331b7231980bEf473Cb0316383F"; 

const WalletVault = ({ onClose, userAddress, userEmail, currentCredits }) => {
  const { wallets } = useWallets();
  const [mode, setMode] = useState('AUTO'); 
  const [amountUSD, setAmountUSD] = useState("");
  const [manualHash, setManualHash] = useState(""); 
  const [withdrawAddress, setWithdrawAddress] = useState(userAddress || ""); 
  const [status, setStatus] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]); 

  const ETH_PRICE_RATE = 0.0003; // Approx rate ($1 = 0.0003 ETH)

  // 1. 🔄 Listen for Server Events (Deposit & Withdraw)
  useEffect(() => {
    socket.on('depositError', (msg) => { 
        setStatus(msg); setIsError(true); setLoading(false); 
    });
    
    socket.on('depositSuccess', (msg) => { 
        setStatus(msg); setIsError(false); setLoading(false); 
        setTimeout(onClose, 2000); // Close modal after success
    });
    
    socket.on('withdrawError', (msg) => { 
        setStatus(msg); setIsError(true); setLoading(false); 
    });
    
    socket.on('withdrawSuccess', (msg) => { 
        setStatus(msg); setIsError(false); setLoading(false); 
        setAmountUSD(""); // Clear input
        // Refresh history immediately
        if(userEmail) socket.emit('getWithdrawals', userEmail);
    });

    // Listen for History List from Server
    socket.on('withdrawalHistory', (data) => {
        console.log("📜 History Loaded:", data); 
        setHistory(data || []);
    });

    // Cleanup listeners on unmount
    return () => { 
        socket.off('depositError'); socket.off('depositSuccess'); 
        socket.off('withdrawError'); socket.off('withdrawSuccess');
        socket.off('withdrawalHistory');
    };
  }, [userEmail, onClose]);

  // 2. 🔄 Fetch History when clicking "Withdraw" Tab
  useEffect(() => {
      if (mode === 'WITHDRAW' && userEmail) {
          setStatus("Loading history...");
          socket.emit('getWithdrawals', userEmail);
      } else {
          setStatus(""); // Clear status when changing tabs
      }
  }, [mode, userEmail]);

  // --- ⚡ ACTIONS ---
  
  // A. Auto Deposit (Connects to Wallet)
  const handleAutoDeposit = async () => {
    if (!amountUSD || parseFloat(amountUSD) <= 0) return;
    setLoading(true); setIsError(false); setStatus("Initiating Transaction...");
    try {
      const w = wallets.find(w => w.address.toLowerCase() === userAddress.toLowerCase());
      if (!w) throw new Error("Wallet not connected. Try Manual Mode.");
      
      const ethAmount = (parseFloat(amountUSD) * ETH_PRICE_RATE).toFixed(6);
      
      // Switch chain to Base (8453)
      await w.switchChain(8453);
      
      const hash = await w.sendTransaction({ 
          to: TREASURY_ADDRESS, 
          value: parseEther(ethAmount), 
          chainId: 8453 
      });
      
      submitDeposit(hash, amountUSD);
    } catch (e) {
      console.error(e); 
      setStatus("❌ Wallet Error. Try Manual Mode."); 
      setIsError(true); setLoading(false);
    }
  };

  // B. Manual Deposit (User Pastes Hash)
  const handleManualSubmit = () => {
    if (!manualHash || manualHash.length < 10) { setStatus("❌ Invalid Transaction Hash"); setIsError(true); return; }
    submitDeposit(manualHash, "0"); // Amount 0 means server calculates it from Hash
  };

  const submitDeposit = (hash, amt) => {
    setStatus("Verifying on Blockchain... (Please Wait)"); setIsError(false); setLoading(true);
    socket.emit('confirmDeposit', { email: userEmail, amount: amt, txHash: hash });
  };

  // C. Withdraw Request
  const handleWithdrawal = () => {
      if (!amountUSD || parseFloat(amountUSD) <= 0) { setStatus("❌ Enter valid amount"); setIsError(true); return; }
      if (parseFloat(amountUSD) < 10) { setStatus("❌ Minimum withdrawal is $10"); setIsError(true); return; }
      if (!withdrawAddress || withdrawAddress.length < 10) { setStatus("❌ Enter valid wallet address"); setIsError(true); return; }
      
      setLoading(true); setIsError(false); setStatus("Processing Request...");
      socket.emit('requestWithdrawal', { email: userEmail, amount: parseFloat(amountUSD), address: withdrawAddress });
  };

  return (
    <div className="modal-overlay">
      <div className="glass-card modal-content">
        <button className="close-btn" onClick={onClose}>✕</button>
        <h2 style={{color: '#fbbf24', margin: '0 0 20px 0', fontSize:'22px'}}>VAULT 🏦</h2>
        
        <div className="balance-box">
          <div className="label">AVAILABLE CREDITS</div>
          <div className="value">${currentCredits.toFixed(2)}</div>
        </div>
        
        <div className="tabs">
          <button className={`tab ${mode === 'AUTO' ? 'active' : ''}`} onClick={() => setMode('AUTO')}>Auto Deposit</button>
          <button className={`tab ${mode === 'MANUAL' ? 'active' : ''}`} onClick={() => setMode('MANUAL')}>Manual</button>
          <button className={`tab ${mode === 'WITHDRAW' ? 'active' : ''}`} onClick={() => setMode('WITHDRAW')}>Withdraw</button>
        </div>

        {/* --- AUTO DEPOSIT --- */}
        {mode === 'AUTO' && (
          <div className="tab-content fade-in">
            <p className="hint">Rate: $1 ≈ {ETH_PRICE_RATE} ETH (Base Chain)</p>
            <input className="input-field" type="number" placeholder="Amount in USD (e.g. 20)" value={amountUSD} onChange={e => setAmountUSD(e.target.value)} />
            <button className="action-btn" onClick={handleAutoDeposit} disabled={loading}>
                {loading ? "Processing..." : `DEPOSIT $${amountUSD || '0'}`}
            </button>
          </div>
        )}

        {/* --- MANUAL DEPOSIT --- */}
        {mode === 'MANUAL' && (
          <div className="tab-content fade-in">
            <div className="copy-box" onClick={() => navigator.clipboard.writeText(TREASURY_ADDRESS)}>
               <div style={{color:'#94a3b8', marginBottom:'4px'}}>TAP TO COPY TREASURY ADDRESS:</div>
               <div style={{wordBreak: 'break-all', color: 'white'}}>{TREASURY_ADDRESS} 📋</div>
            </div>
            <input className="input-field" type="text" placeholder="Paste Transaction Hash (0x...)" value={manualHash} onChange={e => setManualHash(e.target.value)} />
            <button className="action-btn" onClick={handleManualSubmit} disabled={loading}>{loading ? "Verifying..." : "VERIFY DEPOSIT"}</button>
          </div>
        )}

        {/* --- WITHDRAW TAB --- */}
        {mode === 'WITHDRAW' && (
          <div className="tab-content fade-in">
            <p className="hint" style={{color:'#fbbf24'}}>⚠️ Minimum Withdraw: $10.00</p>
            <input className="input-field" type="number" placeholder="Amount to Withdraw ($)" value={amountUSD} onChange={e => setAmountUSD(e.target.value)} />
            <input className="input-field" type="text" placeholder="Your Wallet Address (0x...)" value={withdrawAddress} onChange={e => setWithdrawAddress(e.target.value)} />
            <button className="action-btn withdraw-btn" onClick={handleWithdrawal} disabled={loading}>
                {loading ? "Sending Request..." : "REQUEST WITHDRAWAL"}
            </button>
            
            {/* 📜 WITHDRAWAL HISTORY */}
            <div className="history-section">
                <div className="history-title">RECENT REQUESTS</div>
                <div className="history-list">
                    {history.length === 0 ? (
                        <div style={{fontSize:'12px', color:'#64748b', textAlign:'center', padding:'10px'}}>No withdrawals yet</div>
                    ) : (
                        history.map(req => (
                            <div key={req.id} className="history-item">
                                <span className="amt">${parseFloat(req.amount).toFixed(2)}</span>
                                <span className={`badge ${req.status}`}>
                                    {req.status === 'paid' ? 'PAID ✅' : 'PENDING ⏳'}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>
          </div>
        )}
        
        <p className="status-text" style={{color: isError ? '#ef4444' : '#22c55e'}}>{status}</p>
      </div>

      {/* 🎨 CSS STYLES FOR VAULT */}
      <style>{`
        .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); z-index: 9999; display: flex; justify-content: center; align-items: center; backdrop-filter: blur(5px); }
        .glass-card { background: #0f172a; border: 1px solid #334155; border-radius: 16px; padding: 25px; width: 90%; max-width: 420px; color: white; position: relative; box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
        .close-btn { position: absolute; top: 15px; right: 15px; background: none; border: none; color: #64748b; font-size: 20px; cursor: pointer; }
        .close-btn:hover { color: white; }
        
        .balance-box { background: rgba(255,255,255,0.05); padding: 15px; border-radius: 10px; text-align: center; margin-bottom: 20px; border: 1px solid rgba(255,255,255,0.1); }
        .balance-box .label { font-size: 10px; color: #94a3b8; letter-spacing: 1px; font-weight: bold; margin-bottom: 5px; }
        .balance-box .value { font-size: 28px; color: white; font-weight: 800; }
        
        .tabs { display: flex; gap: 8px; margin-bottom: 20px; background: rgba(0,0,0,0.3); padding: 4px; border-radius: 10px; }
        .tab { flex: 1; padding: 10px; background: transparent; border: none; color: #64748b; cursor: pointer; border-radius: 8px; font-weight: 600; font-size: 13px; transition: 0.2s; }
        .tab:hover { color: white; }
        .tab.active { background: #334155; color: white; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
        
        .input-field { width: 100%; padding: 12px; margin-bottom: 12px; background: rgba(0,0,0,0.4); border: 1px solid #334155; border-radius: 8px; color: white; font-size: 14px; box-sizing: border-box; }
        .input-field:focus { border-color: #fbbf24; outline: none; }
        
        .action-btn { width: 100%; padding: 14px; background: #fbbf24; border: none; border-radius: 8px; font-weight: 800; color: black; cursor: pointer; transition: 0.2s; font-size: 14px; }
        .action-btn:hover { background: #f59e0b; transform: translateY(-1px); }
        .action-btn:disabled { background: #475569; color: #94a3b8; cursor: not-allowed; }
        .withdraw-btn { background: #ef4444; color: white; }
        .withdraw-btn:hover { background: #dc2626; }

        .hint { font-size: 12px; color: #94a3b8; margin-bottom: 10px; text-align: center; }
        .copy-box { background: #1e293b; padding: 10px; border-radius: 8px; font-size: 11px; margin-bottom: 15px; cursor: pointer; border: 1px dashed #475569; text-align: center; }
        .copy-box:hover { border-color: #fbbf24; }

        .status-text { text-align: center; font-size: 13px; margin-top: 15px; font-weight: bold; min-height: 20px; }
        
        .history-section { margin-top: 20px; border-top: 1px solid #334155; padding-top: 15px; }
        .history-title { font-size: 11px; color: #94a3b8; margin-bottom: 10px; font-weight: bold; letter-spacing: 0.5px; }
        .history-list { max-height: 120px; overflow-y: auto; }
        .history-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: rgba(255,255,255,0.03); border-radius: 6px; margin-bottom: 6px; font-size: 13px; }
        .history-item .amt { font-weight: bold; color: white; }
        .badge { padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: 800; }
        .badge.paid { background: rgba(34, 197, 94, 0.2); color: #4ade80; }
        .badge.pending { background: rgba(251, 191, 36, 0.2); color: #fbbf24; }
      `}</style>
    </div>
  );
};

export default WalletVault;

