import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import confetti from 'canvas-confetti';
import { SpeedInsights } from "@vercel/speed-insights/react";
import { PrivyProvider, usePrivy, useWallets } from '@privy-io/react-auth';

// --- ⚠️ PASTE YOUR APP ID HERE ⚠️ ---
const PRIVY_APP_ID = "Cmjd3lz86008nih0d7zq8qfro";

const socket = io("https://bidblaze-server.onrender.com", {
  transports: ['websocket', 'polling']
});

// --- BASE CHAIN SETUP ---
const baseChain = {
  id: 8453,
  name: 'Base',
  network: 'base',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://mainnet.base.org'] }, public: { http: ['https://mainnet.base.org'] } },
  blockExplorers: { default: { name: 'Basescan', url: 'https://basescan.org' } }
};

// --- AUDIO ---
const playSound = (type) => {
  const sounds = {
    bid: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
    win: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'
  };
  new Audio(sounds[type]).play().catch(() => {});
};

// --- COMPONENTS ---
const FloatingNumber = ({ onComplete }) => {
  useEffect(() => { const t = setTimeout(onComplete, 1000); return () => clearTimeout(t); }, []);
  return <div className="float-num">-$1.00</div>;
};

const ProgressRing = ({ radius, stroke, progress }) => {
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  return (
    <div className="ring-container">
      <svg height={radius * 2} width={radius * 2} style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
        <circle stroke="rgba(255,255,255,0.1)" strokeWidth={stroke} fill="transparent" r={normalizedRadius} cx={radius} cy={radius} />
        <circle stroke="#fbbf24" strokeWidth={stroke} strokeDasharray={circumference + ' ' + circumference} style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.5s linear', filter: 'drop-shadow(0 0 10px #fbbf24)' }} strokeLinecap="round" fill="transparent" r={normalizedRadius} cx={radius} cy={radius} />
      </svg>
    </div>
  );
};

const TimerDisplay = ({ targetDate, onTick }) => {
  const [display, setDisplay] = useState("00:00");
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const distance = targetDate - now;
      if (distance < 0) { setDisplay("00:00"); onTick(0); } 
      else {
        onTick(Math.min(((distance / 1000) / 60) * 100, 100));
        const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((distance % (1000 * 60)) / 1000);
        setDisplay(`${m}:${s < 10 ? '0' : ''}${s}`);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [targetDate]);
  return <span>{display}</span>;
};

// --- WALLET MODAL ---
const WalletModal = ({ onClose, userAddress }) => {
  const { wallets } = useWallets();
  const [balance, setBalance] = useState("0.000");
  const [toAddr, setToAddr] = useState("");
  const [amt, setAmt] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    const getBal = async () => {
      if (!userAddress) return;
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
    getBal();
  }, [userAddress]);

  const handleSend = async () => {
    if (!toAddr || !amt) return;
    setStatus("Sending...");
    try {
      const w = wallets.find(w => w.address.toLowerCase() === userAddress.toLowerCase());
      if (!w) throw new Error("No wallet");
      await w.sendTransaction({ to: toAddr, value: `0x${(parseFloat(amt) * 1e18).toString(16)}`, chainId: 8453 });
      setStatus("Sent! 🚀");
    } catch (e) { setStatus("Failed"); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
      <div style={{ width: '90%', maxWidth: '350px', background: '#0f172a', padding: '25px', borderRadius: '20px', border: '1px solid #334155', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 15, right: 15, background: 'none', border: 'none', color: 'white', fontSize: '18px' }}>✕</button>
        <h3 style={{ margin: '0 0 20px 0', color: '#fbbf24' }}>Base Wallet</h3>
        <div style={{ background: '#1e293b', padding: '15px', borderRadius: '12px', marginBottom: '20px' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>BALANCE</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{balance} ETH</div>
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '5px', wordBreak: 'break-all' }}>{userAddress}</div>
        </div>
        <input placeholder="0x Recipient Address" value={toAddr} onChange={e => setToAddr(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '8px', border: 'none', background: '#334155', color: 'white' }} />
        <input placeholder="Amount ETH" type="number" value={amt} onChange={e => setAmt(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '8px', border: 'none', background: '#334155', color: 'white' }} />
        <button onClick={handleSend} style={{ width: '100%', padding: '12px', background: '#3b82f6', color: 'white', borderRadius: '8px', fontWeight: 'bold', border: 'none' }}>{status || "Withdraw"}</button>
      </div>
    </div>
  );
};

// --- STYLES ---
const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&display=swap');
    body { margin: 0; font-family: 'Outfit', sans-serif; background: #0f172a; color: white; overflow-x: hidden; }
    .landing { height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; background: radial-gradient(circle at center, #1e40af 0%, #0f172a 100%); text-align: center; padding: 20px; }
    .dash { min-height: 100vh; display: flex; flex-direction: column; alignItems: center; padding: 20px; background: #0f172a; }
    .glass-btn { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; cursor: pointer; }
    @keyframes float-up { 0% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-50px); } }
    .float-num { position: absolute; color: #ef4444; font-weight: 900; font-size: 20px; animation: float-up 0.8s forwards; z-index: 50; }
    .ring-container { position: absolute; inset: 0; pointer-events: none; }
  `}</style>
);

// --- MAIN COMPONENTS ---
function LoginScreen({ login }) {
  return (
    <div className="landing">
      <GlobalStyle />
      <div style={{ fontSize: '80px', marginBottom: '20px' }}>⚡</div>
      <h1 style={{ fontSize: '50px', margin: 0, fontWeight: '900', background: '-webkit-linear-gradient(#fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>BidBlaze v2</h1>
      <p style={{ color: '#cbd5e1', fontSize: '18px', marginBottom: '40px' }}>The Premium Auction Arena</p>
      <button onClick={login} style={{ background: '#3b82f6', border: 'none', padding: '16px 50px', color: 'white', borderRadius: '30px', fontSize: '18px', fontWeight: 'bold', boxShadow: '0 0 20px rgba(59,130,246,0.5)' }}>Connect Wallet</button>
    </div>
  );
}

function GameDashboard({ logout, user }) {
  const [gameState, setGameState] = useState(null);
  const [progress, setProgress] = useState(100);
  const [floats, setFloats] = useState([]);
  const [isCooldown, setIsCooldown] = useState(false);
  const [cd, setCd] = useState(0);
  const [showWallet, setShowWallet] = useState(false);
  const prevStatus = useRef("ACTIVE");
  const { wallets } = useWallets();

  const userAddress = wallets.find(w => w.walletClientType === 'privy')?.address || user.wallet?.address;

  useEffect(() => {
    socket.on('gameState', (data) => {
      setGameState(data);
      if (data.status === 'ACTIVE' && data.history.length > 0) playSound('bid');
      if (data.status === 'ENDED' && prevStatus.current === 'ACTIVE') {
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
        playSound('win');
        setProgress(0);
      }
      prevStatus.current = data.status;
    });
    
    let interval;
    if (isCooldown && cd > 0) interval = setInterval(() => setCd(t => t - 1), 1000);
    else if (cd === 0) setIsCooldown(false);
    
    return () => { socket.off('gameState'); clearInterval(interval); };
  }, [isCooldown, cd]);

  const placeBid = () => {
    if (isCooldown) return;
    socket.emit('placeBid', user.email ? user.email.address : "User");
    setIsCooldown(true);
    setCd(8);
    setFloats(f => [...f, Date.now()]);
  };

  if (!gameState) return <div className="dash" style={{ justifyContent: 'center' }}>Connecting...</div>;

  return (
    <div className="dash">
      <GlobalStyle />
      {showWallet && <WalletModal onClose={() => setShowWallet(false)} userAddress={userAddress} />}

      <div style={{ width: '100%', maxWidth: '400px', display: 'flex', justifyContent: 'space-between', marginBottom: '40px', alignItems: 'center' }}>
        <button onClick={() => setShowWallet(true)} className="glass-btn">💰 My Wallet</button>
        <div style={{ color: '#22c55e', fontSize: '12px', fontWeight: 'bold' }}>● {gameState.connectedUsers || 1} LIVE</div>
        <button onClick={logout} style={{ background: 'none', border: 'none', color: '#64748b', fontWeight: 'bold' }}>LOGOUT</button>
      </div>

      <div style={{ fontSize: '32px', fontFamily: 'monospace', fontWeight: 'bold', color: '#fbbf24', marginBottom: '20px' }}>
        {gameState.status === 'ENDED' ? 'SOLD' : <TimerDisplay targetDate={gameState.endTime} onTick={setProgress} />}
      </div>

      <div style={{ position: 'relative', width: '280px', height: '280px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '40px' }}>
        <ProgressRing radius={140} stroke={8} progress={progress} />
        {floats.map(id => <FloatingNumber key={id} onComplete={() => setFloats(f => f.filter(i => i !== id))} />)}
        <div style={{ textAlign: 'center', zIndex: 10 }}>
          <div style={{ color: '#94a3b8', fontSize: '12px', letterSpacing: '2px', marginBottom: '5px' }}>JACKPOT</div>
          <div style={{ fontSize: '52px', fontWeight: '900' }}>${gameState.jackpot.toFixed(2)}</div>
          {gameState.status === 'ENDED' && <div style={{ color: '#22c55e', fontWeight: 'bold', marginTop: '10px' }}>WINNER: {gameState.history[0]?.user.slice(0,6)}...</div>}
        </div>
      </div>

      <button onClick={placeBid} disabled={gameState.status !== 'ACTIVE' || isCooldown} style={{ width: '100%', maxWidth: '320px', padding: '20px', borderRadius: '50px', background: isCooldown ? '#334155' : 'linear-gradient(to right, #ef4444, #b91c1c)', color: isCooldown ? '#94a3b8' : 'white', border: 'none', fontSize: '20px', fontWeight: 'bold', boxShadow: isCooldown ? 'none' : '0 10px 20px rgba(220,38,38,0.4)', transition: '0.2s' }}>
        {gameState.status === 'ENDED' ? 'AUCTION CLOSED' : (isCooldown ? `WAIT (${cd}s)` : `BID NOW $${gameState.bidCost}`)}
      </button>

      <div style={{ width: '100%', maxWidth: '350px', marginTop: '40px', background: 'rgba(255,255,255,0.05)', borderRadius: '15px', padding: '15px' }}>
        <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '10px', textAlign: 'center' }}>RECENT BIDS</div>
        {gameState.history.slice(0, 3).map((bid) => (
          <div key={bid.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '14px' }}>
            <span>{bid.user.split('@')[0].slice(0,12)}...</span>
            <span style={{ color: '#fbbf24' }}>${bid.amount.toFixed(2)}</span>
          </div>
        ))}
      </div>
      <SpeedInsights />
    </div>
  );
}

export default function App() {
  const { login, logout, user, authenticated, ready } = usePrivy();
  if (!ready) return null;
  return (
    <PrivyProvider 
      appId={PRIVY_APP_ID} 
      config={{ 
        loginMethods: ['email', 'wallet'], 
        appearance: { theme: 'dark' },
        embeddedWallets: { createOnLogin: 'users-without-wallets' },
        defaultChain: baseChain,
        supportedChains: [baseChain]
      }}
    >
      {authenticated ? <GameDashboard logout={logout} user={user} /> : <LoginScreen login={login} />}
    </PrivyProvider>
  );
}

