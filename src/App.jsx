import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import WalletVault from './WalletVault';
import Confetti from 'react-confetti';
import { PrivyProvider, usePrivy, useWallets } from '@privy-io/react-auth';
import { parseEther } from 'viem'; 

// --- CONFIGURATION ---
const PRIVY_APP_ID = "cm4l3033r048epf1ln3q59956";
const SERVER_URL = "https://bidblaze-server.onrender.com"; 
export const socket = io(SERVER_URL, { transports: ['websocket', 'polling'] });

const ASSETS = {
  soundBid: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
  soundWin: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
  soundPop: 'https://assets.mixkit.co/active_storage/sfx/2578/2578-preview.mp3'
};

const ADMIN_WALLET = "0x6edadf13a704cd2518cd2ca9afb5ad9dee3ce34c"; 
const BASE_CHAIN = { id: 8453, name: 'Base', network: 'base', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: { default: { http: ['https://mainnet.base.org'] } }, blockExplorers: { default: { name: 'Basescan', url: 'https://basescan.org' } } };
const BSC_CHAIN = { id: 56, name: 'BNB Smart Chain', network: 'bsc', nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 }, rpcUrls: { default: { http: ['https://bsc-dataseed.binance.org'] } }, blockExplorers: { default: { name: 'BscScan', url: 'https://bscscan.com' } } };
const ETH_CHAIN = { id: 1, name: 'Ethereum', network: 'homestead', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: { default: { http: ['https://cloudflare-eth.com'] } }, blockExplorers: { default: { name: 'Etherscan', url: 'https://etherscan.io' } } };

const HowToPlay = ({ onClose }) => (
    <div className="modal-overlay">
      <div className="glass-card modal-content fade-in" style={{textAlign:'left'}}>
        <button className="close-btn" onClick={onClose}>✕</button>
        <h2 style={{color: '#fbbf24', textAlign:'center'}}>How to Win 🏆</h2>
        <div style={{marginBottom:'15px'}}><strong style={{color:'white'}}>1. Deposit:</strong> <span style={{color:'#94a3b8'}}>Connect Wallet & Pay (BSC/ETH).</span></div>
        <div style={{marginBottom:'15px'}}><strong style={{color:'white'}}>2. Bid:</strong> <span style={{color:'#94a3b8'}}>Each bid costs $1.00 & resets timer.</span></div>
        <div style={{marginBottom:'15px'}}><strong style={{color:'white'}}>3. Win:</strong> <span style={{color:'#94a3b8'}}>Last bidder wins the JACKPOT!</span></div>
        <button className="action-btn" onClick={onClose}>Let's Play</button>
      </div>
    </div>
);

function GameDashboard({ logout, user }) {
  const [gameState, setGameState] = useState(null);
  const [credits, setCredits] = useState(0.00);
  const [isCooldown, setIsCooldown] = useState(false);
  const [cd, setCd] = useState(0);
  const [showVault, setShowVault] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [floatingBids, setFloatingBids] = useState([]);
  const [restartCount, setRestartCount] = useState(15);
  const prevStatus = useRef("ACTIVE");
  const lastBidId = useRef(null);
  const audioRef = useRef(null);
  const { wallets } = useWallets();
  const userAddress = wallets.find(w => w.walletClientType === 'privy')?.address || user.wallet?.address;
  const MY_EMAIL = "tinyearner8@gmail.com";

  const [showDeposit, setShowDeposit] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState('BSC');
  const [statusMsg, setStatusMsg] = useState('');
  const [isProcessing, setIsProcessing] = useState(false); 
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [withdrawHistory, setWithdrawHistory] = useState([]);

  const playSound = (key) => { if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; } const audio = new Audio(ASSETS[key]); audio.volume = 0.5; audioRef.current = audio; audio.play().catch(() => {}); };

  const handleDeposit = async () => {
    const amt = parseFloat(depositAmount);
    if (isNaN(amt) || amt <= 0) return alert("Invalid amount");
    const activeWallet = wallets[0];
    if (!activeWallet) return alert("Connect Wallet");
    setShowDeposit(false); setIsProcessing(true);
    try {
        const provider = await activeWallet.getEthereumProvider();
        const hexValue = "0x" + parseEther(depositAmount.toString()).toString(16);
        const txHash = await provider.request({ method: 'eth_sendTransaction', params: [{ from: activeWallet.address, to: ADMIN_WALLET, value: hexValue }] });
        setIsProcessing(false);
        socket.emit('verifyDeposit', { email: user.email.address, txHash, network: selectedNetwork });
        alert("✅ Sent! Verifying...");
    } catch (e) { setIsProcessing(false); alert("Failed. Check Wallet."); }
  };

  const handleWithdraw = () => {
      const amt = parseFloat(withdrawAmount);
      if (credits < amt) return alert("Insufficient Funds");
      socket.emit('requestWithdrawal', { email: user.email.address, amount: amt, address: withdrawAddress, network: selectedNetwork });
      setWithdrawAmount(''); setWithdrawAddress('');
  };

  useEffect(() => {
    socket.on('depositSuccess', (bal) => { setCredits(bal); setDepositAmount(''); alert("✅ Balance Updated!"); });
    socket.on('depositError', (msg) => alert(`❌ ${msg}`));
    socket.on('withdrawalSuccess', () => alert("✅ Request Sent"));
    socket.on('withdrawalHistory', (data) => setWithdrawHistory(data));
    if(user?.email?.address) socket.emit('getUserBalance', user.email.address);
    socket.on('gameState', (data) => {
      setGameState(data);
      if (data.status === 'ACTIVE' && data.history.length > 0) { if (data.history[0].id !== lastBidId.current) { playSound('soundBid'); lastBidId.current = data.history[0].id; } }
      if (data.status === 'ENDED' && prevStatus.current === 'ACTIVE') { playSound('soundWin'); if (data.lastBidder === user?.email?.address) setTimeout(() => socket.emit('getUserBalance', user.email.address), 1000); }
      prevStatus.current = data.status;
    });
    socket.on('balanceUpdate', (bal) => setCredits(bal));
    return () => { socket.off('gameState'); socket.off('balanceUpdate'); socket.off('depositSuccess'); };
  }, [user]);

  useEffect(() => {
    const t = setInterval(() => { if (gameState?.status === 'ENDED' && gameState?.restartTimer) setRestartCount(Math.ceil((gameState.restartTimer - Date.now())/1000)); }, 100);
    let c; if (isCooldown && cd > 0) c = setInterval(() => setCd(p => p - 1), 1000); else if (cd <= 0) setIsCooldown(false);
    return () => { clearInterval(t); clearInterval(c); };
  }, [gameState?.status, gameState?.restartTimer, isCooldown, cd]);

  const placeBid = () => { if (isCooldown || credits < 1.00) { if(credits < 1) setShowDeposit(true); return; } setFloatingBids(p => [...p, Date.now()]); playSound('soundPop'); socket.emit('placeBid', user.email.address); setIsCooldown(true); setCd(8); };
  
  const runAdmin = () => { const p = prompt("PWD"); if (p) socket.emit('adminAction', { password: p, action: 'RESET' }); };
  if (!gameState) return <div style={{color:'white', padding:'50px'}}>CONNECTING...</div>;

  return (
    <div className="app-container">
      <GlobalStyle />
      {gameState?.status === 'ENDED' && <Confetti width={window.innerWidth} height={window.innerHeight} recycle={false} numberOfPieces={500} colors={['#fbbf24', '#ffffff', '#22c55e']} />}
      {showVault && <WalletVault onClose={() => setShowVault(false)} userAddress={userAddress} userEmail={user.email?.address} currentCredits={credits} />}
      {showHelp && <HowToPlay onClose={() => setShowHelp(false)} />}
      {isProcessing && <div className="modal-overlay"><div className="spinner"></div></div>}

      {showDeposit && (
        <div className="modal-overlay">
          <div className="glass-card modal-content fade-in" style={{textAlign:'left'}}>
            <button className="close-btn" onClick={() => setShowDeposit(false)}>✕</button>
            <h2 style={{color: '#22c55e', textAlign:'center'}}>DEPOSIT</h2>
            <select value={selectedNetwork} onChange={(e) => setSelectedNetwork(e.target.value)} className="input-field"><option value="BSC">BNB Smart Chain</option><option value="ETH">Ethereum</option><option value="BASE">Base</option></select>
            <input type="number" placeholder="0.01" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} className="input-field" />
            <button className="action-btn" onClick={handleDeposit}>🚀 PAY NOW</button>
          </div>
        </div>
      )}

      {showWithdraw && (
        <div className="modal-overlay">
          <div className="glass-card modal-content fade-in" style={{textAlign:'left'}}>
            <button className="close-btn" onClick={() => setShowWithdraw(false)}>✕</button>
            <h2 style={{color: '#ef4444', textAlign:'center'}}>WITHDRAW</h2>
            <input type="number" placeholder="Min $10" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} className="input-field" />
            <input type="text" placeholder="Address" value={withdrawAddress} onChange={(e) => setWithdrawAddress(e.target.value)} className="input-field" />
            <button className="action-btn" onClick={handleWithdraw}>REQUEST</button>
            <div style={{marginTop:'10px', fontSize:'12px'}}>{withdrawHistory.map(i => <div key={i.id} style={{color: i.status === 'PENDING' ? 'orange' : 'green'}}>${i.amount} - {i.status}</div>)}</div>
          </div>
        </div>
      )}

      <nav className="glass-nav">
        <button className="nav-btn vault-btn" onClick={() => setShowDeposit(true)}>🏦 ${credits.toFixed(2)}</button>
        <div className="live-pill">● {gameState.connectedUsers} LIVE</div>
        <div style={{display:'flex', gap:'5px'}}><button className="nav-btn" onClick={() => setShowHelp(true)}>❓</button><button className="nav-btn logout-btn" onClick={logout}>✕</button></div>
      </nav>

      <div className="game-stage">
        <ReactorRing targetDate={gameState.endTime} status={gameState.status} />
        <div className="jackpot-core">
          {gameState.status === 'ACTIVE' ? <><div className="label">JACKPOT</div><div className="amount">${gameState.jackpot.toFixed(2)}</div></> : <div className="restart-box"><div className="restart-label">NEW GAME IN</div><div className="restart-timer">{restartCount}</div><div className="winner-badge">🏆 WINNER: {gameState.history[0]?.user.slice(0,10)}...</div></div>}
        </div>
        {floatingBids.map(id => <div key={id} className="float-anim">-$1.00</div>)}
      </div>

      <button className={`main-btn ${isCooldown ? 'cooldown' : ''}`} onClick={placeBid} disabled={gameState.status !== 'ACTIVE' || isCooldown}>{gameState.status === 'ENDED' ? 'GAME CLOSED' : (isCooldown ? `WAIT (${cd}s)` : `BID ($${gameState.bidCost})`)}</button>

      <div className="action-buttons" style={{display:'flex', gap:'10px', width:'100%', maxWidth:'350px'}}>
        <button className="deposit-btn" onClick={() => setShowDeposit(true)} style={{flex:1, padding:'15px', borderRadius:'10px', background:'#22c55e', border:'none', color:'white', fontWeight:'bold'}}>DEPOSIT</button>
        <button className="withdraw-btn" onClick={() => setShowWithdraw(true)} style={{flex:1, padding:'15px', borderRadius:'10px', background:'#ef4444', border:'none', color:'white', fontWeight:'bold'}}>WITHDRAW</button>
      </div>

      {/* WINNERS PANEL */}
      <div className="glass-panel" style={{marginTop:'20px'}}>
        <div className="panel-header">🏆 RECENT WINS</div>
        {gameState.recentWinners?.length > 0 ? gameState.recentWinners.map((w, i) => <div key={i} className="history-row"><span style={{color:'white'}}>{w.user.slice(0,10)}</span><span style={{color:'#fbbf24'}}>+${w.amount.toFixed(2)}</span></div>) : <div style={{textAlign:'center', fontSize:'12px', color:'#64748b'}}>No recent winners yet.</div>}
      </div>

      {/* ⚠️ LIVE BIDS HISTORY (THIS WAS MISSING) */}
      <div className="glass-panel history-panel" style={{marginTop:'10px'}}>
        <div className="panel-header">LAST 30 BIDS</div>
        <div className="history-list">
          {gameState.history.slice(0, 30).map((bid) => (
            <div key={bid.id} className="history-row">
              <span className="user">{bid.user.split('@')[0].slice(0,12)}...</span>
              <span className="bid-amt">${bid.amount.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
      
      {user?.email?.address === MY_EMAIL && <button onClick={runAdmin} style={{marginTop:'20px'}}>ADMIN</button>}
    </div>
  );
}

const ReactorRing = ({ targetDate, status }) => {
  const [p, setP] = useState(100); const [d, setD] = useState("299");
  useEffect(() => {
    const i = setInterval(() => {
      const dist = targetDate - Date.now();
      if (status === 'ACTIVE') {
        if (dist <= 0) { setD("0"); setP(0); } else { setP((dist/299000)*100); setD(Math.ceil(dist/1000).toString()); }
      } else setP(0);
    }, 50); return () => clearInterval(i);
  }, [targetDate, status]);
  return <div className="reactor-container"><div className="timer-float">{status === 'ACTIVE' ? d : ''}</div><svg className="progress-ring" width="280" height="280"><circle className="ring-bg" stroke="rgba(255,255,255,0.05)" strokeWidth="8" fill="transparent" r="130" cx="140" cy="140"/><circle className="ring-progress" stroke={status === 'ENDED'?'#ef4444':'#fbbf24'} strokeWidth="8" strokeDasharray={`${2*Math.PI*130}`} strokeDashoffset={2*Math.PI*130 - (p/100)*2*Math.PI*130} r="130" cx="140" cy="140"/></svg></div>;
};

function LandingPage({ login }) { return <div className="landing-container"><GlobalStyle/><h1>BidBlaze</h1><button className="start-btn" onClick={login}>Play Now</button></div>; }

const GlobalStyle = () => ( <style>{` @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;500;700;900&display=swap'); :root { --bg-dark: #020617; --glass: rgba(255, 255, 255, 0.05); } body { margin: 0; background: var(--bg-dark); color: white; font-family: 'Outfit', sans-serif; } .app-container { min-height: 100vh; display: flex; flex-direction: column; align-items: center; padding: 20px; } .landing-container { height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; } .glass-nav { width: 100%; max-width: 400px; display: flex; justify-content: space-between; padding: 10px; background: rgba(15,23,42,0.8); border-radius: 15px; border: 1px solid rgba(255,255,255,0.1); margin-bottom: 20px; } .nav-btn { background: none; border: none; color: #94a3b8; font-weight: bold; } .vault-btn { color: #3b82f6; background: rgba(59,130,246,0.1); border-radius: 8px; padding: 5px 10px; } .main-btn { width: 100%; max-width: 300px; padding: 20px; border-radius: 40px; border: none; font-size: 20px; font-weight: 900; color: white; background: #fbbf24; margin-bottom: 20px; box-shadow: 0 5px 15px rgba(251,191,36,0.4); } .main-btn.cooldown { background: #334155; box-shadow: none; color: #64748b; } .start-btn { padding: 15px 40px; font-size: 18px; font-weight: bold; border-radius: 30px; border: none; background: white; color: black; } .game-stage { position: relative; width: 300px; height: 300px; display: flex; justify-content: center; align-items: center; } .reactor-container { position: absolute; width: 100%; height: 100%; } .progress-ring { transform: rotate(-90deg); width: 100%; height: 100%; overflow: visible; } .ring-progress { transition: stroke-dashoffset 0.1s linear; filter: drop-shadow(0 0 10px #fbbf24); } .timer-float { position: absolute; top: -30px; left: 50%; transform: translateX(-50%); font-size: 40px; font-weight: bold; } .jackpot-core { z-index: 10; text-align: center; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); } .jackpot-core .label { font-size: 12px; color: #64748b; letter-spacing: 2px; } .jackpot-core .amount { font-size: 50px; font-weight: 900; } .glass-panel { background: var(--glass); border: 1px solid rgba(255,255,255,0.1); border-radius: 15px; width: 100%; max-width: 350px; padding: 15px; box-sizing: border-box; } .history-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 13px; } .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 100; display: flex; justify-content: center; align-items: center; } .glass-card { background: #0f172a; border: 1px solid #334155; border-radius: 20px; padding: 25px; width: 90%; max-width: 350px; position: relative; } .close-btn { position: absolute; top: 10px; right: 10px; background: none; border: none; color: white; font-size: 20px; } .input-field { width: 100%; background: #1e293b; border: 1px solid #334155; padding: 12px; border-radius: 10px; color: white; margin-bottom: 15px; box-sizing: border-box; } .action-btn { width: 100%; padding: 12px; background: #3b82f6; border: none; border-radius: 10px; color: white; font-weight: bold; } .float-anim { position: absolute; color: #ef4444; font-weight: 900; font-size: 20px; animation: floatUp 0.8s forwards; pointer-events: none; } @keyframes floatUp { 0% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-50px); } } .fade-in { animation: popIn 0.3s ease-out; } @keyframes popIn { 0% { transform: scale(0.9); opacity: 0; } 100% { transform: scale(1); opacity: 1; } } .spinner { border: 4px solid rgba(255,255,255,0.1); border-left-color: #3b82f6; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; } @keyframes spin { 100% { transform: rotate(360deg); } } `}</style> );

export default function App() {
  const { login, logout, user, authenticated, ready } = usePrivy();
  if (!ready) return null;
  return (
    <PrivyProvider appId={PRIVY_APP_ID} config={{ loginMethods: ['email', 'wallet'], appearance: { theme: 'dark', accentColor: '#3b82f6' }, embeddedWallets: { createOnLogin: 'users-without-wallets' }, defaultChain: BASE_CHAIN, supportedChains: [BASE_CHAIN, BSC_CHAIN, ETH_CHAIN] }}>
      {authenticated ? <GameDashboard logout={logout} user={user} /> : <LandingPage login={login} />}
    </PrivyProvider>
  );
}
// END OF FILE
