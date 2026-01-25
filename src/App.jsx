import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { PrivyProvider, usePrivy, useWallets } from '@privy-io/react-auth';
import { parseEther } from 'viem';

// IMPORT YOUR COMPONENTS
import Lobby from './components/Lobby';
import GameRoom from './components/GameRoom';

// --- CONFIGURATION ---
const PRIVY_APP_ID = "cm4l3033r048epf1ln3q59956"; 
const SERVER_URL = "https://bidblaze-server.onrender.com";

export const socket = io(SERVER_URL, {
  transports: ['websocket', 'polling'],
  autoConnect: true,
  reconnection: true
});

// --- CHAIN CONFIG ---
const BASE_CHAIN = {
  id: 8453, name: 'Base', network: 'base',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://mainnet.base.org'] } }
};
const BSC_CHAIN = {
  id: 56, name: 'BNB Smart Chain', network: 'bsc',
  nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
  rpcUrls: { default: { http: ['https://bsc-dataseed1.binance.org'] } }
};
const ETH_CHAIN = {
  id: 1, name: 'Ethereum', network: 'homestead',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://cloudflare-eth.com'] } }
};

// --- MAIN APP COMPONENT ---
export default function App() {
  const { login, logout, user: privyUser, ready, authenticated } = usePrivy();
  const { wallets } = useWallets();

  // --- STATE ---
  const [user, setUser] = useState(null); 
  const [view, setView] = useState('landing'); // 'landing', 'lobby', 'game'
  const [activeRoom, setActiveRoom] = useState(null); 
  const [connectedUsers, setConnectedUsers] = useState(0);

  // Modals
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);

  // Transaction State
  const [depositAmount, setDepositAmount] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState('BSC');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [adminWallet, setAdminWallet] = useState(null);

  // --- INITIALIZATION ---
  useEffect(() => {
    if (!socket.connected) socket.connect();

    socket.on('gameConfig', (cfg) => {
       if (cfg?.adminWallet) setAdminWallet(cfg.adminWallet);
       if (cfg?.connectedUsers) setConnectedUsers(cfg.connectedUsers);
    });

    socket.on('authSuccess', (userData) => {
      setUser(userData);
      setView('lobby'); 
    });

    socket.on('balanceUpdate', (bal) => {
      setUser(prev => prev ? { ...prev, balance: bal } : null);
    });

    socket.on('depositSuccess', () => { setShowDeposit(false); alert("Deposit Confirmed!"); });
    socket.on('withdrawalSuccess', () => { setShowWithdraw(false); alert("Withdrawal Requested!"); });

    // Privy Sync
    if (ready && authenticated && privyUser?.email?.address) {
       socket.emit('getUserBalance', privyUser.email.address);
    }

    // Check LocalStorage
    const saved = localStorage.getItem('bidblaze_user');
    if (saved) {
       const u = JSON.parse(saved);
       setUser(u);
       setView('lobby');
       socket.emit('getUserBalance', u.email);
    }

    return () => {
      socket.off('authSuccess');
      socket.off('balanceUpdate');
      socket.off('depositSuccess');
      socket.off('withdrawalSuccess');
    };
  }, [ready, authenticated, privyUser]);

  // --- ACTIONS ---
  const handleLogout = async () => {
    localStorage.removeItem('bidblaze_user');
    setUser(null);
    setView('landing');
    setActiveRoom(null);
    await logout();
  };

  const handleJoinRoom = (roomType) => {
    setActiveRoom(roomType);
    setView('game');
  };

  const handleLeaveRoom = () => {
    setActiveRoom(null);
    setView('lobby');
  };

  const handleDeposit = async () => {
    try {
      if (!depositAmount || depositAmount <= 0) return alert("Invalid Amount");
      let provider = window.ethereum;
      let account = null;

      if (!provider) {
          const w = wallets.find(w => w.walletClientType !== 'privy');
          if (w) provider = await w.getEthereumProvider();
      }
      if (!provider) return alert("No Wallet Detected");

      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      account = accounts[0];

      const chainConfig = {
        'BSC': { hex: '0x38', rpc: 'https://bsc-dataseed1.binance.org' },
        'ETH': { hex: '0x1', rpc: 'https://cloudflare-eth.com' },
        'BASE': { hex: '0x2105', rpc: 'https://mainnet.base.org' }
      };
      const target = chainConfig[selectedNetwork];

      try {
        await provider.request({
             method: 'wallet_switchEthereumChain',
             params: [{ chainId: target.hex }]
        });
      } catch (e) {
         alert("Please switch network manually to " + selectedNetwork);
         return;
      }

      const wei = parseEther(depositAmount.toString());
      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{ from: account, to: adminWallet, value: `0x${wei.toString(16)}` }]
      });

      if (txHash) {
        socket.emit('verifyDeposit', { email: user.email, txHash, network: selectedNetwork });
        alert("Transaction Sent! Waiting for confirmation...");
      }
    } catch (err) {
      alert("Deposit Failed: " + err.message);
    }
  };

  const handleWithdraw = () => {
     if (user.balance < withdrawAmount) return alert("Insufficient Funds");
     socket.emit('requestWithdrawal', {
       email: user.email, amount: parseFloat(withdrawAmount),
       address: withdrawAddress, network: selectedNetwork
     });
  };

  // --- RENDER ---
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ['email', 'wallet'],
        appearance: { theme: 'dark', accentColor: '#fbbf24' },
        supportedChains: [BASE_CHAIN, BSC_CHAIN, ETH_CHAIN]
      }}
    >
      <div className="app-container">

        {view === 'landing' && (
           <LandingPage
             onLogin={(u) => {
               localStorage.setItem('bidblaze_user', JSON.stringify(u));
               setUser(u);
               setView('lobby');
             }}
             privyLogin={login}
           />
        )}

        {view === 'lobby' && user && (
           <Lobby
             user={user}
             connectedUsers={connectedUsers}
             onJoin={handleJoinRoom}
             onLogout={handleLogout}
           />
        )}

        {view === 'game' && user && activeRoom && (
           <GameRoom
             socket={socket}
             user={user}
             roomType={activeRoom}
             onLeave={handleLeaveRoom}
             openDeposit={() => setShowDeposit(true)}
             openWithdraw={() => setShowWithdraw(true)}
           />
        )}

        {/* --- GLOBAL MODALS --- */}
        {showDeposit && (
          <div className="modal-overlay">
             <div className="glass-card modal-content fade-in">
                <button className="close-btn" onClick={() => setShowDeposit(false)}>×</button>
                <h2 style={{color: '#22c55e'}}>DEPOSIT</h2>
                <select className="input-field" onChange={e => setSelectedNetwork(e.target.value)} value={selectedNetwork}>
                   <option value="BSC">BNB Smart Chain</option>
                   <option value="ETH">Ethereum</option>
                   <option value="BASE">Base</option>
                </select>
                <input type="number" className="input-field" placeholder="Amount (e.g. 0.1)" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} />
                <button className="action-btn" onClick={handleDeposit} style={{background:'#22c55e'}}>PAY NOW</button>
             </div>
          </div>
        )}
        {showWithdraw && (
          <div className="modal-overlay">
             <div className="glass-card modal-content fade-in">
                <button className="close-btn" onClick={() => setShowWithdraw(false)}>×</button>
                <h2 style={{color: '#ef4444'}}>WITHDRAW</h2>
                <select className="input-field" onChange={e => setSelectedNetwork(e.target.value)} value={selectedNetwork}>
                   <option value="BSC">BNB Smart Chain</option>
                   <option value="ETH">Ethereum</option>
                </select>
                <input type="number" className="input-field" placeholder="Amount ($)" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} />
                <input type="text" className="input-field" placeholder="Wallet Address" value={withdrawAddress} onChange={e => setWithdrawAddress(e.target.value)} />
                <button className="action-btn" onClick={handleWithdraw} style={{background:'#ef4444'}}>REQUEST PAYOUT</button>
             </div>
          </div>
        )}

      </div>
      <GlobalStyle />
    </PrivyProvider>
  );
}

// --- RESTORED RICH LANDING PAGE ---
const LandingPage = ({ onLogin, privyLogin }) => {
   const [mode, setMode] = useState('home');
   const [email, setEmail] = useState('');
   const [password, setPassword] = useState('');
   const [username, setUsername] = useState('');

   const features = [
    { icon: "⚡", title: "Instant", desc: "No signup lag. Play immediately." },
    { icon: "⚖️", title: "Fair", desc: "Provably fair game logic. Blockchain verified." },
    { icon: "💰", title: "High Yield", desc: "Small bids, massive jackpots. Winner takes all." }
   ];

   const handleSubmit = (type) => {
      if (type === 'login') socket.emit('login', { email, password });
      if (type === 'signup') socket.emit('register', { email, password, username, otp: '0000' });
   };

   useEffect(() => {
     socket.on('authSuccess', (u) => onLogin(u));
     return () => socket.off('authSuccess');
   }, [onLogin]);

   if (mode === 'login' || mode === 'signup') return (
     <div className="landing-overlay fade-in">
        <div className="glass-card">
           <h2 style={{marginBottom:'20px', fontSize:'24px'}}>{mode === 'login' ? 'LOGIN' : 'SIGN UP'}</h2>
           {mode === 'signup' && <input className="input-field" placeholder="Username" onChange={e => setUsername(e.target.value)} />}
           <input className="input-field" placeholder="Email" onChange={e => setEmail(e.target.value)} />
           <input className="input-field" type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} />
           <button className="action-btn" onClick={() => handleSubmit(mode)}>{mode === 'login' ? 'ENTER' : 'REGISTER'}</button>
           
           <div style={{marginTop:'20px', display:'flex', justifyContent:'space-between', fontSize:'12px', color:'#94a3b8'}}>
              <span onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} style={{cursor:'pointer'}}>
                  {mode === 'login' ? 'Create Account' : 'Have an account?'}
              </span>
              <span onClick={() => setMode('home')} style={{cursor:'pointer'}}>Cancel</span>
           </div>
        </div>
     </div>
   );

   return (
     <div className="landing-scroll-container fade-in">
       {/* 1. HERO SECTION */}
       <div className="landing-hero">
         <h1 className="hero-logo">BID<span style={{color:'#fbbf24'}}>BLAZE</span></h1>
         <p className="hero-subtitle">The Ultimate Crypto Auction</p>
         
         <div className="hero-actions">
           <button className="hero-btn primary" onClick={() => setMode('login')}>LOGIN</button>
           <button className="hero-btn secondary" onClick={privyLogin}>WALLET LOGIN</button>
         </div>

         {/* Detailed Stats Restored */}
         <div className="lp-stats-row">
            <div className="lp-stat">
                <span className="val">2,401</span>
                <span className="lbl">Live Players</span>
            </div>
            <div className="lp-stat">
                <span className="val" style={{color:'#fbbf24'}}>$142k+</span>
                <span className="lbl">Paid Out</span>
            </div>
            <div className="lp-stat">
                <span className="val">0.5s</span>
                <span className="lbl">Latency</span>
            </div>
         </div>
       </div>

       {/* 2. MARQUEE SECTION (Restored) */}
       <div className="lp-marquee-container">
          <div className="lp-marquee-content">
            <span>🏆 User88 just won $450.00 (ETH)</span> •
            <span>🚀 CryptoKing just won $1,200.00 (BNB)</span> •
            <span>💰 Jackpot currently at $52.00</span> •
            <span>🔥 Alex_99 just won $320.00 (BASE)</span> •
            <span>⏳ New Round Starting...</span>
          </div>
       </div>

       {/* 3. FEATURES GRID (Restored) */}
       <div className="lp-features">
          {features.map((f, i) => (
            <div key={i} className="lp-feature-card">
                  <div className="lp-icon">{f.icon}</div>
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
            </div>
          ))}
       </div>

       {/* 4. FOOTER (Restored) */}
       <div className="lp-footer">
         © 2026 BidBlaze Protocol. All rights reserved.
       </div>
     </div>
   );
}

// --- GLOBAL STYLES (INCLUDES ALL LANDING PAGE CSS) ---
const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800;900&family=JetBrains+Mono:wght@500&display=swap');
    :root { --bg-dark: #020617; --glass: rgba(255, 255, 255, 0.05); }
    body { margin: 0; background: var(--bg-dark); color: white; font-family: 'Outfit', sans-serif; overflow-x: hidden; }
    
    .app-container { 
        min-height: 100vh; 
        display: flex; flex-direction: column; align-items: center; justify-content: flex-start;
        background: radial-gradient(circle at top, #1e293b, #020617);
    }

    /* MODALS */
    .modal-overlay, .landing-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 100; display: flex; justify-content: center; align-items: center; backdrop-filter: blur(5px); }
    .glass-card { background: #0f172a; border: 1px solid #334155; border-radius: 24px; padding: 30px; width: 85%; max-width: 350px; text-align: center; position: relative; box-shadow: 0 10px 40px rgba(0,0,0,0.5); }
    .close-btn { position: absolute; top: 15px; right: 15px; background: none; border: none; color: white; font-size: 20px; cursor: pointer; }
    .input-field { width: 100%; background: #1e293b; border: 1px solid #334155; padding: 14px; border-radius: 12px; color: white; margin-bottom: 12px; box-sizing: border-box; font-family: inherit; }
    .input-field:focus { outline: none; border-color: #fbbf24; }
    .action-btn { width: 100%; padding: 14px; background: #fbbf24; border: none; border-radius: 12px; color: black; font-weight: 900; cursor: pointer; transition: 0.2s; }
    .action-btn:active { transform: scale(0.98); }

    /* LANDING PAGE SPECIFIC STYLES */
    .landing-scroll-container { width: 100%; display: flex; flex-direction: column; align-items: center; }
    
    .landing-hero { text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; padding-top: 80px; width: 100%; }
    .hero-logo { font-size: 64px; margin: 0; font-weight: 900; letter-spacing: -2px; }
    .hero-subtitle { font-size: 16px; color: #94a3b8; margin: 10px 0 40px 0; font-weight: 400; }
    
    .hero-actions { display: flex; gap: 15px; width: 100%; max-width: 350px; justify-content: center; }
    
    .hero-btn { flex: 1; padding: 16px; border: none; border-radius: 12px; font-weight: 800; font-size: 14px; cursor: pointer; transition: transform 0.2s; text-transform: uppercase; }
    .hero-btn:active { transform: scale(0.95); }
    .hero-btn.primary { background: #fbbf24; color: black; box-shadow: 0 4px 15px rgba(251, 191, 36, 0.3); }
    .hero-btn.secondary { background: #1e293b; color: #cbd5e1; border: 1px solid #334155; }
    .hero-btn.secondary:hover { background: #334155; color: white; }

    /* Stats Row (Restored) */
    .lp-stats-row { display: flex; gap: 40px; margin-top: 60px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 30px; }
    .lp-stat { display: flex; flex-direction: column; align-items: center; }
    .lp-stat .val { font-size: 28px; font-weight: 800; }
    .lp-stat .lbl { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-top: 5px; }

    /* Marquee (Restored) */
    .lp-marquee-container { width: 100%; background: #0f172a; padding: 15px 0; margin: 60px 0; overflow: hidden; white-space: nowrap; border-top: 1px solid #1e293b; border-bottom: 1px solid #1e293b; }
    .lp-marquee-content { display: inline-block; animation: marquee 20s linear infinite; font-family: 'JetBrains Mono', monospace; font-size: 14px; color: #cbd5e1; }
    .lp-marquee-content span { margin: 0 20px; }
    @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }

    /* Features Grid (Restored) */
    .lp-features { display: flex; gap: 20px; padding: 20px; flex-wrap: wrap; justify-content: center; max-width: 1000px; margin-bottom: 40px; }
    .lp-feature-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); padding: 30px; border-radius: 20px; width: 250px; text-align: left; }
    .lp-icon { font-size: 30px; margin-bottom: 15px; }
    .lp-feature-card h3 { margin: 0 0 10px 0; font-size: 18px; color: white; }
    .lp-feature-card p { margin: 0; font-size: 14px; color: #94a3b8; line-height: 1.5; }

    .lp-footer { margin-top: 20px; color: #475569; font-size: 12px; padding-bottom: 40px; }

    .fade-in { animation: popIn 0.4s ease-out; }
    @keyframes popIn { 0% { opacity:0; transform:scale(0.95); } 100% { opacity:1; transform:scale(1); } }

    @media (max-width: 600px) {
        .hero-logo { font-size: 42px; }
        .lp-stats-row { gap: 20px; flex-direction: row; flex-wrap: wrap; justify-content: center; }
        .lp-action-container { flex-direction: column; width: 100%; max-width: 280px; }
    }
  `}</style>
);
