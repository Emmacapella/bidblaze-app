import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import confetti from 'canvas-confetti';
import { SpeedInsights } from "@vercel/speed-insights/react";
import { PrivyProvider, usePrivy } from '@privy-io/react-auth';

const PRIVY_APP_ID = "Cmjd3lz86008nih0d7zq8qfro";

const socket = io("https://bidblaze-server.onrender.com", {
  transports: ['websocket', 'polling']
});

// --- AUDIO HELPERS ---
const playSound = (url) => {
  const audio = new Audio(url);
  audio.play().catch(e => console.log("Audio play blocked"));
};

// --- COMPONENT: FLOATING BID NUMBER ---
function FloatingNumber({ onComplete }) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{
      position: 'absolute', color: '#ef4444', fontWeight: 'bold',
      animation: 'float-up 1s forwards', zIndex: 50, fontSize: '20px'
    }}>-$1.00</div>
  );
}

// --- GLOBAL STYLES ---
const GlobalStyle = () => (
  <style>{`
    body, html { margin: 0; padding: 0; width: 100%; height: 100%; background-color: #0f172a; overflow-x: hidden; color: white; font-family: sans-serif; }
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
  const [bids, setBids] = useState([]); // For floating numbers
  const [userCount, setUserCount] = useState(1);
  const prevStatus = useRef("ACTIVE");

  useEffect(() => {
    socket.on('gameState', (data) => {
      setGameState(data);
      setUserCount(data.connectedUsers || 1); // Idea 4: Live Counter
      
      if (data.status === 'ACTIVE' && data.history.length > 0) {
        playSound('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3'); // Idea 1: Bid Sound
      }

      if (data.status === 'ENDED' && prevStatus.current === 'ACTIVE') {
        confetti({ zIndex: 999 });
        playSound('https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'); // Idea 1: Win Sound
      }
      prevStatus.current = data.status;
    });
    return () => socket.off('gameState');
  }, []);

  const placeBid = () => {
    const id = Date.now();
    setBids([...bids, id]); // Idea 2: Floating Numbers
    socket.emit('placeBid', user.email?.address || "User");
  };

  if (!gameState) return <div>Loading...</div>;

  return (
    <div style={{ minHeight: '100vh', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <GlobalStyle />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '400px' }}>
        <div style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: '8px', height: '8px', background: '#22c55e', borderRadius: '50%', animation: 'pulse-dot 1s infinite' }}></span>
          {userCount} Online
        </div>
        <button onClick={logout} style={{ background: 'none', border: 'none', color: 'white' }}>Logout</button>
      </div>

      <div style={{ position: 'relative', marginTop: '50px', border: '5px solid #fbbf24', borderRadius: '50%', width: '250px', height: '250px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        {bids.map(id => <FloatingNumber key={id} onComplete={() => setBids(bids.filter(b => b !== id))} />)}
        <div style={{ fontSize: '14px', color: '#94a3b8' }}>JACKPOT</div>
        <div style={{ fontSize: '48px', fontWeight: 'bold' }}>${gameState.jackpot.toFixed(2)}</div>
      </div>

      <button onClick={placeBid} disabled={gameState.status !== 'ACTIVE'} style={{ width: '100%', maxWidth: '300px', padding: '20px', borderRadius: '50px', background: '#ef4444', border: 'none', color: 'white', fontWeight: 'bold', fontSize: '20px', marginTop: '30px' }}>
        {gameState.status === 'ACTIVE' ? `BID $${gameState.bidCost}` : 'ENDED'}
      </button>
    </div>
  );
}

export default function App() {
  const { login, logout, user, authenticated, ready } = usePrivy();
  if (!ready) return null;
  return (
    <PrivyProvider appId={PRIVY_APP_ID}>
      {authenticated ? <GameDashboard logout={logout} user={user} /> : <LoginScreen login={login} />}
    </PrivyProvider>
  );
}

