import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { PrivyProvider, usePrivy, useWallets } from '@privy-io/react-auth';
import { parseEther } from 'viem';

// IMPORT YOUR NEW COMPONENTS
import Lobby from './components/Lobby';
import GameRoom from './components/GameRoom';
import MilliTimer from './components/MilliTimer'; // Used in Landing Page preview

// --- CONFIGURATION ---
const PRIVY_APP_ID = "cm4l3033r048epf1ln3q59956";
// CHANGE THIS TO YOUR LOCAL IP IF TESTING ON PHONE, OR LIVE URL
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

  // --- STATE MANAGEMENT ---
  const [user, setUser] = useState(null); // Backend user data
  const [view, setView] = useState('landing'); // 'landing', 'lobby', 'game'
  const [activeRoom, setActiveRoom] = useState(null); // 'low' or 'high'
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

    // Listen for connection stats
    socket.on('gameConfig', (cfg) => {
       if (cfg?.adminWallet) setAdminWallet(cfg.adminWallet);
       if (cfg?.connectedUsers) setConnectedUsers(cfg.connectedUsers);
    });

    // Listen for Auth Success from Backend (Custom Login or Privy Sync)
    socket.on('authSuccess', (userData) => {
      setUser(userData);
      setView('lobby'); // Go to Lobby on login
    });

    socket.on('balanceUpdate', (bal) => {
      setUser(prev => prev ? { ...prev, balance: bal } : null);
    });

    socket.on('depositSuccess', () => { setShowDeposit(false); alert("Deposit Confirmed!"); });
    socket.on('withdrawalSuccess', () => { setShowWithdraw(false); alert("Withdrawal Requested!"); });

    // Privy Sync: If Privy is logged in, tell backend
    if (ready && authenticated && privyUser?.email?.address) {
       socket.emit('getUserBalance', privyUser.email.address);
    }
    
    // Check LocalStorage for custom login
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

  // --- TRANSACTION LOGIC (Kept Centralized) ---
  const handleDeposit = async () => {
    try {
      if (!depositAmount || depositAmount <= 0) return alert("Invalid Amount");
      
      let provider = window.ethereum;
      let account = null;

      // Detect Wallet
      if (!provider) {
          const w = wallets.find(w => w.walletClientType !== 'privy');
          if (w) provider = await w.getEthereumProvider();
      }
      if (!provider) return alert("No Wallet Detected");

      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      account = accounts[0];

      // Chain Switching Logic
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
         // Add chain if missing (Simplified for brevity)
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
        
        {/* VIEW ROUTER */}
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

// --- LANDING PAGE (Internal Component) ---
const LandingPage = ({ onLogin, privyLogin }) => {
   const [mode, setMode] = useState('home');
   const [email, setEmail] = useState('');
   const [password, setPassword] = useState('');
   const [username, setUsername] = useState('');

   const handleSubmit = (type) => {
      if (type === 'login') socket.emit('login', { email, password });
      if (type === 'signup') socket.emit('register', { email, password, username, otp: '0000' }); // Note: OTP simplified for flow
      // In real version, you'd add the OTP modal flow here
   };

   // Listen for Auth response specifically for Landing
   useEffect(() => {
     socket.on('authSuccess', (u) => onLogin(u));
     return () => socket.off('authSuccess');
   }, [onLogin]);

   if (mode === 'login') return (
     <div className="landing-form fade-in">
        <h2>LOGIN</h2>
        <input className="input-field" placeholder="Email" onChange={e => setEmail(e.target.value)} />
        <input className="input-field" type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} />
        <button className="action-btn" onClick={() => handleSubmit('login')}>ENTER</button>
        <p onClick={() => setMode('home')} style={{cursor:'pointer', marginTop:'10px'}}>Back</p>
     </div>
   );

   return (
     <div className="landing-hero fade-in">
       <h1>BID<span style={{color:'#fbbf24'}}>BLAZE</span></h1>
       <p>The Ultimate Crypto Auction</p>
       <div style={{display:'flex', gap:'10px', marginTop:'20px'}}>
         <button className="action-btn" onClick={() => setMode('login')}>LOGIN</button>
         <button className="action-btn" onClick={privyLogin} style={{background:'#334155'}}>WALLET LOGIN</button>
       </div>
       <div className="lp-stats">
          <div className="stat-box">2 Rooms Live</div>
          <div className="stat-box">Instant Payouts</div>
       </div>
     </div>
   );
}

// --- GLOBAL STYLES ---
const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800;900&family=JetBrains+Mono:wght@500&display=swap');
    :root { --bg-dark: #020617; --glass: rgba(255, 255, 255, 0.05); }
    body { margin: 0; background: var(--bg-dark); color: white; font-family: 'Outfit', sans-serif; overflow-x: hidden; }
    .app-container { min-height: 100vh; display: flex; flex-direction: column; align-items: center; padding-top: 20px; background: radial-gradient(circle at top, #1e293b, #020617); }
    
    /* MODALS */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 100; display: flex; justify-content: center; align-items: center; }
    .glass-card { background: #0f172a; border: 1px solid #334155; border-radius: 24px; padding: 30px; width: 90%; max-width: 350px; text-align: center; position: relative; }
    .close-btn { position: absolute; top: 15px; right: 15px; background: none; border: none; color: white; font-size: 20px; cursor: pointer; }
    .input-field { width: 100%; background: #1e293b; border: 1px solid #334155; padding: 14px; border-radius: 12px; color: white; margin-bottom: 15px; box-sizing: border-box; }
    .action-btn { width: 100%; padding: 14px; background: #fbbf24; border: none; border-radius: 12px; color: black; font-weight: 900; cursor: pointer; margin-bottom: 10px; }
    
    /* LANDING */
    .landing-hero { text-align: center; margin-top: 100px; }
    .landing-hero h1 { font-size: 60px; margin: 0; font-weight: 900; letter-spacing: -2px; }
    .lp-stats { display: flex; gap: 20px; justify-content: center; margin-top: 40px; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }
    .landing-form { width: 300px; margin-top: 100px; text-align: center; }
    
    .fade-in { animation: popIn 0.3s ease-out; }
    @keyframes popIn { 0% { opacity:0; transform:scale(0.95); } 100% { opacity:1; transform:scale(1); } }
  `}</style>
);
