import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { PrivyProvider, usePrivy, useWallets } from '@privy-io/react-auth';
import { parseEther } from 'viem';

// IMPORT COMPONENTS
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
const BASE_CHAIN = { id: 8453, name: 'Base', network: 'base', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: { default: { http: ['https://mainnet.base.org'] } } };
const BSC_CHAIN = { id: 56, name: 'BNB Smart Chain', network: 'bsc', nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 }, rpcUrls: { default: { http: ['https://bsc-dataseed1.binance.org'] } } };
const ETH_CHAIN = { id: 1, name: 'Ethereum', network: 'homestead', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: { default: { http: ['https://cloudflare-eth.com'] } } };

// --- MODAL COMPONENTS ---
const HowToPlay = ({ onClose }) => (
  <div className="modal-overlay">
    <div className="glass-card modal-content fade-in" style={{textAlign:'left'}}>
      <button className="close-btn" onClick={onClose}>×</button>
      <h2 style={{color: '#fbbf24', textAlign:'center', marginBottom:'20px'}}>How to Win 🏆</h2>
      <div style={{display:'flex', gap:'15px', marginBottom:'15px'}}>
        <div style={{background:'#3b82f6', borderRadius:'50%', width:'30px', height:'30px', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold'}}>1</div>
        <div><div style={{fontWeight:'bold', color:'white'}}>Deposit Crypto</div><div style={{fontSize:'12px', color:'#94a3b8'}}>Connect Wallet & Pay (BSC/ETH/Base).</div></div>
      </div>
      <div style={{display:'flex', gap:'15px', marginBottom:'15px'}}>
        <div style={{background:'#ef4444', borderRadius:'50%', width:'30px', height:'30px', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold'}}>2</div>
        <div><div style={{fontWeight:'bold', color:'white'}}>Place a Bid</div><div style={{fontSize:'12px', color:'#94a3b8'}}>Bid costs specific amount and resets timer.</div></div>
      </div>
      <div style={{display:'flex', gap:'15px', marginBottom:'15px'}}>
        <div style={{background:'#22c55e', borderRadius:'50%', width:'30px', height:'30px', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold'}}>3</div>
        <div><div style={{fontWeight:'bold', color:'white'}}>Be the Last One</div><div style={{fontSize:'12px', color:'#94a3b8'}}>Last bidder wins the <span style={{color:'#fbbf24'}}>JACKPOT!</span></div></div>
      </div>
      <div style={{display:'flex', gap:'15px', marginBottom:'15px'}}>
        <div style={{background:'#a855f7', borderRadius:'50%', width:'30px', height:'30px', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold'}}>4</div>
        <div><div style={{fontWeight:'bold', color:'white'}}>Only Bidder?</div><div style={{fontSize:'12px', color:'#94a3b8'}}>If no one challenges you, the game voids and you get a <span style={{color:'#fbbf24'}}>FULL REFUND</span>.</div></div>
      </div>
      <button className="action-btn" onClick={onClose}>Got it! Let's Play</button>
    </div>
  </div>
);

const FaqModal = ({ onClose }) => (
  <div className="modal-overlay">
    <div className="glass-card modal-content fade-in" style={{textAlign:'left', maxHeight:'80vh', overflowY:'auto', padding: '30px'}}>
      <button className="close-btn" onClick={onClose}>×</button>
      <h2 style={{color: '#fbbf24', textAlign:'center', marginBottom:'20px'}}>BidBlaze FAQ</h2>
      <div style={{color:'#cbd5e1', fontSize:'14px', lineHeight:'1.6'}}>
           <h3 style={{color:'white', marginTop:'20px', marginBottom:'5px'}}>What is BidBlaze?</h3>
           <p style={{marginTop:0}}>BidBlaze is a fast-paced, real-time crypto auction game where players battle for a growing jackpot. Each bid costs exactly $1.00 from your balance and adds time to the countdown. The last player to bid when the timer expires wins the entire pot instantly! Everything is transparent, with blockchain verification for all deposits and fair game mechanics.</p>
           <h3 style={{color:'white', marginTop:'20px', marginBottom:'5px'}}>How do I play and win?</h3>
           <ul style={{marginTop:0, paddingLeft:'20px'}}>
              <li>Deposit crypto to fund your balance.</li>
              <li>Bid $1.00 – this extends the timer and keeps you in the game.</li>
              <li>Survive longer than others by bidding strategically.</li>
              <li>Claim the jackpot – if you're the final bidder, the full amount is added to your balance right away.</li>
              <li><strong>No Competition Rule:</strong> If no one else bids against you in a round, it's automatically canceled for fairness, and you receive a 100% refund on all your bids.</li>
           </ul>
           <p style={{textAlign:'center', marginTop:'30px', fontWeight:'bold', color:'#fbbf24'}}>Good luck out there – may you snipe some massive pots! 🚀</p>
      </div>
      <button className="action-btn" onClick={onClose} style={{marginTop:'20px'}}>Close FAQ</button>
    </div>
  </div>
);

const TermsModal = ({ onClose }) => (
  <div className="modal-overlay">
    <div className="glass-card modal-content fade-in" style={{textAlign:'left', maxHeight:'80vh', overflowY:'auto', padding: '30px'}}>
      <button className="close-btn" onClick={onClose}>×</button>
      <h2 style={{color: '#fbbf24', textAlign:'center', marginBottom:'20px'}}>Terms of Service</h2>
      <div style={{color:'#cbd5e1', fontSize:'12px', lineHeight:'1.6'}}>
          <p><strong>1. Acceptance of Terms</strong><br/>By accessing BidBlaze, you agree to be bound by these terms. Risk is inherent in crypto gaming.</p>
          <p><strong>2. Game Mechanics</strong><br/>Bids are non-refundable unless the round concludes with only a single participant (The "Void/Refund" Rule). The last registered bidder when the server timer reaches zero is declared the winner.</p>
          <p><strong>3. Transactions</strong><br/>Deposits require 1 blockchain confirmation. Withdrawals are processed automatically but are subject to security reviews which may take 10-60 minutes depending on network congestion.</p>
          <p><strong>4. Fair Play</strong><br/>Use of exploits, botnets, or multiple accounts to abuse referral bonuses will result in immediate account suspension.</p>
      </div>
      <button className="action-btn" onClick={onClose} style={{marginTop:'20px'}}>I Agree & Close</button>
    </div>
  </div>
);

// --- MAIN APP COMPONENT ---
export default function App() {
  const { login, logout, user: privyUser, ready, authenticated } = usePrivy();
  const { wallets } = useWallets();

  // --- STATE ---
  const [user, setUser] = useState(null); 
  const [view, setView] = useState('landing'); 
  const [activeRoom, setActiveRoom] = useState(null); 
  const [connectedUsers, setConnectedUsers] = useState(0);

  // Modals & Menu State
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showFaq, setShowFaq] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  
  // New: Transaction/Bids Modals for Menu
  const [showHistory, setShowHistory] = useState(false); 
  const [showUserBids, setShowUserBids] = useState(false);

  // Profile Editing State
  const [editingUsername, setEditingUsername] = useState("");

  // Transaction History
  const [depositHistory, setDepositHistory] = useState([]);
  const [withdrawHistory, setWithdrawHistory] = useState([]);

  // Transaction State
  const [depositAmount, setDepositAmount] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState('BSC');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [adminWallet, setAdminWallet] = useState(null);
  const [muted, setMuted] = useState(false);

  // --- INITIALIZATION ---
  useEffect(() => {
    if (!socket.connected) socket.connect();

    socket.on('gameConfig', (cfg) => {
       if (cfg?.adminWallet) setAdminWallet(cfg.adminWallet);
       if (cfg?.connectedUsers) setConnectedUsers(cfg.connectedUsers);
    });

    socket.on('authSuccess', (userData) => {
      setUser(userData);
      setEditingUsername(userData.username); // Init editing state
      setView('lobby'); 
    });

    socket.on('balanceUpdate', (bal) => {
      setUser(prev => prev ? { ...prev, balance: bal } : null);
    });

    socket.on('userData', (u) => {
        setUser(prev => ({...prev, ...u}));
    });

    socket.on('depositHistory', (data) => setDepositHistory(data));
    socket.on('withdrawalHistory', (data) => setWithdrawHistory(data));

    socket.on('depositSuccess', () => { setShowDeposit(false); alert("Deposit Confirmed!"); });
    socket.on('withdrawalSuccess', () => { setShowWithdraw(false); alert("Withdrawal Requested!"); });

    if (ready && authenticated && privyUser?.email?.address) {
       socket.emit('getUserBalance', privyUser.email.address);
    }

    const saved = localStorage.getItem('bidblaze_user');
    if (saved) {
       const u = JSON.parse(saved);
       setUser(u);
       setEditingUsername(u.username);
       setView('lobby');
       socket.emit('getUserBalance', u.email);
    }

    return () => {
      socket.off('authSuccess');
      socket.off('balanceUpdate');
      socket.off('userData');
      socket.off('depositHistory');
      socket.off('withdrawalHistory');
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
    setShowMenu(false);
    await logout();
  };

  const handleUpdateUsername = () => {
    if(!editingUsername || editingUsername.length < 3) return alert("Username too short.");
    socket.emit('updateProfile', { email: user.email, username: editingUsername });
    alert("Username updated!");
    setUser(prev => ({...prev, username: editingUsername}));
    setShowProfile(false);
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
             onAuthSuccess={(u) => {
               localStorage.setItem('bidblaze_user', JSON.stringify(u));
               setUser(u);
               setEditingUsername(u.username);
               setView('lobby');
             }}
             privyLogin={login}
           />
        )}

        {view === 'lobby' && user && (
           <Lobby
             user={user}
             connectedUsers={connectedUsers}
             onJoin={(room) => { setActiveRoom(room); setView('game'); }}
             onLogout={handleLogout}
             onOpenHelp={() => setShowHelp(true)}
             onOpenMenu={() => setShowMenu(true)}
             onOpenProfile={() => setShowProfile(true)}
             onOpenDeposit={() => setShowDeposit(true)}
           />
        )}

        {view === 'game' && user && activeRoom && (
           <GameRoom
             socket={socket}
             user={user}
             roomType={activeRoom}
             onLeave={() => { setActiveRoom(null); setView('lobby'); }}
             openDeposit={() => setShowDeposit(true)}
             openWithdraw={() => setShowWithdraw(true)}
           />
        )}

        {/* --- PROFESSIONAL MENU DRAWER (BC.GAME STYLE) --- */}
        {showMenu && user && (
            <div className="modal-overlay" style={{justifyContent: 'flex-end', alignItems: 'stretch'}} onClick={(e) => { if(e.target.className.includes('modal-overlay')) setShowMenu(false); }}>
                <div className="menu-drawer slide-in-right">
                    
                    {/* USER HEADER */}
                    <div className="menu-user-card" onClick={() => { setShowMenu(false); setShowProfile(true); }}>
                        <div className="avatar-large">{user.username.charAt(0).toUpperCase()}</div>
                        <div className="user-details">
                            <div className="menu-username">{user.username}</div>
                            <div className="menu-uid">ID: {user.id ? user.id.slice(0,8) : '883920'} ❐</div>
                        </div>
                        <div className="arrow-icon">›</div>
                    </div>

                    {/* VIP BAR */}
                    <div className="vip-section">
                        <div className="vip-header">
                            <span className="vip-label">VIP 1</span>
                            <span className="vip-club">VIP Club ›</span>
                        </div>
                        <div className="progress-track">
                            <div className="progress-fill" style={{width: '20%'}}></div>
                        </div>
                        <div className="xp-text">20 XP to VIP 2</div>
                    </div>

                    {/* BALANCE */}
                    <div className="menu-balance-area">
                        <div className="total-bal-label">Total Balance</div>
                        <div className="total-bal-value">${user.balance.toFixed(2)}</div>
                        
                        <div className="menu-actions">
                            <button className="menu-act-btn deposit" onClick={() => { setShowMenu(false); setShowDeposit(true); }}>
                                ⚡ Deposit
                            </button>
                            <button className="menu-act-btn withdraw" onClick={() => { setShowMenu(false); setShowWithdraw(true); }}>
                                🏦 Withdraw
                            </button>
                        </div>
                    </div>

                    {/* QUICK LINKS GRID */}
                    <div className="quick-grid">
                        <div className="q-item" onClick={() => { setShowMenu(false); setShowDeposit(true); }}>
                            <div className="q-icon">💰</div>
                            <span>Buy</span>
                        </div>
                        <div className="q-item">
                            <div className="q-icon">🔄</div>
                            <span>Swap</span>
                        </div>
                        <div className="q-item" onClick={() => { setShowMenu(false); setShowUserBids(true); }}>
                            <div className="q-icon">🔒</div>
                            <span>Vault</span>
                        </div>
                        <div className="q-item" onClick={() => { setShowMenu(false); setShowDeposit(true); }}>
                            <div className="q-icon">📋</div>
                            <span>Transact</span>
                        </div>
                    </div>

                    {/* LIST MENU */}
                    <div className="menu-list">
                        <div className="list-item" onClick={() => { setShowMenu(false); setShowProfile(true); }}>
                            <span>🔔 Notification</span>
                            <span className="badge">2</span>
                        </div>
                        <div className="list-item" onClick={() => { setShowMenu(false); setShowProfile(true); }}>
                            <span>👥 Refer and Earn</span>
                            <span className="arrow">›</span>
                        </div>
                        <div className="list-item" onClick={() => { setShowMenu(false); setShowHelp(true); }}>
                            <span>❓ Help & Support</span>
                            <span className="arrow">›</span>
                        </div>
                        <div className="list-item" onClick={() => { setShowMenu(false); setShowFaq(true); }}>
                            <span>📖 FAQ</span>
                            <span className="arrow">›</span>
                        </div>
                        <div className="list-item" onClick={() => { setShowMenu(false); setShowTerms(true); }}>
                            <span>📜 Terms of Service</span>
                            <span className="arrow">›</span>
                        </div>
                    </div>

                    {/* SETTINGS FOOTER */}
                    <div className="menu-footer">
                        <div className="setting-row">
                            <span>Global Setting</span>
                            <span className="arrow">›</span>
                        </div>
                        <div className="footer-actions">
                            <button className="theme-btn" onClick={() => setMuted(!muted)}>
                                {muted ? '🔇' : '🔊'}
                            </button>
                            <button className="logout-btn-full" onClick={handleLogout}>
                                LOGOUT
                            </button>
                        </div>
                    </div>

                </div>
                <style>{`
                    .menu-drawer { width: 85%; max-width: 320px; background: #18191d; height: 100%; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 20px; box-shadow: -5px 0 30px rgba(0,0,0,0.8); }
                    .slide-in-right { animation: slideIn 0.3s ease-out; }
                    @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }

                    .menu-user-card { display: flex; align-items: center; gap: 12px; background: #24262b; padding: 12px; border-radius: 12px; cursor: pointer; }
                    .avatar-large { width: 45px; height: 45px; background: #fbbf24; border-radius: 50%; display: flex; alignItems: center; justifyContent: center; font-weight: 900; color: black; font-size: 20px; }
                    .user-details { flex: 1; }
                    .menu-username { font-weight: 800; color: white; font-size: 16px; }
                    .menu-uid { font-size: 11px; color: #676d7c; margin-top: 2px; }
                    .arrow-icon { color: #676d7c; font-size: 20px; }

                    .vip-section { background: #24262b; padding: 12px; border-radius: 12px; }
                    .vip-header { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 12px; font-weight: 800; }
                    .vip-label { color: white; }
                    .vip-club { color: #3bc117; cursor: pointer; }
                    .progress-track { height: 6px; background: #16181b; border-radius: 3px; overflow: hidden; }
                    .progress-fill { height: 100%; background: #3bc117; }
                    .xp-text { font-size: 10px; color: #676d7c; margin-top: 6px; text-align: right; }

                    .menu-balance-area { }
                    .total-bal-label { color: #676d7c; font-size: 12px; }
                    .total-bal-value { color: white; font-size: 20px; font-weight: 900; margin: 5px 0 15px 0; }
                    .menu-actions { display: flex; gap: 10px; }
                    .menu-act-btn { flex: 1; padding: 12px; border: none; border-radius: 8px; font-weight: 800; cursor: pointer; font-size: 13px; color: white; }
                    .deposit { background: #3bc117; }
                    .withdraw { background: #24262b; color: #98a7b5; }

                    .quick-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; padding: 15px 0; border-bottom: 1px solid #24262b; }
                    .q-item { display: flex; flex-direction: column; align-items: center; gap: 5px; cursor: pointer; }
                    .q-icon { font-size: 20px; background: #24262b; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 10px; }
                    .q-item span { font-size: 10px; color: #98a7b5; }

                    .menu-list { display: flex; flex-direction: column; gap: 2px; }
                    .list-item { display: flex; justify-content: space-between; align-items: center; padding: 15px 0; border-bottom: 1px solid #24262b; cursor: pointer; color: #98a7b5; font-size: 13px; font-weight: 600; }
                    .list-item:hover { color: white; }
                    .badge { background: #3bc117; color: white; padding: 2px 6px; border-radius: 10px; font-size: 10px; }

                    .menu-footer { margin-top: auto; }
                    .setting-row { display: flex; justify-content: space-between; padding: 15px 0; color: #98a7b5; font-size: 13px; font-weight: 600; cursor: pointer; }
                    .footer-actions { display: flex; gap: 10px; margin-top: 10px; }
                    .theme-btn { background: #24262b; border: none; width: 40px; height: 40px; border-radius: 8px; cursor: pointer; }
                    .logout-btn-full { flex: 1; background: #24262b; border: none; border-radius: 8px; color: #ef4444; font-weight: 800; cursor: pointer; }
                `}</style>
            </div>
        )}

        {/* --- DEPOSIT MODAL --- */}
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

                <div style={{marginTop:'20px', borderTop:'1px solid #334155', paddingTop:'15px'}}>
                    <p style={{fontSize:'12px', color:'#94a3b8', fontWeight:'bold', textAlign:'left'}}>RECENT DEPOSITS</p>
                    <div style={{maxHeight:'120px', overflowY:'auto'}}>
                        {depositHistory.length === 0 ? <p style={{fontSize:'11px', color:'#64748b'}}>No deposits yet.</p> : 
                         depositHistory.map((d, i) => (
                            <div key={i} style={{display:'flex', justifyContent:'space-between', fontSize:'11px', padding:'8px', borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                                <span style={{color:'white'}}>${Number(d.amount).toFixed(2)}</span>
                                <span style={{color:'#22c55e'}}>{d.status}</span>
                            </div>
                        ))}
                    </div>
                </div>
             </div>
          </div>
        )}

        {/* --- WITHDRAW MODAL --- */}
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

                <div style={{marginTop:'20px', borderTop:'1px solid #334155', paddingTop:'15px'}}>
                    <p style={{fontSize:'12px', color:'#94a3b8', fontWeight:'bold', textAlign:'left'}}>RECENT WITHDRAWALS</p>
                    <div style={{maxHeight:'120px', overflowY:'auto'}}>
                        {withdrawHistory.length === 0 ? <p style={{fontSize:'11px', color:'#64748b'}}>No withdrawals yet.</p> : 
                         withdrawHistory.map((w, i) => (
                            <div key={i} style={{display:'flex', justifyContent:'space-between', fontSize:'11px', padding:'8px', borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                                <span style={{color:'white'}}>${Number(w.amount).toFixed(2)}</span>
                                <span style={{color: w.status === 'PENDING' ? 'orange' : '#22c55e'}}>{w.status}</span>
                            </div>
                        ))}
                    </div>
                </div>
             </div>
          </div>
        )}

        {/* --- USER BIDS MODAL (Restored for Menu) --- */}
        {showUserBids && user && (
            <div className="modal-overlay">
                <div className="glass-card modal-content fade-in" style={{textAlign:'left'}}>
                    <button className="close-btn" onClick={() => setShowUserBids(false)}>×</button>
                    <h2 style={{color: '#3b82f6', textAlign:'center', marginTop:0}}>VAULT / BIDS</h2>
                    <p style={{textAlign:'center', color:'#94a3b8', fontSize:'12px'}}>Your active vault status and bid history.</p>
                    <div style={{textAlign:'center', padding:'20px', background:'rgba(255,255,255,0.05)', borderRadius:'10px', marginTop:'10px'}}>
                        <h3>Coming Soon</h3>
                        <p style={{fontSize:'10px'}}>The Vault Pro feature is currently under development.</p>
                    </div>
                </div>
            </div>
        )}

        {showHelp && <HowToPlay onClose={() => setShowHelp(false)} />}
        {showFaq && <FaqModal onClose={() => setShowFaq(false)} />}
        {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
        {showProfile && user && (
            <div className="modal-overlay">
                <div className="glass-card modal-content fade-in" style={{textAlign:'left'}}>
                    <button className="close-btn" onClick={() => setShowProfile(false)}>×</button>
                    <h2 style={{color: '#3b82f6', textAlign:'center', marginTop:0}}>MY PROFILE</h2>
                    <div style={{marginTop:'20px', marginBottom:'25px'}}>
                        <p style={{color:'#94a3b8', fontSize:'12px', marginBottom:'5px'}}>Edit Username</p>
                        <div style={{display:'flex', gap:'10px'}}>
                            <input type="text" value={editingUsername} onChange={(e) => setEditingUsername(e.target.value)} className="input-field" style={{marginBottom:0}} />
                            <button onClick={handleUpdateUsername} style={{background:'#22c55e', color:'white', border:'none', borderRadius:'12px', fontWeight:'bold', padding:'0 20px', cursor:'pointer'}}>SAVE</button>
                        </div>
                    </div>
                    <div style={{background:'rgba(255,255,255,0.05)', padding:'15px', borderRadius:'12px', marginTop:'20px'}}>
                        <div style={{fontSize:'12px', color:'#fbbf24', fontWeight:'bold', marginBottom:'10px'}}>INVITE FRIENDS & EARN 5%</div>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', background:'rgba(0,0,0,0.3)', padding:'10px', borderRadius:'8px'}}>
                            <span style={{fontFamily:'monospace', fontSize:'16px', letterSpacing:'1px'}}>{user.referralCode || '...'}</span>
                            <button onClick={() => {navigator.clipboard.writeText(user.referralCode); alert("Code Copied!")}} style={{background:'none', border:'none', color:'#3b82f6', cursor:'pointer', fontWeight:'bold'}}>COPY</button>
                        </div>
                    </div>
                </div>
            </div>
        )}

      </div>
      <GlobalStyle />
    </PrivyProvider>
  );
}

// --- LANDING PAGE ---
function LandingPage({ privyLogin, onAuthSuccess }) {
  const [authMode, setAuthMode] = useState('home'); 
  const [formData, setFormData] = useState({ username: '', email: '', password: '', referralCode: '' });
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState('');
  const [signupStep, setSignupStep] = useState(1); 
  const [resetStep, setResetStep] = useState(1); 

  const features = [
    { icon: "⚡", title: "Instant", desc: "No signup lag. Create account & play immediately." },
    { icon: "⚖️", title: "Fair", desc: "Provably fair game logic. Blockchain verified payouts." },
    { icon: "💰", title: "High Yield", desc: "Small bids, massive jackpots. Winner takes all." }
  ];

  useEffect(() => {
      let path = "/";
      if(authMode === 'login') path = "/login";
      if(authMode === 'signup') path = "/signup";
      if(authMode === 'reset') path = "/reset-password";
      window.history.pushState(null, "", path);
      const handlePopState = () => { setAuthMode('home'); };
      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
  }, [authMode]);

  const handleAuthSubmit = async () => {
    if(authMode !== 'reset' && (!formData.email || !formData.password)) return alert("Fill all fields");

    if(authMode === 'signup') {
        if(signupStep === 1) {
             if(!formData.username) return alert("Enter a username");
             setLoading(true);
             socket.emit('requestSignupOtp', { email: formData.email });
        } else {
             if(otp.length < 4) return alert("Enter valid OTP");
             setLoading(true);
             socket.emit('register', { ...formData, otp });
        }
    }
    else if (authMode === 'login') {
      setLoading(true);
      socket.emit('login', { email: formData.email, password: formData.password });
    }
    else if (authMode === 'reset') {
        if(resetStep === 1) {
            if(!formData.email) return alert("Enter your email");
            setLoading(true);
            socket.emit('requestResetOtp', { email: formData.email });
        } else {
            if(otp.length < 4 || !formData.password) return alert("Enter OTP and new password");
            setLoading(true);
            socket.emit('resetPassword', { email: formData.email, otp, newPassword: formData.password });
        }
    }
  };

  useEffect(() => {
    const handleSuccess = (userData) => {
      setLoading(false);
      onAuthSuccess(userData);
    };
    const handleError = (msg) => { setLoading(false); alert("❌ " + msg); };
    const handleSignupOtpSent = () => { setLoading(false); setSignupStep(2); alert( "OTP Sent!"); };
    const handleResetOtpSent = () => { setLoading(false); setResetStep(2); alert( "OTP Sent!"); };
    const handleResetSuccess = () => {
        setLoading(false); alert("… Password Reset Successful!");
        setAuthMode('login'); setResetStep(1); setFormData(prev => ({ ...prev, password: '' })); 
    };

    socket.on('authSuccess', handleSuccess);
    socket.on('authError', handleError);
    socket.on('signupOtpSent', handleSignupOtpSent);
    socket.on('resetOtpSent', handleResetOtpSent);
    socket.on('resetSuccess', handleResetSuccess);

    return () => {
      socket.off('authSuccess', handleSuccess);
      socket.off('authError', handleError);
      socket.off('signupOtpSent', handleSignupOtpSent);
      socket.off('resetOtpSent', handleResetOtpSent);
      socket.off('resetSuccess', handleResetSuccess);
    };
  }, [onAuthSuccess]);

  return (
    <div className="landing-page-wrapper">
      <div className="lp-nav">
        <div className="lp-logo">BID<span style={{color: '#fbbf24'}}>BLAZE</span></div>
        <div>
          {authMode === 'home' && (
            <>
              <button className="lp-login-btn-small" onClick={() => setAuthMode('login')} style={{marginRight:'10px'}}>Login</button>
              <button className="lp-login-btn-small" onClick={() => { setAuthMode('signup'); setSignupStep(1); }} style={{background:'#fbbf24', color:'black', border:'none'}}>Sign Up</button>
            </>
          )}
          {authMode !== 'home' && (
            <button className="lp-login-btn-small" onClick={() => { setAuthMode('home'); setSignupStep(1); setResetStep(1); }}>← Back</button>
          )}
        </div>
      </div>

      {authMode === 'home' ? (
        <div className="lp-hero">
            <div className="lp-badge">LIVE CRYPTO AUCTIONS</div>
            <h1 className="lp-title">Bid Small. <br /><span className="text-gradient">Win Massive.</span></h1>
            <p className="lp-subtitle">The world's first PvP crypto auction battle. Be the last to bid and the jackpot is yours instantly.</p>
            <div className="lp-action-container">
                <button className="lp-btn-primary" onClick={() => setAuthMode('login')}>LOGIN</button>
                 <button className="lp-btn-secondary" onClick={() => { setAuthMode('signup'); setSignupStep(1); }}>SIGN UP ➤</button>
            </div>
            <div className="lp-stats-row">
                <div className="lp-stat"><span className="val">2,401</span><span className="lbl">Live Players</span></div>
                <div className="lp-stat"><span className="val" style={{color:'#fbbf24'}}>$142k+</span><span className="lbl">Paid Out</span></div>
                <div className="lp-stat"><span className="val">0.5s</span><span className="lbl">Latency</span></div>
            </div>
        </div>
      ) : (
        <div className="glass-card fade-in" style={{marginTop:'50px', maxWidth:'400px'}}>
            <h2 style={{color:'white', marginTop:0}}>{authMode === 'login' ? 'Welcome Back' : (authMode === 'reset' ? 'Reset Password' : 'Create Account')}</h2>
            {authMode === 'signup' && (
                <>
                  {signupStep === 1 ? (
                      <>
                        <p style={{textAlign:'left', color:'#94a3b8', fontSize:'12px', marginBottom:'5px'}}>Username</p>
                        <input className="input-field" type="text" placeholder="CryptoKing99" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} />
                        <p style={{textAlign:'left', color:'#94a3b8', fontSize:'12px', marginBottom:'5px'}}>Email Address</p>
                        <input className="input-field" type="email" placeholder="you@example.com" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                        <p style={{textAlign:'left', color:'#94a3b8', fontSize:'12px', marginBottom:'5px'}}>Password</p>
                        <input className="input-field" type="password" placeholder="••••••••" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
                        <p style={{textAlign:'left', color:'#94a3b8', fontSize:'12px', marginBottom:'5px'}}>Referral Code (Optional)</p>
                        <input className="input-field" type="text" placeholder="e.g. A7X99" value={formData.referralCode} onChange={(e) => setFormData({...formData, referralCode: e.target.value})} />
                        <button className="main-btn" onClick={handleAuthSubmit} style={{fontSize:'16px', marginTop:'10px'}}>{loading ? 'SENDING OTP...' : 'NEXT: VERIFY EMAIL'}</button>
                      </>
                  ) : (
                      <>
                        <p style={{textAlign:'center', color:'#94a3b8', fontSize:'14px', marginBottom:'15px'}}>Enter the OTP sent to {formData.email}</p>
                        <input className="input-field" type="text" placeholder="Enter 6-digit Code" style={{textAlign:'center', letterSpacing:'5px', fontSize:'20px', fontWeight:'bold'}} value={otp} onChange={(e) => setOtp(e.target.value)} />
                        <button className="main-btn" onClick={handleAuthSubmit} style={{fontSize:'16px', marginTop:'10px'}}>{loading ? 'VERIFYING...' : 'FINISH SIGNUP'}</button>
                        <p style={{fontSize:'12px', color:'#fbbf24', cursor:'pointer'}} onClick={() => setSignupStep(1)}>Wrong Email?</p>
                      </>
                  )}
                </>
            )}
            {authMode === 'login' && (
                <>
                    <p style={{textAlign:'left', color:'#94a3b8', fontSize:'12px', marginBottom:'5px'}}>Email Address</p>
                    <input className="input-field" type="email" placeholder="you@example.com" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                    <p style={{textAlign:'left', color:'#94a3b8', fontSize:'12px', marginBottom:'5px'}}>Password</p>
                    <input className="input-field" type="password" placeholder="••••••••" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
                    <button className="main-btn" onClick={handleAuthSubmit} style={{fontSize:'16px', marginTop:'10px'}}>{loading ? 'PROCESSING...' : 'LOG IN'}</button>
                    <button className="main-btn" onClick={privyLogin} style={{fontSize:'14px', marginTop:'10px', background:'#334155', color:'#cbd5e1'}}>WALLET LOGIN</button>
                    <p style={{fontSize:'12px', color:'#3b82f6', marginTop:'10px', cursor:'pointer', textAlign:'right'}} onClick={() => { setAuthMode('reset'); setResetStep(1); setFormData({...formData, password: ''}); }}>Forgot Password?</p>
                </>
            )}
            {authMode === 'reset' && (
                <>
                    {resetStep === 1 ? (
                          <>
                            <p style={{color:'#94a3b8', fontSize:'14px', marginBottom:'15px'}}>Enter your email to receive a reset code.</p>
                            <input className="input-field" type="email" placeholder="you@example.com" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                            <button className="main-btn" onClick={handleAuthSubmit} style={{fontSize:'16px', marginTop:'10px'}}>{loading ? 'SENDING...' : 'GET OTP'}</button>
                          </>
                    ) : (
                          <>
                            <p style={{textAlign:'left', color:'#94a3b8', fontSize:'12px', marginBottom:'5px'}}>OTP Code</p>
                            <input className="input-field" type="text" placeholder="Code" value={otp} onChange={(e) => setOtp(e.target.value)} />
                            <p style={{textAlign:'left', color:'#94a3b8', fontSize:'12px', marginBottom:'5px'}}>New Password</p>
                            <input className="input-field" type="password" placeholder="New Password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
                            <button className="main-btn" onClick={handleAuthSubmit} style={{fontSize:'16px', marginTop:'10px'}}>{loading ? 'UPDATING...' : 'RESET PASSWORD'}</button>
                          </>
                    )}
                </>
            )}
            {authMode !== 'reset' && (
                <p style={{fontSize:'12px', color:'#64748b', marginTop:'15px', cursor:'pointer'}} onClick={() => {
                    setAuthMode(authMode === 'login' ? 'signup' : 'login'); setSignupStep(1);
                }}>{authMode === 'login' ? "Don't have an account? Sign Up" : "Already have an account? Log In"}</p>
            )}
        </div>
      )}

      <div className="lp-marquee-container">
         <div className="lp-marquee-content">
           <span>🏆 User88 just won $450.00 (ETH)</span> • <span>🚀 CryptoKing just won $1,200.00 (BNB)</span> • <span>💰 Jackpot currently at $52.00</span> • <span>🔥 Alex_99 just won $320.00 (BASE)</span> • <span>⏳ New Round Starting...</span>
         </div>
      </div>

      <div className="lp-features">
         {features.map((f, i) => (
           <div key={i} className="lp-feature-card">
                 <div className="lp-icon">{f.icon}</div>
                 <h3>{f.title}</h3>
                 <p>{f.desc}</p>
           </div>
         ))}
      </div>

      <div className="lp-footer">© 2025 BidBlaze Protocol.</div>
    </div>
  );
}

// --- GLOBAL STYLES ---
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

    /* GLOBAL MODALS */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 100; display: flex; justify-content: center; align-items: center; backdrop-filter: blur(5px); }
    .glass-card { background: #0f172a; border: 1px solid #334155; border-radius: 24px; padding: 30px; width: 90%; max-width: 350px; text-align: center; position: relative; }
    .close-btn { position: absolute; top: 15px; right: 15px; background: none; border: none; color: white; font-size: 20px; cursor: pointer; }
    .input-field { width: 100%; background: #1e293b; border: 1px solid #334155; padding: 14px; border-radius: 12px; color: white; margin-bottom: 12px; box-sizing: border-box; }
    .action-btn { width: 100%; padding: 14px; background: #fbbf24; border: none; border-radius: 12px; color: black; font-weight: 900; cursor: pointer; transition: 0.2s; }
    .main-btn { width: 100%; padding: 14px; background: #3b82f6; border: none; border-radius: 12px; color: white; font-weight: bold; cursor: pointer; }

    /* --- LANDING PAGE STYLES (FROM ORIGINAL) --- */
    .landing-page-wrapper {
        min-height: 100vh; width: 100%;
        background: radial-gradient(circle at top, #1e293b, #020617);
        display: flex; flex-direction: column; align-items: center; text-align: center;
    }
    .lp-nav {
        width: 100%; max-width: 1000px; padding: 20px;
        display: flex; justify-content: space-between; align-items: center; box-sizing: border-box;
    }
    .lp-logo { font-size: 24px; font-weight: 900; letter-spacing: -1px; }
    .lp-login-btn-small {
        background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);
        color: white; padding: 8px 20px; border-radius: 20px; cursor: pointer; font-weight: 600; transition: all 0.2s;
    }
    .lp-login-btn-small:hover { background: white; color: black; }

    .lp-hero { padding: 60px 20px; max-width: 800px; display: flex; flex-direction: column; align-items: center; }
    .lp-badge {
        background: rgba(251, 191, 36, 0.15); color: #fbbf24; font-size: 12px; font-weight: bold;
        padding: 6px 12px; border-radius: 20px; margin-bottom: 20px; border: 1px solid rgba(251, 191, 36, 0.3);
    }
    .lp-title { font-size: 56px; font-weight: 900; line-height: 1.1; margin: 0 0 20px 0; letter-spacing: -2px; }
    .text-gradient {
        background: linear-gradient(135deg, #fff 30%, #94a3b8 100%);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    }
    .lp-subtitle { color: #94a3b8; font-size: 18px; line-height: 1.6; max-width: 500px; margin-bottom: 40px; }

    .lp-action-container { display: flex; gap: 15px; margin-top: 10px; justify-content: center; width: 100%; max-width: 400px; }
    .lp-btn-primary { flex: 1; background: white; color: black; border: none; padding: 14px 24px; font-size: 16px; font-weight: 800; border-radius: 12px; cursor: pointer; transition: transform 0.2s; text-transform: uppercase; }
    .lp-btn-secondary { flex: 1; background: #fbbf24; color: black; border: none; padding: 14px 24px; font-size: 16px; font-weight: 800; border-radius: 12px; cursor: pointer; box-shadow: 0 4px 20px rgba(251, 191, 36, 0.4); transition: transform 0.2s; text-transform: uppercase; }

    .lp-stats-row { display: flex; gap: 40px; margin-top: 60px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 30px; }
    .lp-stat { display: flex; flex-direction: column; }
    .lp-stat .val { font-size: 28px; font-weight: 800; }
    .lp-stat .lbl { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-top: 5px; }

    .lp-marquee-container {
        width: 100%; background: #0f172a; padding: 15px 0; margin: 40px 0; overflow: hidden; white-space: nowrap;
        border-top: 1px solid #1e293b; border-bottom: 1px solid #1e293b;
    }
    .lp-marquee-content { display: inline-block; animation: marquee 20s linear infinite; font-family: 'JetBrains Mono', monospace; font-size: 14px; color: #cbd5e1; }
    .lp-marquee-content span { margin: 0 20px; }

    .lp-features { display: flex; gap: 20px; padding: 20px; flex-wrap: wrap; justify-content: center; max-width: 1000px; }
    .lp-feature-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); padding: 30px; border-radius: 20px; width: 250px; text-align: left; }
    .lp-icon { font-size: 30px; margin-bottom: 15px; }
    .lp-feature-card h3 { margin: 0 0 10px 0; font-size: 18px; }
    .lp-feature-card p { margin: 0; font-size: 14px; color: #94a3b8; line-height: 1.5; }

    .lp-footer { margin-top: 50px; color: #475569; font-size: 12px; padding-bottom: 20px; }

    @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
    @keyframes slideIn { from { transform: translateX(100%); opacity:0; } to { transform: translateX(0); opacity:1; } }
    .fade-in { animation: popIn 0.3s ease-out; }
    @keyframes popIn { 0% { opacity:0; transform:scale(0.95); } 100% { opacity:1; transform:scale(1); } }

    @media (max-width: 600px) {
        .lp-title { font-size: 36px; }
        .lp-stats-row { flex-direction: column; gap: 20px; margin-top: 40px; }
        .lp-features { flex-direction: column; align-items: center; }
        .lp-action-container { flex-direction: column; gap: 10px; width: 100%; max-width: 250px; }
    }
  `}</style>
);
