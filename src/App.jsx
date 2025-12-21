import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import confetti from 'canvas-confetti';
import { PrivyProvider, usePrivy, useWallets } from '@privy-io/react-auth';

// --- ⚠️ PASTE YOUR APP ID HERE ⚠️ ---
const PRIVY_APP_ID = "Cmjd3lz86008nih0d7zq8qfro";

const socket = io("https://bidblaze-server.onrender.com", {
  transports: ['websocket', 'polling']
});

const ASSETS = {
  soundBid: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
  soundWin: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
  soundPop: 'https://assets.mixkit.co/active_storage/sfx/2578/2578-preview.mp3'
};

const BASE_CHAIN = {
  id: 8453,
  name: 'Base',
  network: 'base',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://mainnet.base.org'] } },
  blockExplorers: { default: { name: 'Basescan', url: 'https://basescan.org' } }
};

const playSound = (key) => {
  const audio = new Audio(ASSETS[key]);
  audio.volume = 0.5;
  audio.play().catch(() => {});
};

// --- WALLET VAULT ---
const WalletVault = ({ onClose, userAddress }) => {
  const { wallets } = useWallets();
  const [activeTab, setActiveTab] = useState('deposit');
  const [balance, setBalance] = useState("0.0000");
  const [withdrawAddr, setWithdrawAddr] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userAddress) return;
    const fetchBal = async () => {
      try {
        const res = await fetch('https://mainnet.base.org', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: "2.0", method: "eth_getBalance", params: [userAddress, "latest"], id: 1 })
        });
        const data = await res.json();
        setBalance((parseInt(data.result, 16) / 1e18).toFixed(4));
      } catch (e) {}
    };
    fetchBal();
  }, [userAddress]);

  const handleWithdraw = async () => {
    if (!withdrawAddr || !amount) return;
    setLoading(true);
    setStatus("Processing...");
    try {
      const w = wallets.find(w => w.address.toLowerCase() === userAddress.toLowerCase());
      if (!w) throw new Error("Wallet connection lost");
      const wei = `0x${(parseFloat(amount) * 1e18).toString(16)}`;
      await w.sendTransaction({ to: withdrawAddr, value: wei, chainId: 8453 });
      setStatus("✅ Sent!");
      playSound('soundPop');
      setAmount("");
    } catch (e) {
      setStatus("❌ Failed");
    }
    setLoading(false);
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(userAddress);
    setStatus("Copied! 📋");
    setTimeout(() => setStatus(""), 2000);
  };

  return (
    <div className="modal-overlay">
      <div className="glass-card modal-content">
        <button className="close-btn" onClick={onClose}>✕</button>
        <h2 style={{color: '#fbbf24', margin: '0 0 20px 0'}}>Base Vault 🏦</h2>
        <div className="tabs">
          <button className={`tab ${activeTab === 'deposit' ? 'active' : ''}`} onClick={() => setActiveTab('deposit')}>Deposit</button>
          <button className={`tab ${activeTab === 'withdraw' ? 'active' : ''}`} onClick={() => setActiveTab('withdraw')}>Withdraw</button>
        </div>
        <div className="balance-box">
          <div className="label">AVAILABLE BALANCE</div>
          <div className="value">{balance} ETH</div>
        </div>
        {activeTab === 'deposit' ? (
          <div className="tab-content fade-in">
            <p className="hint">Send ETH (Base) to:</p>
            <div className="address-box" onClick={copyAddress}>
              {userAddress?.slice(0, 20)}...{userAddress?.slice(-4)}
              <span className="copy-icon">❐</span>
            </div>
            <p className="status-text">{status || "Tap to copy"}</p>
          </div>
        ) : (
          <div className="tab-content fade-in">
            <input className="input-field" placeholder="0x Address" value={withdrawAddr} onChange={e => setWithdrawAddr(e.target.value)} />
            <input className="input-field" type="number" placeholder="Amount ETH" value={amount} onChange={e => setAmount(e.target.value)} />
            <button className="action-btn" onClick={handleWithdraw} disabled={loading}>{loading ? "..." : "Withdraw"}</button>
            <p className="status-text">{status}</p>
          </div>
        )}
      </div>
    </div>
  );
};

// --- REACTOR RING ---
const ReactorRing = ({ targetDate, status }) => {
  const [progress, setProgress] = useState(100);
  const [displayTime, setDisplayTime] = useState("00:00");

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const distance = targetDate - now;
      if (distance <= 0) {
        setDisplayTime("00:00");
        setProgress(0);
      } else {
        const percentage = Math.min((distance / 60000) * 100, 100);
        setProgress(percentage);
        const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((distance % (1000 * 60)) / 1000);
        setDisplayTime(`${m}:${s < 10 ? '0' : ''}${s}`);
      }
    }, 50);
    return () => clearInterval(interval);
  }, [targetDate]);

  return (
    <div className="reactor-container">
      <div className={`timer-float ${status === 'ENDED' ? 'ended' : ''}`}>{status === 'ENDED' ? 'SOLD' : displayTime}</div>
      <svg className="progress-ring" width="280" height="280">
        <circle className="ring-bg" stroke="rgba(255,255,255,0.05)" strokeWidth="8" fill="transparent" r="130" cx="140" cy="140" />
        <circle className="ring-progress" stroke="#fbbf24" strokeWidth="8" strokeDasharray={`${2 * Math.PI * 130}`} strokeDashoffset={2 * Math.PI * 130 * (1 - progress / 100)} strokeLinecap="round" fill="transparent" r="130" cx="140" cy="140" />
      </svg>
    </div>
  );
};

// --- MAIN DASHBOARD ---
function GameDashboard({ logout, user }) {
  const [gameState, setGameState] = useState(null);
  const [isCooldown, setIsCooldown] = useState(false);
  const [cd, setCd] = useState(0);
  const [showVault, setShowVault] = useState(false);
  const [floatingBids, setFloatingBids] = useState([]);
  const prevStatus = useRef("ACTIVE");
  const { wallets } = useWallets();
  const userAddress = wallets.find(w => w.walletClientType === 'privy')?.address || user.wallet?.address;

  useEffect(() => {
    socket.on('gameState', (data) => {
      setGameState(data);
      if (data.status === 'ACTIVE' && data.history.length > 0) playSound('soundBid');
      if (data.status === 'ENDED' && prevStatus.current === 'ACTIVE') {
        confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 }, colors: ['#fbbf24', '#ffffff'] });
        playSound('soundWin');
      }
      prevStatus.current = data.status;
    });
    let interval;
    if (isCooldown && cd > 0) interval = setInterval(() => setCd(prev => prev - 1), 1000);
    else if (cd <= 0) setIsCooldown(false);
    return () => { socket.off('gameState'); clearInterval(interval); };
  }, [isCooldown, cd]);

  const placeBid = () => {
    if (isCooldown) return;
    setFloatingBids(prev => [...prev, Date.now()]);
    playSound('soundPop');
    socket.emit('placeBid', user.email ? user.email.address : "User");
    setIsCooldown(true);
    setCd(8);
  };

  // --- 🔴 ADMIN BUTTON LOGIC ---
  const runAdmin = () => {
    const pwd = prompt("🔐 ADMIN PANEL\nEnter Password:");
    if (!pwd) return;
    
    const action = prompt("CHOOSE ACTION:\n1. Reset Game\n2. Set Jackpot\n3. Add 60s Time");
    
    if (action === '1') {
        socket.emit('adminAction', { password: pwd, action: 'RESET' });
        alert("Command Sent! If password is correct, game will reset.");
    } else if (action === '2') {
        const val = prompt("Enter new Jackpot amount:");
        socket.emit('adminAction', { password: pwd, action: 'SET_JACKPOT', value: val });
    } else if (action === '3') {
        socket.emit('adminAction', { password: pwd, action: 'ADD_TIME', value: 60 });
    }
  };

  if (!gameState) return <div className="loading-screen">Connecting...</div>;

  return (
    <div className="app-container">
      <GlobalStyle />
      {showVault && <WalletVault onClose={() => setShowVault(false)} userAddress={userAddress} />}

      <nav className="glass-nav">
        <button className="nav-btn vault-btn" onClick={() => setShowVault(true)}>🏦 Vault</button>
        <div className="live-pill">● {gameState.connectedUsers || 1} LIVE</div>
        <button className="nav-btn logout-btn" onClick={logout}>✕</button>
      </nav>

      <div className="game-stage">
        <ReactorRing targetDate={gameState.endTime} status={gameState.status} />
        <div className="jackpot-core">
          <div className="label">JACKPOT</div>
          <div className="amount">${gameState.jackpot.toFixed(2)}</div>
          {gameState.status === 'ENDED' && <div className="winner-badge">🏆 {gameState.history[0]?.user.slice(0,10)}...</div>}
        </div>
        {floatingBids.map(id => (
          <div key={id} className="float-anim" onAnimationEnd={() => setFloatingBids(prev => prev.filter(bid => bid !== id))}>-$1.00</div>
        ))}
      </div>

      <button className={`main-btn ${isCooldown ? 'cooldown' : ''}`} onClick={placeBid} disabled={gameState.status !== 'ACTIVE' || isCooldown}>
        {gameState.status === 'ENDED' ? 'AUCTION CLOSED' : (isCooldown ? `WAIT (${cd}s)` : `BID NOW ($${gameState.bidCost})`)}
      </button>

      <div className="glass-panel history-panel">
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
      
      {/* HIDDEN ADMIN BUTTON */}
      <button onClick={runAdmin} style={{marginTop:'20px', background:'none', border:'1px solid #ef4444', color:'#ef4444', padding:'5px 10px', fontSize:'10px', opacity:0.3, cursor:'pointer'}}>ADMIN PANEL</button>
    </div>
  );
}

function LandingPage({ login }) {
  return (
    <div className="landing-container">
      <GlobalStyle />
      <div className="landing-content">
        <div style={{fontSize:'80px'}}>⚡</div>
        <h1>BidBlaze <span style={{color:'#fbbf24'}}>Pro</span></h1>
        <p>Real-Time Crypto Auctions</p>
        <button className="start-btn" onClick={login}>Play Now</button>
      </div>
    </div>
  );
}

const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;500;700;900&family=JetBrains+Mono:wght@500&display=swap');
    :root { --bg-dark: #020617; --glass: rgba(255, 255, 255, 0.05); --glass-border: rgba(255, 255, 255, 0.1); --gold: #fbbf24; --blue: #3b82f6; --red: #ef4444; }
    body { margin: 0; background: var(--bg-dark); color: white; font-family: 'Outfit', sans-serif; overflow-y: auto; }
    .app-container { min-height: 100vh; display: flex; flex-direction: column; align-items: center; padding: 20px; background: radial-gradient(circle at top, #1e293b 0%, #020617 100%); }
    .landing-container { height: 100vh; display: flex; justify-content: center; align-items: center; background: linear-gradient(135deg, #1e3a8a, #000000); text-align: center; }
    .glass-nav { width: 100%; max-width: 450px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding: 10px; background: var(--glass); border-radius: 20px; border: 1px solid var(--glass-border); }
    .glass-panel { background: var(--glass); border: 1px solid var(--glass-border); border-radius: 20px; backdrop-filter: blur(10px); width: 100%; max-width: 400px; padding: 15px; margin-bottom: 20px; display: flex; flex-direction: column; }
    .glass-card { background: #0f172a; border: 1px solid #334155; border-radius: 24px; padding: 30px; width: 90%; max-width: 380px; text-align: center; box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
    .nav-btn { background: transparent; border: none; color: #94a3b8; font-weight: bold; cursor: pointer; padding: 8px 12px; }
    .vault-btn { color: var(--blue); background: rgba(59, 130, 246, 0.1); border-radius: 12px; }
    .live-pill { color: #22c55e; font-size: 12px; font-weight: bold; text-shadow: 0 0 10px rgba(34, 197, 94, 0.4); }
    .main-btn { width: 100%; max-width: 350px; padding: 22px; border-radius: 50px; border: none; font-size: 20px; font-weight: 900; color: white; background: linear-gradient(to bottom, #ef4444, #b91c1c); box-shadow: 0 10px 0 #7f1d1d, 0 10px 20px rgba(0,0,0,0.4); cursor: pointer; transition: transform 0.1s; margin-top: auto; margin-bottom: 20px; letter-spacing: 1px; position: relative; overflow: hidden; }
    .main-btn:active { transform: translateY(6px); box-shadow: 0 4px 0 #7f1d1d; }
    .main-btn.cooldown { background: #334155; box-shadow: none; transform: translateY(6px); color: #64748b; cursor: not-allowed; }
    .start-btn { padding: 20px 60px; font-size: 20px; font-weight: bold; border-radius: 50px; border: none; background: white; color: #000; cursor: pointer; margin-top: 30px; }
    .game-stage { position: relative; width: 300px; height: 300px; display: flex; justify-content: center; align-items: center; margin: 20px 0; }
    .reactor-container { position: absolute; width: 100%; height: 100%; }
    .progress-ring { transform: rotate(-90deg); width: 100%; height: 100%; overflow: visible; }
    .ring-progress { transition: stroke-dashoffset 0.1s linear; filter: drop-shadow(0 0 8px var(--gold)); }
    .timer-float { position: absolute; top: -40px; left: 50%; transform: translateX(-50%); font-family: 'JetBrains Mono', monospace; font-size: 32px; font-weight: bold; color: var(--gold); text-shadow: 0 0 15px rgba(251, 191, 36, 0.5); }
    .jackpot-core { z-index: 10; text-align: center; }
    .jackpot-core .label { font-size: 12px; color: #64748b; letter-spacing: 2px; margin-bottom: 5px; }
    .jackpot-core .amount { font-size: 56px; font-weight: 900; color: white; text-shadow: 0 4px 20px rgba(0,0,0,0.5); }
    .winner-badge { background: #22c55e; color: black; padding: 6px 12px; border-radius: 20px; font-weight: bold; font-size: 14px; margin-top: 10px; display: inline-block; animation: popIn 0.5s; }
    .panel-header { font-size: 11px; color: #64748b; letter-spacing: 1px; margin-bottom: 10px; font-weight: bold; text-align: left; }
    .history-list { max-height: 300px; overflow-y: auto; padding-right: 5px; }
    .history-list::-webkit-scrollbar { width: 4px; }
    .history-list::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
    .history-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--glass-border); font-size: 14px; }
    .history-row .bid-amt { color: var(--gold); font-weight: bold; }
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(5px); z-index: 200; display: flex; justify-content: center; align-items: center; }
    .close-btn { position: absolute; top: 15px; right: 15px; background: none; border: none; color: white; font-size: 20px; cursor: pointer; }
    .tabs { display: flex; background: #1e293b; padding: 4px; border-radius: 12px; margin-bottom: 20px; }
    .tab { flex: 1; background: transparent; border: none; color: #94a3b8; padding: 10px; border-radius: 10px; font-weight: bold; cursor: pointer; }
    .tab.active { background: #334155; color: white; }
    .balance-box { background: linear-gradient(135deg, #1e3a8a, #172554); padding: 20px; border-radius: 16px; margin-bottom: 20px; text-align: left; }
    .balance-box .label { font-size: 10px; color: #93c5fd; letter-spacing: 1px; }
    .balance-box .value { font-size: 28px; font-weight: bold; margin-top: 5px; }
    .address-box { background: #1e293b; padding: 15px; border-radius: 12px; font-family: monospace; font-size: 12px; display: flex; justify-content: space-between; cursor: pointer; border: 1px dashed #475569; }
    .input-field { width: 100%; background: #1e293b; border: 1px solid #334155; padding: 14px; border-radius: 12px; color: white; margin-bottom: 10px; box-sizing: border-box; }
    .action-btn { width: 100%; padding: 14px; background: var(--blue); border: none; border-radius: 12px; color: white; font-weight: bold; cursor: pointer; }
    .status-text { font-size: 12px; margin-top: 10px; color: #94a3b8; min-height: 20px; }
    @keyframes popIn { 0% { transform: scale(0); } 100% { transform: scale(1); } }
    @keyframes floatUp { 0% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-80px); } }
    .float-anim { position: absolute; color: var(--red); font-weight: 900; font-size: 24px; animation: floatUp 0.8s forwards; z-index: 50; pointer-events: none; }
    .fade-in { animation: popIn 0.3s ease-out; }
  `}</style>
);

export default function App() {
  const { login, logout, user, authenticated, ready } = usePrivy();
  if (!ready) return null;
  return (
    <PrivyProvider 
      appId={PRIVY_APP_ID} 
      config={{ 
        loginMethods: ['email', 'wallet'], 
        appearance: { theme: 'dark', accentColor: '#3b82f6' },
        embeddedWallets: { createOnLogin: 'users-without-wallets' },
        defaultChain: BASE_CHAIN,
        supportedChains: [BASE_CHAIN]
      }}
    >
      {authenticated ? <GameDashboard logout={logout} user={user} /> : <LandingPage login={login} />}
    </PrivyProvider>
  );
}

