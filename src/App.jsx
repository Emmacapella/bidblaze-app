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

// --- BASE NETWORK CONFIGURATION ---
const baseChain = {
  id: 8453,
  name: 'Base',
  network: 'base',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { 
    default: { http: ['https://mainnet.base.org'] },
    public: { http: ['https://mainnet.base.org'] }
  },
  blockExplorers: { default: { name: 'Basescan', url: 'https://basescan.org' } }
};

// --- AUDIO HELPERS ---
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
        <circle stroke="#fbbf24" strokeWidth={stroke} strokeDasharray={circumference + ' ' + circumference} style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.5s linear', filter: 'drop-shadow(0 0 8px #fbbf24)' }} strokeLinecap="round" fill="transparent" r={normalizedRadius} cx={radius} cy={radius} />
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
  const [withdrawAddr, setWithdrawAddr] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const fetchBalance = async () => {
      if (!userAddress) return;
      try {
        const response = await fetch('https://mainnet.base.org', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: "2.0", method: "eth_getBalance", params: [userAddress, "latest"], id: 1 })
        });
        const data = await response.json();
        const eth = parseInt(data.result, 16) / 1e18;
        setBalance(eth.toFixed(4));
      } catch (e) { console.error(e); }
    };
    fetchBalance();
  }, [userAddress]);

  const handleWithdraw = async () => {
    if (!withdrawAddr || !amount) return;
    setLoading(true);
    setStatus("Processing...");
    try {
      const wallet = wallets.find(w => w.address.toLowerCase() === userAddress.toLowerCase());
      if (!wallet) throw new Error("Wallet not found");
      const weiAmount = (parseFloat(amount) * 1e18).toString(16);
      await wallet.sendTransaction({ to: withdrawAddr, value: `0x${weiAmount}`, chainId: 8453 });
      setStatus("Sent! 🚀");
      setAmount("");
    } catch (e) {
      console.error(e);
      setStatus("Failed: " + e.message.slice(0, 20));
    }
    setLoading(false);
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
      <div className="glass-panel" style={{ width: '90%', maxWidth: '350px', padding: '30px', position: 'relative', background: '#0f172a', border: '1px solid #334155' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', color: 'white', fontSize: '20px' }}>✕</button>
        <h2 style={{ margin: '0 0 20px 0', color: '#fbbf24' }}>My Base Wallet</h2>
        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '10px', marginBottom: '20px' }}>
          <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>BALANCE (BASE ETH)</p>
          <h3 style={{ margin: '5px 0', fontSize: '24px' }}>{balance} ETH</h3>
          <p style={{ margin: '10px 0 0 0', fontSize: '10px', color: '#64748b', wordBreak: 'break-all' }}>{userAddress}</p>
        </div>
        <h4 style={{ margin: '0 0 10px 0' }}>Withdraw</h4>
        <input placeholder="0x..." value={withdrawAddr} onChange={e => setWithdrawAddr(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #334155', background: '#1e293b', color: 'white' }} />
        <input placeholder="Amount (ETH)" type="number" value={amount} onChange={e => setAmount(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #334155', background: '#1e293b', color: 'white' }} />
        <button onClick={handleWithdraw} disabled={loading} style={{ width: '100%', padding: '12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>{loading ? "Sending..." : "Withdraw ETH"}</button>
        {status && <p style={{ textAlign: 'center', marginTop: '10px', fontSize: '12px', color: status.includes('Failed') ? '#ef4444' : '#22c55e' }}>{status}</p>}
      </div>
    </div>
  );
};

// --- STYLES ---
const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;500;700;900&display=swap');
    body { margin: 0; font-family: 'Outfit', sans-serif; background: #0f172a; overflow-x: hidden; }
    .landing-page { height: 100vh; width: 100vw; background: linear-gradient(135deg, #2563eb 0%, #3b82f6 40%, #ffffff 100%); display: flex; flexDirection: column; justifyContent: center; alignItems: center; textAlign: center; }
    .game-page { min-height: 100vh; background: #0f172a; color: white; display: flex; flexDirection: column; alignItems: center; padding: 20px; }
    .glass-panel { background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 20px; }
    @keyframes float-up { 0% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-80px); } }
    .float-num { position: absolute; color: #ef4444; font-weight: 900; font-size: 24px; animation: float-up 0.8s forwards; z-index: 50; text-shadow: 0 0 10px rgba(239, 68, 68, 0.5); }
    .ring-container { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; }
    .pulse-dot { width: 8px; height: 8px; background: #22c55e; border-radius: 50%; display: inline-block; margin-right: 6px; box-shadow: 0 0 10px #22c55e; animation: pulse 2s infinite; }
    @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
  `}</style>
);

function LoginScreen({ login }) {
  return (
    <div className="landing-page">
      <GlobalStyle />
      <div style={{ padding: '40px', maxWidth: '90%' }}>
        <h1 style={{ fontSize: '60px', margin: '0 0 10px 0', color: 'white', textShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>BidBlaze ⚡</h1>
        <p style={{ fontSize: '20px', color: 'white', marginBottom: '40px', fontWeight: '500' }}>Premium Real-Time Auctions</p>
        <button onClick={login} style={{ background: 'white', color: '#2563eb', border: 'none', padding: '18px 50px', borderRadius: '50px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 10px 30px rgba(37, 99, 235, 0.3)' }}>Get Started</button>
      </div>
    </div>
  );
}

function GameDashboard({ logout, user }) {
  const [gameState, setGameState] = useState(null);
  const [progress, setProgress] = useState(100);
  const [floats, setFloats] = useState([]);
  const [isCooldown, setIsCooldown] = useState(false);
  const [cdTimer, setCdTimer] = useState(0);
  const [showWallet, setShowWallet] = useState(false);
  const prevStatus = useRef("ACTIVE");

  const { wallets } = useWallets();
  const embeddedWallet = wallets.find((wallet) => wallet.walletClientType === 'privy');
  const userAddress = embeddedWallet ? embeddedWallet.address : (user.wallet ? user.wallet.address : null);

  useEffect(() => {
    socket.on('gameState', (data) => {
      setGameState(data);
      if (data.status === 'ACTIVE' && data.history.length > 0) playSound('bid');
      if (data.status === 'ENDED' && prevStatus.current === 'ACTIVE') {
        confetti({ zIndex: 9999, particleCount: 200, spread: 100, colors: ['#fbbf24', '#ffffff'] });
        playSound('win');
        setProgress(0);
      }
      prevStatus.current = data.status;
    });
    let interval;
    if (isCooldown && cdTimer > 0) { interval = setInterval(() => setCdTimer((t) => t - 1), 1000); } 
    else if (cdTimer === 0) { setIsCooldown(false); }
    return () => { socket.off('gameState'); clearInterval(interval); };
  }, [isCooldown, cdTimer]);

  const placeBid = () => {
    if (isCooldown) return;
    socket.emit('placeBid', user.email ? user.email.address : "User");
    setIsCooldown(true);
    setCdTimer(8);
    setFloats(f => [...f, Date.now()]);
  };

  if (!gameState) return <div style={{height: '100vh', display:'flex', justifyContent:'center', alignItems:'center', background:'#0f172a', color:'white'}}>Loading...</div>;

  return (
    <div className="game-page">
      <GlobalStyle />
      {showWallet && <WalletModal onClose={() => setShowWallet(false)} userAddress={userAddress} />}

      <div className="glass-panel" style={{ width: '100%', maxWidth: '450px', display: 'flex', justifyContent: 'space-between', padding: '15px 20px', marginBottom: '30px', alignItems: 'center' }}>
        <button onClick={() => setShowWallet(true)} style={{ background: '#3b82f6', border: 'none', color: 'white', padding: '8px 16px', borderRadius: '12px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>💰 My Wallet</button>
        <button onClick={logout} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '8px 16px', borderRadius: '12px', cursor: 'pointer', fontSize: '12px' }}>LOGOUT</button>
      </div>

      <div style={{ fontSize: '36px', fontWeight: '700', color: '#fbbf24', marginBottom: '10px', textShadow: '0 0 15px rgba(251, 191, 36, 0.4)' }}>
        {gameState.status === 'ENDED' ? 'SOLD' : <TimerDisplay targetDate={gameState.endTime} onTick={setProgress} />}
      </div>

      <div style={{ position: 'relative', width: '300px', height: '300px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '30px' }}>
        <ProgressRing radius={150} stroke={6} progress={progress} />
        {floats.map(id => <FloatingNumber key={id} onComplete={() => setFloats(f => f.filter(i => i !== id))} />)}
        <div style={{ textAlign: 'center', zIndex: 10 }}>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '12px', letterSpacing: '3px', fontWeight: '600' }}>JACKPOT</p>
          <h2 style={{ fontSize: '64px', margin: '5px 0', fontWeight: '900', color: 'white', textShadow: '0 0 20px rgba(255,255,255,0.3)' }}>${gameState.jackpot.toFixed(2)}</h2>
          {gameState.status === 'ENDED' && <div style={{ background: '#22c55e', color: '#000', padding: '5px 15px', borderRadius: '20px', fontWeight: 'bold', fontSize: '14px', marginTop: '10px' }}>WINNER: {gameState.history[0]?.user.split('@')[0].slice(0,8)}...</div>}
        </div>
      </div>

      <button onClick={placeBid} disabled={gameState.status !== 'ACTIVE' || isCooldown} style={{ width: '100%', maxWidth: '350px', padding: '22px', borderRadius: '24px', background: isCooldown ? '#334155' : 'linear-gradient(to bottom, #ef4444, #dc2626)', color: isCooldown ? '#94a3b8' : 'white', border: 'none', fontSize: '22px', fontWeight: '800', boxShadow: isCooldown ? 'none' : '0 8px 0 #991b1b, 0 15px 20px rgba(0,0,0,0.4)', transform: isCooldown ? 'translateY(4px)' : 'translateY(0)', transition: 'all 0.1s', cursor: isCooldown ? 'not-allowed' : 'pointer' }}>
        {gameState.status === 'ENDED' ? 'AUCTION CLOSED' : (isCooldown ? `WAIT (${cdTimer}s)` : `BID NOW $${gameState.bidCost}`)}
      </button>

      <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', marginTop: '50px', padding: '20px' }}>
        <h3 style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '15px', letterSpacing: '1px', textTransform: 'uppercase' }}>Recent Activity</h3>
        {gameState.history.map((bid) => (
          <div key={bid.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '15px' }}>
            <span style={{ color: 'white' }}>{bid.user.split('@')[0].slice(0, 15)}...</span>
            <span style={{ color: '#fbbf24', fontWeight: '700' }}>${bid.amount.toFixed(2)}</span>
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
    <PrivyProvider appId={PRIVY_APP_ID} config={{ loginMethods: ['email', 'wallet'], appearance: { theme: 'dark' }, embeddedWallets: { createOnLogin: 'users-without-wallets' }, defaultChain: baseChain, supportedChains: [baseChain] }}>
      {authenticated ? <GameDashboard logout={logout} user={user} /> : <LoginScreen login={login} />}
    </PrivyProvider>
  );
}

