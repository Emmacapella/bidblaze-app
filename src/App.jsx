import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import confetti from 'canvas-confetti';
import { SpeedInsights } from "@vercel/speed-insights/react";
import { PrivyProvider, usePrivy } from '@privy-io/react-auth';

// --- ⚠️ PASTE YOUR APP ID HERE ---
const PRIVY_APP_ID = "Cmjd3lz86008nih0d7zq8qfro";

const socket = io("https://bidblaze-server.onrender.com", {
  transports: ['websocket', 'polling']
});

const playSound = (url) => {
  const audio = new Audio(url);
  audio.play().catch(e => console.log("Audio blocked"));
};

function FloatingNumber({ onComplete }) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 1000);
    return () => clearTimeout(timer);
  }, []);
  return (
    <div style={{ position: 'absolute', color: '#ef4444', fontWeight: 'bold', animation: 'float-up 1s forwards', zIndex: 50, fontSize: '20px' }}>-$1.00</div>
  );
}

const ProgressRing = ({ radius, stroke, progress }) => {
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
      <svg height={radius * 2} width={radius * 2} style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
        <circle stroke="rgba(255,255,255,0.1)" strokeWidth={stroke} fill="transparent" r={normalizedRadius} cx={radius} cy={radius} />
        <circle stroke="#fbbf24" strokeWidth={stroke} strokeDasharray={circumference + ' ' + circumference} style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.5s linear' }} strokeLinecap="round" fill="transparent" r={normalizedRadius} cx={radius} cy={radius} />
      </svg>
    </div>
  );
};

function TimerLogic({ targetDate, onTick }) {
  const [timeLeft, setTimeLeft] = useState("00:00");
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const distance = targetDate - now;
      if (distance < 0) {
        setTimeLeft("00:00");
        onTick(0);
      } else {
        onTick(Math.min(((distance / 1000) / 60) * 100, 100));
        const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((distance % (1000 * 60)) / 1000);
        setTimeLeft(`${m}:${s < 10 ? '0' : ''}${s}`);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [targetDate, onTick]);
  return <span>{timeLeft}</span>;
}

const GlobalStyle = () => (
  <style>{`
    body, html { margin: 0; padding: 0; width: 100%; height: 100%; background-color: #0f172a; overflow-x: hidden; color: white; font-family: sans-serif; }
    #root { width: 100%; height: 100%; }
    * { box-sizing: border-box; }
    @keyframes float-up { 0% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-100px); } }
    @keyframes pulse-dot { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }
  `}</style>
);

function LoginScreen({ login }) {
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
      <h1 style={{ color: '#fbbf24', fontSize: '40px' }}>BidBlaze ⚡</h1>
      <button onClick={login} style={{ background: '#3b82f6', border: 'none', padding: '16px 40px', color: 'white', borderRadius: '30px', fontWeight: 'bold', marginTop: '20px' }}>Enter Arena</button>
    </div>
  );
}

function GameDashboard({ logout, user }) {
  const [gameState, setGameState] = useState(null);
  const [progress, setProgress] = useState(100);
  const [floatingBids, setFloatingBids] = useState([]);
  const [userCount, setUserCount] = useState(1);
  const [isCooldown, setIsCooldown] = useState(false);
  const prevStatus = useRef("ACTIVE");

  useEffect(() => {
    socket.on('gameState', (data) => {
      setGameState(data);
      setUserCount(data.connectedUsers || 1);
      if (data.status === 'ACTIVE' && data.history.length > 0) {
        playSound('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3');
      }
      if (data.status === 'ENDED' && prevStatus.current === 'ACTIVE') {
        confetti({ zIndex: 9999, origin: { y: 0.6 } });
        playSound('https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3');
        setProgress(0);
      }
      prevStatus.current = data.status;
    });
    return () => socket.off('gameState');
  }, []);

  const placeBid = () => {
    if (isCooldown) return;
    
    // --- SMART TIME LOGIC ---
    // The server handles the actual time, but we send the bid now
    socket.emit('placeBid', user.email?.address || "User");
    
    // --- 8 SECOND ANTI-SPAM LOCK ---
    setIsCooldown(true);
    setTimeout(() => setIsCooldown(false), 8000); 

    setFloatingBids(prev => [...prev, Date.now()]);
  };

  if (!gameState) return <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><h2>Loading...</h2></div>;

  return (
    <div style={{ minHeight: '100vh', width: '100vw', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <GlobalStyle />
      <nav style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '400px', marginBottom: '20px' }}>
        <div style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: '8px', height: '8px', background: '#22c55e', borderRadius: '50%', animation: 'pulse-dot 1s infinite' }}></span>
          {userCount} Online
        </div>
        <button onClick={logout} style={{ background: 'none', border: 'none', color: 'white' }}>Logout</button>
      </nav>

      <div style={{ fontSize: '28px', fontWeight: 'bold', fontFamily: 'monospace', color: '#fbbf24', marginBottom: '15px' }}>
        ⏱️ {gameState.status === 'ENDED' ? 'ENDED' : <TimerLogic targetDate={gameState.endTime} onTick={setProgress} />}
      </div>

      <div style={{ position: 'relative', width: '280px', height: '280px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '30px' }}>
        <ProgressRing radius={140} stroke={8} progress={progress} />
        {floatingBids.map(id => <FloatingNumber key={id} onComplete={() => setFloatingBids(prev => prev.filter(b => b !== id))} />)}
        <div style={{ textAlign: 'center', zIndex: 10 }}>
          {gameState.status === 'ENDED' ? (
            <div><h2>{gameState.history[0]?.user.split('@')[0]} WON!</h2></div>
          ) : (
            <>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: '12px' }}>JACKPOT</p>
              <h2 style={{ fontSize: '50px', margin: '0' }}>${gameState.jackpot.toFixed(2)}</h2>
            </>
          )}
        </div>
      </div>

      <button onClick={placeBid} disabled={gameState.status !== 'ACTIVE' || isCooldown} style={{ width: '100%', maxWidth: '300px', padding: '20px', borderRadius: '50px', background: isCooldown ? '#475569' : '#ef4444', color: 'white', fontWeight: 'bold', border: 'none', fontSize: '20px' }}>
        {isCooldown ? "WAIT..." : (gameState.status === 'ACTIVE' ? `BID $${gameState.bidCost}` : 'ENDED')}
      </button>

      <div style={{ width: '100%', maxWidth: '350px', marginTop: '30px' }}>
        {gameState.history.map((bid) => (
          <div key={bid.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'rgba(30, 41, 59, 0.5)', marginBottom: '5px', borderRadius: '10px' }}>
            <span>{bid.user.split('@')[0]}</span>
            <span style={{ color: '#fbbf24' }}>${bid.amount.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const { login, logout, user, authenticated, ready } = usePrivy();
  if (!ready) return null;
  return (
    <PrivyProvider appId={PRIVY_APP_ID} config={{ appearance: { theme: 'dark' } }}>
      {authenticated ? <GameDashboard logout={logout} user={user} /> : <LoginScreen login={login} />}
    </PrivyProvider>
  );
}

