import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers'; // ✅ FIXED IMPORT for V5
import { useWallets } from '@privy-io/react-auth';
import { socket } from './App';

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

  const ETH_PRICE_RATE = 0.0003; 

  useEffect(() => {
    socket.on('depositError', (msg) => { setStatus(msg); setIsError(true); setLoading(false); });
    socket.on('depositSuccess', (msg) => { setStatus(msg); setIsError(false); setLoading(false); setTimeout(onClose, 2000); });
    
    socket.on('withdrawError', (msg) => { setStatus(msg); setIsError(true); setLoading(false); });
    socket.on('withdrawSuccess', (msg) => { 
        setStatus(msg); setIsError(false); setLoading(false); 
        setAmountUSD(""); 
        if(userEmail) socket.emit('getWithdrawals', userEmail);
    });

    socket.on('withdrawalHistory', (data) => { setHistory(data || []); });

    return () => { 
        socket.off('depositError'); socket.off('depositSuccess'); 
        socket.off('withdrawError'); socket.off('withdrawSuccess');
        socket.off('withdrawalHistory');
    };
  }, [userEmail, onClose]);

  useEffect(() => {
      if (mode === 'WITHDRAW' && userEmail) {
          setStatus("Loading history...");
          socket.emit('getWithdrawals', userEmail);
      } else {
          setStatus("");
      }
  }, [mode, userEmail]);

  const handleAutoDeposit = async () => {
    if (!amountUSD || parseFloat(amountUSD) <= 0) return;
    setLoading(true); setIsError(false); setStatus("Initiating Transaction...");
    try {
      const w = wallets.find(w => w.address.toLowerCase() === userAddress.toLowerCase());
      if (!w) throw new Error("Wallet not connected. Try Manual Mode.");
      
      const ethAmount = (parseFloat(amountUSD) * ETH_PRICE_RATE).toFixed(6);
      
      await w.switchChain(8453);
      
      // ✅ FIXED: Using ethers.utils.parseEther for V5 compatibility
      const valWei = ethers.utils.parseEther(ethAmount);

      const hash = await w.sendTransaction({ 
          to: TREASURY_ADDRESS, 
          value: valWei, 
          chainId: 8453 
      });
      
      submitDeposit(hash, amountUSD);
    } catch (e) {
      console.error(e); 
      setStatus("❌ Wallet Error. Try Manual Mode."); 
      setIsError(true); setLoading(false);
    }
  };

  const handleManualSubmit = () => {
    if (!manualHash || manualHash.length < 10) { setStatus("❌ Invalid Transaction Hash"); setIsError(true); return; }
    submitDeposit(manualHash, "0");
  };

  const submitDeposit = (hash, amt) => {
    setStatus("Verifying on Blockchain... (Please Wait)"); setIsError(false); setLoading(true);
    socket.emit('confirmDeposit', { email: userEmail, amount: amt, txHash: hash });
  };

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

        {mode === 'AUTO' && (
          <div className="tab-content fade-in">
            <p className="hint">Rate: $1 ≈ {ETH_PRICE_RATE} ETH (Base Chain)</p>
            <input className="input-field" type="number" placeholder="Amount in USD (e.g. 20)" value={amountUSD} onChange={e => setAmountUSD(e.target.value)} />
            <button className="action-btn" onClick={handleAutoDeposit} disabled={loading}>{loading ? "Processing..." : `DEPOSIT $${amountUSD || '0'}`}</button>
          </div>
        )}

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

        {mode === 'WITHDRAW' && (
          <div className="tab-content fade-in">
            <p className="hint" style={{color:'#fbbf24'}}>⚠️ Minimum Withdraw: $10.00</p>
            <input className="input-field" type="number" placeholder="Amount ($)" value={amountUSD} onChange={e => setAmountUSD(e.target.value)} />
            <input className="input-field" type="text" placeholder="Wallet Address (0x...)" value={withdrawAddress} onChange={e => setWithdrawAddress(e.target.value)} />
            <button className="action-btn withdraw-btn" onClick={handleWithdrawal} disabled={loading}>{loading ? "Sending..." : "REQUEST WITHDRAWAL"}</button>
            <div className="history-section">
                <div className="history-title">RECENT REQUESTS</div>
                <div className="history-list">
                    {history.length === 0 ? <div style={{fontSize:'12px', color:'#64748b', textAlign:'center'}}>No withdrawals yet</div> : 
                        history.map(req => (
                            <div key={req.id} className="history-item">
                                <span className="amt">${parseFloat(req.amount).toFixed(2)}</span>
                                <span className={`badge ${req.status}`}>{req.status === 'paid' ? 'PAID ✅' : 'PENDING ⏳'}</span>
                            </div>
                        ))
                    }
                </div>
            </div>
          </div>
        )}
        <p className="status-text" style={{color: isError ? '#ef4444' : '#22c55e'}}>{status}</p>
      </div>
      <style>{`
        .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); z-index: 9999; display: flex; justify-content: center; align-items: center; backdrop-filter: blur(5px); }
        .glass-card { background: #0f172a; border: 1px solid #334155; border-radius: 16px; padding: 25px; width: 90%; max-width: 420px; color: white; position: relative; }
        .close-btn { position: absolute; top: 15px; right: 15px; background: none; border: none; color: #64748b; font-size: 20px; cursor: pointer; }
        .balance-box { background: rgba(255,255,255,0.05); padding: 15px; border-radius: 10px; text-align: center; margin-bottom: 20px; }
        .balance-box .value { font-size: 28px; color: white; font-weight: 800; }
        .tabs { display: flex; gap: 8px; margin-bottom: 20px; background: rgba(0,0,0,0.3); padding: 4px; border-radius: 10px; }
        .tab { flex: 1; padding: 10px; background: transparent; border: none; color: #64748b; cursor: pointer; border-radius: 8px; font-weight: 600; font-size: 13px; }
        .tab.active { background: #334155; color: white; }
        .input-field { width: 100%; padding: 12px; margin-bottom: 12px; background: rgba(0,0,0,0.4); border: 1px solid #334155; border-radius: 8px; color: white; }
        .action-btn { width: 100%; padding: 14px; background: #fbbf24; border: none; border-radius: 8px; font-weight: 800; color: black; cursor: pointer; }
        .withdraw-btn { background: #ef4444; color: white; }
        .copy-box { background: #1e293b; padding: 10px; border-radius: 8px; font-size: 11px; margin-bottom: 15px; cursor: pointer; border: 1px dashed #475569; text-align: center; }
        .status-text { text-align: center; font-size: 13px; margin-top: 15px; font-weight: bold; }
        .history-section { margin-top: 20px; border-top: 1px solid #334155; padding-top: 15px; }
        .history-title { font-size: 11px; color: #94a3b8; margin-bottom: 10px; font-weight: bold; }
        .history-list { max-height: 120px; overflow-y: auto; }
        .history-item { display: flex; justify-content: space-between; align-items: center; padding: 8px; background: rgba(255,255,255,0.03); border-radius: 6px; margin-bottom: 6px; font-size: 13px; }
        .badge { padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: 800; }
        .badge.paid { background: rgba(34, 197, 94, 0.2); color: #4ade80; }
        .badge.pending { background: rgba(251, 191, 36, 0.2); color: #fbbf24; }
      `}</style>
    </div>
  );
};

export default WalletVault;

