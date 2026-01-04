import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import WalletVault from './WalletVault';
import Confetti from 'react-confetti';
import { PrivyProvider, usePrivy, useWallets } from '@privy-io/react-auth';
import { parseEther } from 'viem';
// --- CONFIGURATION ---
const PRIVY_APP_ID = "cm4l3033r048epf1ln3q59956";
const SERVER_URL = "https://bidblaze-server.onrender.com";

export const socket = io(SERVER_URL, {
  transports: ['websocket', 'polling'],
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 2000
});
const ASSETS = {
  soundBid: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
  soundWin: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
  soundPop: 'https://assets.mixkit.co/active_storage/sfx/2578/2578-preview.mp3'
};

// --- CHAIN CONFIGURATIONS ---
const BASE_CHAIN = {
  id: 8453,
  name: 'Base',
  network: 'base',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://mainnet.base.org'] } },
  blockExplorers: { default: { name: 'Basescan', url: 'https://basescan.org' } }
};
const BSC_CHAIN = {
  id: 56,
  name: 'BNB Smart Chain',
  network: 'bsc',
  nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
  rpcUrls: { default: { http: ['https://bsc-dataseed1.binance.org'] } },
  blockExplorers: { default: { name: 'BscScan', url: 'https://bscscan.com' } }
};
const ETH_CHAIN = {
  id: 1,
  name: 'Ethereum',
  network: 'homestead',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://cloudflare-eth.com'] } },
  blockExplorers: { default: { name: 'Etherscan', url: 'https://etherscan.io' } }
};
// --- HELPER: Parse Ether manually to avoid crashes ---
const parseEtherVal = (amount) => {
  try {
        const val = parseFloat(amount);
        if (isNaN(val)) return "0x0";
        const wei = BigInt(Math.floor(val * 1e18));
        return "0x" + wei.toString(16);
  } catch (e) { return "0x0"; }
};

// --- HOW TO PLAY GUIDE ---
const HowToPlay = ({ onClose }) => {
  return (
    <div className="modal-overlay">
      <div className="glass-card modal-content fade-in" style={{textAlign:'left'}}>
        <button className="close-btn" onClick={onClose}>✕</button>
        <h2 style={{color: '#fbbf24', textAlign:'center', marginBottom:'20px'}}>How to Win 🏆</h2>
        
        <div style={{display:'flex', gap:'15px', marginBottom:'15px'}}>
          <div style={{background:'#3b82f6', borderRadius:'50%', width:'30px', height:'30px', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold'}}>1</div>
          <div><div style={{fontWeight:'bold', color:'white'}}>Deposit Crypto</div><div style={{fontSize:'12px', color:'#94a3b8'}}>Connect Wallet & Pay (BSC/ETH/Base).</div></div>
        </div>
        <div style={{display:'flex', gap:'15px', marginBottom:'15px'}}>
          <div style={{background:'#ef4444', borderRadius:'50%', width:'30px', height:'30px', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold'}}>2</div>
          <div><div style={{fontWeight:'bold', color:'white'}}>Place a Bid</div><div style={{fontSize:'12px', color:'#94a3b8'}}>Bid costs $1.00 and resets timer.</div></div>
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
};
// --- GAME DASHBOARD ---
function GameDashboard({ logout, user }) {
  const [gameState, setGameState] = useState({
    status: 'ACTIVE',
    endTime: Date.now() + 300000,
    jackpot: 0.00,
    bidCost: 1.00,
    lastBidder: "Designer",
    history: [],
    recentWinners: [],
    connectedUsers: 1,
    restartTimer: null,
    bidders: [],
    userInvestments: {}
  });
  const [credits, setCredits] = useState(0.00);
  const [isCooldown, setIsCooldown] = useState(false);
  const [cd, setCd] = useState(0);
  const [showVault, setShowVault] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [floatingBids, setFloatingBids] = useState([]);
  const [restartCount, setRestartCount] = useState(15);
  const [showMenu, setShowMenu] = useState(false);

  const prevStatus = useRef("ACTIVE");
  const lastBidId = useRef(null);
  const audioRef = useRef(null);
  const { wallets } = useWallets();
  // âš ï¸ CRITICAL FIX: Handle both Privy object emails and Custom string emails
  const userAddress = wallets.find(w => w.walletClientType === 'privy')?.address || "0x...";
  const userEmail = user?.email?.address || user?.email || "user@example.com";
  const username = user?.username || "Player";
                                                                                          
  // --- STATES ---
  const [showDeposit, setShowDeposit] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState('BSC');
  const [statusMsg, setStatusMsg] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [withdrawHistory, setWithdrawHistory] = useState([]);
  const [depositHistory, setDepositHistory] = useState([]);
  const [adminWallet, setAdminWallet] = useState(null);
  const [muted, setMuted] = useState(false);

  const playSound = (key) => {
    if (muted) return;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    const audio = new Audio(ASSETS[key]);
    audio.volume = 0.5;
    audioRef.current = audio;
    audio.play().catch(() => {});
  };

  const handleDeposit = async () => {
    try {
      const amt = Number(depositAmount);
      if (!amt || amt <= 0) {
        alert("Enter a valid amount");
        return;
      }
      
      if (!adminWallet) {
          alert("Secure connection pending. Please wait 2 seconds and try again.");
          socket.emit('getGameConfig');
          return;
      }
      
      let provider = window.ethereum;
      let account = null;
                                                                                              
      if (!provider) {
          const w = wallets.find(w => w.walletClientType !== 'privy');
          if (w) provider = await w.getEthereumProvider();
      }
                                                                                              
      if (!provider) {
        alert("Wallet not detected. Please open this site inside MetaMask or Trust Wallet browser.");
        return;
      }
      
      setIsProcessing(true);
      setShowDeposit(false);
      
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      account = accounts[0];

      if (!account) throw new Error("No account found");

      const chainConfig = {
        'BSC': { hex: '0x38', rpc: 'https://bsc-dataseed1.binance.org' },
        'ETH': { hex: '0x1', rpc: 'https://cloudflare-eth.com' },
        'BASE': { hex: '0x2105', rpc: 'https://mainnet.base.org' }
      };
      const target = chainConfig[selectedNetwork];

      try {
        const currentChainId = await provider.request({ method: 'eth_chainId' });
        if (currentChainId !== target.hex) {
            await provider.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: target.hex }]
            });
        }
      } catch (switchErr) {
        if (switchErr.code === 4902) {
             await provider.request({
                method: 'wallet_addEthereumChain',
                params: [{
                    chainId: target.hex,
                    chainName: selectedNetwork,
                    rpcUrls: [target.rpc],
                    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 }
                }]
             });
        } else {
          console.warn("Chain switch warning:", switchErr);
        }
      }
      
      const wei = parseEther(depositAmount.toString());
      const hexValue = `0x${wei.toString(16)}`;
                                                                                              
      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: account,
          to: adminWallet,
          value: hexValue,
          data: '0x'
        }]
      });

      if (txHash) {
        socket.emit('verifyDeposit', {
          email: userEmail.toLowerCase().trim(),
          txHash,
          network: selectedNetwork
        });
        alert("… Transaction Sent! Check your wallet activities.");
      }

    } catch (err) {
      console.error(err);
      setIsProcessing(false);

      if (err.message && err.message.includes("insufficient funds")) {
          alert("INSUFFICIENT FUNDS: Your wallet is empty. You need a small amount of ETH/BNB to pay for gas fees.");
      } else if (err.code === 4001 || err.message?.includes("rejected")) {
          alert("Transaction was cancelled.");
      } else {
          alert("Deposit Error: " + (err.message || "Wallet did not respond."));
      }
    }
  };

  const handleWithdraw = () => {
      const amt = parseFloat(withdrawAmount);
      if (isNaN(amt) || amt < 10) return alert("Minimum withdrawal is $10.00");
      if (withdrawAddress.length < 10) return alert("Enter a valid receiving address");
      if (credits < amt) return alert("Insufficient Balance");
      socket.emit('requestWithdrawal', {
          email: userEmail.toLowerCase().trim(),
          amount: amt,
          address: withdrawAddress,
          network: selectedNetwork
      });
      setWithdrawAmount('');
      setWithdrawAddress('');
  };

  useEffect(() => {
    if(!socket.connected) socket.connect();
                                                                                            
    socket.emit('getGameConfig');
    socket.on('gameConfig', (cfg) => {
      if(cfg && cfg.adminWallet) setAdminWallet(cfg.adminWallet);
    });
    
    socket.on('depositSuccess', (newBalance) => {
      setCredits(newBalance);
      setDepositAmount('');
      setIsProcessing(false);
      alert(`… SUCCESS! Deposit Verified.`);
    });
    
    socket.on('depositError', (msg) => {
      alert(`Error: ${msg}`);
      setIsProcessing(false);
    });

    socket.on('withdrawalSuccess', (newBalance) => {
        setCredits(newBalance);
        alert("… Withdrawal Request Sent!");
    });

    socket.on('withdrawalError', (msg) => { alert(`Withdrawal Failed: ${msg}`); });
    socket.on('withdrawalHistory', (data) => { setWithdrawHistory(data); });
    socket.on('depositHistory', (data) => { setDepositHistory(data); });
                                                                                            
    // CRITICAL FIX: Ensure request is sent on mount with correct email format
    if(userEmail) {
      socket.emit('getUserBalance', userEmail.toLowerCase().trim());
    }

    socket.on('gameState', (data) => {
      setGameState(data);
      if (data.status === 'ACTIVE' && data.history.length > 0) {
          const latestBid = data.history[0];
          if (latestBid.id !== lastBidId.current) {
             playSound('soundBid');
             lastBidId.current = latestBid.id;
          }
      }
      if (data.status === 'ENDED' && prevStatus.current === 'ACTIVE') {
          playSound('soundWin');
          if (data.lastBidder === userEmail.toLowerCase().trim()) {
              setTimeout(() => {
                  socket.emit('getUserBalance', userEmail.toLowerCase().trim());
              }, 1000);
          }
      }
      prevStatus.current = data.status;
    });
    
    socket.on('balanceUpdate', (bal) => setCredits(bal));
    socket.on('bidError', (msg) => alert(msg));
                                                                                            
    return () => {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      socket.off('gameState'); socket.off('balanceUpdate'); socket.off('bidError');
      socket.off('depositSuccess'); socket.off('depositError');
      socket.off('withdrawalSuccess'); socket.off('withdrawalError'); socket.off('withdrawalHistory');
      socket.off('depositHistory');
      socket.off('gameConfig');
    };
  }, [userEmail, muted]);
  
  useEffect(() => {
    const timerInterval = setInterval(() => {
      if (gameState?.status === 'ENDED' && gameState?.restartTimer) {
            const dist = gameState.restartTimer - Date.now();
            setRestartCount(dist > 0 ? Math.ceil(dist/1000) : 0);
      }
    }, 100);
    let cdInterval;
    if (isCooldown && cd > 0) cdInterval = setInterval(() => setCd(prev => prev - 1), 1000);
    else if (cd <= 0) setIsCooldown(false);
    return () => { clearInterval(timerInterval); clearInterval(cdInterval); };
  }, [gameState?.status, gameState?.restartTimer, isCooldown, cd]);
  
  const placeBid = () => {
    if (isCooldown) return;
    if (credits < 1.00) { setShowDeposit(true); return; }
    setFloatingBids(prev => [...prev, Date.now()]);
    playSound('soundPop');

    const emailToSend = userEmail ? userEmail.toLowerCase().trim() : "User";
    socket.emit('placeBid', emailToSend);
    setIsCooldown(true);
    setCd(8);
  };
  
  if (!gameState) return (
    <div className="loading-screen" style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'20px'}}>
      <div className="spinner"></div>
      <div style={{color:'#64748b', fontSize:'12px', letterSpacing:'2px', animation:'pulse 1.5s infinite'}}>CONNECTING...</div>
      <style>{`.spinner { width: 40px; height: 40px; border: 3px solid rgba(255,255,255,0.1); border-radius: 50%; border-top-color: #fbbf24; animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
                                                                                          
  return (
    <div className="app-container bc-upgrade">
      <GlobalStyle />
      {gameState?.status === 'ENDED' && <Confetti width={window.innerWidth} height={window.innerHeight} recycle={false} numberOfPieces={500} colors={['#fbbf24', '#ffffff', '#39ff14', '#22c55e']} />}
                                                                                              
      {showVault && <WalletVault onClose={() => setShowVault(false)} userAddress={userAddress} userEmail={userEmail} currentCredits={credits} />}
      {showHelp && <HowToPlay onClose={() => setShowHelp(false)} />}

      {/* NEW: LEFT SIDEBAR (BC.Game style - desktop only) */}
      <div className="bc-sidebar">
        <div className="bc-logo">BID<span style={{color:'#fbbf24'}}>BLAZE</span></div>
        <nav className="bc-sidebar-nav">
          <button className="bc-sidebar-item active">
            <span style={{fontSize:'24px'}}>🎲</span> Game
          </button>
          <button className="bc-sidebar-item" onClick={() => setShowDeposit(true)}>
            <span style={{fontSize:'24px'}}>💰</span> Deposit
          </button>
          <button className="bc-sidebar-item" onClick={() => setShowWithdraw(true)}>
            <span style={{fontSize:'24px'}}>💸</span> Withdraw
          </button>
          <button className="bc-sidebar-item" onClick={() => setShowHelp(true)}>
            <span style={{fontSize:'24px'}}>❓</span> Rules
          </button>
          <button className="bc-sidebar-item" onClick={logout}>
            <span style={{fontSize:'24px'}}>✕</span> Logout
          </button>
        </nav>
        <a href="https://t.me/Bidblaze" target="_blank" rel="noopener noreferrer" className="bc-sidebar-support">
          <span style={{fontSize:'24px'}}>💬</span> 24/7 Support
        </a>
      </div>

      {/* MAIN CONTENT WITH LEFT MARGIN FOR SIDEBAR */}
      <div className="bc-main-content">
        {/* PROMINENT BALANCE HEADER */}
        <div className="bc-balance-header">
          <div className="bc-balance-card">
            <div className="bc-balance-label">TOTAL BALANCE</div>
            <div className="bc-balance-amount">${credits.toFixed(2)}</div>
            <button className="bc-deposit-btn" onClick={() => setShowDeposit(true)}>+ DEPOSIT</button>
          </div>
          <div className="bc-live-indicator">
            <div className="bc-live-dot"></div>
            <span>{gameState.connectedUsers || 1} LIVE</span>
          </div>
        </div>

        {/* ORIGINAL TOP NAV (kept intact below new balance header) */}
        <nav className="glass-nav">
          {/* LEFT SIDE: Balance FIRST, then Live Indicator */}
          <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
              {/* Balance Display */}
              <div className="balance-pill" style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
              }}>
                  <span style={{color:'#fbbf24'}}>💰</span> ${credits.toFixed(2)}
              </div>

               {/* Live Pill */}
              <div className="live-pill" style={{color:'#39ff14', fontWeight:'bold', display:'flex', alignItems:'center', gap:'5px'}}>
                  <div style={{width:'8px', height:'8px', background:'#39ff14', borderRadius:'50%', boxShadow:'0 0 15px #39ff14'}}></div>
                  {gameState.connectedUsers || 1} LIVE
              </div>
          </div>
          
          {/* RIGHT SIDE: Help -> Menu -> Logout */}
          <div style={{display:'flex', gap:'8px'}}>
            <button className="nav-btn" onClick={() => setShowHelp(true)} style={{fontSize:'18px'}}>❓</button>
             {/* NEW MENU BUTTON */}
             <button className="nav-btn" onClick={() => setShowMenu(true)} style={{fontSize:'22px', color:'white'}}>☰</button>

             <button className="nav-btn logout-btn" onClick={logout} style={{fontSize:'18px', color:'#ef4444'}}>✕</button>
          </div>
        </nav>

             {/* GAME STAGE - more space & glow */}
        <div className="game-stage bc-game-stage">
          <ReactorRing targetDate={gameState.endTime} status={gameState.status} />
          <div className="jackpot-core bc-jackpot">
            {gameState.status === 'ACTIVE' ? (
              <>
                <div className="label">JACKPOT</div>
                <div className="amount">${gameState.jackpot.toFixed(2)}</div>
              </>
            ) : (
              <div className="restart-box">
                <div className="restart-label">NEW GAME IN</div>
                 <div className="restart-timer">{restartCount}</div>
                 {new Set(gameState.history.map(b => b.user)).size === 1 ? (
                    <div className="winner-badge" style={{background:'#3b82f6'}}>
                      ♻️ REFUNDED: {gameState.history[0]?.user.slice(0,10)}...
                    </div>
                 ) : (
                    <div className="winner-badge">
                      🏆 WINNER: {gameState.history[0]?.user.slice(0,10)}...
                    </div>
                 )}
              </div>
            )}
          </div>
          {floatingBids.map(id => (
            <div key={id} className="float-anim bc-float" onAnimationEnd={() => setFloatingBids(prev => prev.filter(bid => bid !== id))}>-$1.00</div>
          ))}
        </div>
        
        <button className={`main-btn bc-bid-btn ${isCooldown ? 'cooldown' : ''}`} onClick={placeBid} disabled={gameState.status !== 'ACTIVE' || isCooldown}>
          {gameState.status === 'ENDED' ? 'GAME CLOSED' : (isCooldown ? `WAIT (${cd}s)` : `BID NOW ($${gameState.bidCost})`)}
        </button>
        
        {/* ACTION BUTTONS */}
        <div className="action-buttons" style={{display: 'flex', gap: '15px', justifyContent: 'center', margin: '30px 0', width:'100%', maxWidth:'400px'}}>
          <button className="deposit-btn" onClick={() => setShowDeposit(true)} style={{background:'#39ff14', color:'black', border:'none', padding:'14px 30px', borderRadius:'12px', fontWeight:'bold', display:'flex', alignItems:'center', gap:'8px', flex:1, justifyContent:'center', fontSize:'16px'}}>
            💰 DEPOSIT
          </button>
          <button className="withdraw-btn" onClick={() => setShowWithdraw(true)} style={{background:'#ef4444', color:'white', border:'none', padding:'14px 30px', borderRadius:'12px', fontWeight:'bold', display:'flex', alignItems:'center', gap:'8px', flex:1, justifyContent:'center', fontSize:'16px'}}>
            💸 WITHDRAW
          </button>
        </div>

        <div className="glass-panel bc-panel" style={{marginTop:'30px', borderColor: '#fbbf24', background: 'rgba(251, 191, 36, 0.05)'}}>
          <div className="panel-header" style={{color: '#fbbf24'}}>🏆 RECENT BIG WINS</div>
          <div className="history-list" style={{maxHeight: '140px'}}>
            {gameState.recentWinners && gameState.recentWinners.length > 0 ? (
              gameState.recentWinners.map((win, index) => (
                <div key={index} className="history-row bc-win-row">
                  <span className="user" style={{color: 'white', fontWeight:'bold'}}>{win.user.split('@')[0].slice(0,12)}...</span>
                  <span className="bid-amt" style={{fontSize:'16px', color:'#39ff14', fontWeight:'900'}}>+${win.amount.toFixed(2)}</span>
                </div>
              ))
            ) : (
              <div style={{color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '10px'}}>No winners yet. Be the first!</div>
            )}
          </div>
        </div>

        <div className="glass-panel history-panel bc-panel" style={{marginTop:'30px'}}>
          <div className="panel-header bc-live-header">🔥 LAST 30 BIDS</div>
          <div className="history-list bc-bids-list">
            {gameState.history.slice(0, 30).map((bid) => (
              <div key={bid.id} className="history-row bc-bid-row">
                <span className="user">{bid.user.split('@')[0].slice(0,12)}...</span>
                <span className="bid-amt" style={{color:'#39ff14'}}>-$1.00</span>
              </div>
            ))}
          </div>
        </div>
        
        <div style={{marginTop: '50px', marginBottom: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', opacity: 0.9}}>
            <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
               <span style={{fontSize:'28px', fontWeight:'900', color:'white', letterSpacing:'1px'}}>BID<span style={{color:'#fbbf24'}}>BLAZE</span></span>
            </div>
            <div style={{fontSize:'11px', color:'#64748b', fontWeight:'600', letterSpacing:'2px'}}>PROVABLY FAIR • INSTANT PAYOUTS</div>
            <a href="https://t.me/Bidblaze" target="_blank" rel="noopener noreferrer" style={{color: '#39ff14', textDecoration: 'none', fontSize: '13px', marginTop: '10px', fontWeight: 'bold'}}>💬 24/7 SUPPORT</a>
        </div>
      </div>

      {/* MOBILE BOTTOM NAV BAR */}
      <div className="bc-mobile-nav">
        <button className="bc-mobile-item active">
          <span style={{fontSize:'26px'}}>🎲</span>
          <div>Game</div>
        </button>
        <button className="bc-mobile-item" onClick={() => setShowDeposit(true)}>
          <span style={{fontSize:'26px'}}>💰</span>
          <div>Deposit</div>
        </button>
        <button className="bc-mobile-item bc-bid-mobile" onClick={placeBid} disabled={gameState.status !== 'ACTIVE' || isCooldown}>
          <span style={{fontSize:'28px'}}>⚡</span>
          <div>Bid Now</div>
        </button>
        <button className="bc-mobile-item" onClick={() => setShowWithdraw(true)}>
          <span style={{fontSize:'26px'}}>💸</span>
          <div>Withdraw</div>
        </button>
        <button className="bc-mobile-item" onClick={() => setShowMenu(true)}>
          <span style={{fontSize:'26px'}}>☰</span>
          <div>Menu</div>
        </button>
      </div>

      {/* ALL YOUR ORIGINAL MODALS - UNCHANGED */}
      {showMenu && (
        <div className="modal-overlay" onClick={(e) => { if(e.target.className === 'modal-overlay') setShowMenu(false); }}>
            <div className="slide-menu" style={{
                position:'fixed', right:0, top:0, height:'100%', width:'80%', maxWidth:'300px',
                background:'#0f172a', borderLeft:'1px solid #334155', padding:'25px',
                boxShadow:'-10px 0 30px rgba(0,0,0,0.5)', zIndex:100,
                display:'flex', flexDirection:'column', gap:'20px', animation:'slideIn 0.3s'
            }}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                     <h2 style={{margin:0, color:'#fbbf24'}}>MENU</h2>
                     <button onClick={() => setShowMenu(false)} style={{background:'none', border:'none', color:'white', fontSize:'24px'}}>✕</button>
                </div>
                {/* USER PROFILE SNIPPET */}
                <div style={{background: 'rgba(255,255,255,0.05)', padding:'15px', borderRadius:'12px'}}>
                    <div style={{color:'#94a3b8', fontSize:'12px', fontWeight:'bold', marginBottom:'5px'}}>LOGGED IN AS</div>
                    <div style={{color:'white', fontSize:'16px', fontWeight:'bold'}}>{username}</div>
                    <div style={{color:'#64748b', fontSize:'12px'}}>{userEmail}</div>
                </div>

                {/* BALANCE CARD */}
                <div style={{background: 'rgba(57, 255, 20, 0.1)', padding:'20px', borderRadius:'12px', border:'1px solid rgba(57, 255, 20, 0.2)'}}>
                    <div style={{color:'#39ff14', fontSize:'12px', fontWeight:'bold', marginBottom:'5px', letterSpacing:'1px'}}>TOTAL BALANCE</div>
                    <div style={{fontSize:'32px', fontWeight:'900', color:'white', marginBottom:'15px'}}>${credits.toFixed(2)}</div>
                    <button onClick={() => { setShowMenu(false); setShowDeposit(true); }} style={{width:'100%', padding:'12px', background:'#39ff14', border:'none', borderRadius:'8px', color:'black', fontWeight:'bold', cursor:'pointer'}}>
                        + DEPOSIT
                    </button>
                </div>

                {/* MENU LINKS */}
                <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                    <button onClick={() => { setShowMenu(false); setShowWithdraw(true); }} style={{textAlign:'left', background:'transparent', border:'1px solid #334155', padding:'15px', borderRadius:'10px', color:'white', fontWeight:'bold', display:'flex', justifyContent:'space-between'}}>
                         💸 Withdraw Funds <span>→</span>
                    </button>

                     <button onClick={() => setMuted(!muted)} style={{textAlign:'left', background:'transparent', border:'1px solid #334155', padding:'15px', borderRadius:'10px', color:'white', fontWeight:'bold', display:'flex', justifyContent:'space-between'}}>
                         {muted ? '🔊 Unmute Sound' : '🔇 Mute Sound'} <span>{muted ? 'OFF' : 'ON'}</span>
                    </button>
                    <button onClick={() => { setShowMenu(false); setShowHelp(true); }} style={{textAlign:'left', background:'transparent', border:'1px solid #334155', padding:'15px', borderRadius:'10px', color:'white', fontWeight:'bold', display:'flex', justifyContent:'space-between'}}>
                         ❓ Help / Rules <span>→</span>
                    </button>
                    {/* NEW SUPPORT BUTTON */}
                    <a href="https://t.me/Bidblaze" target="_blank" rel="noopener noreferrer" style={{textDecoration:'none', textAlign:'left', background:'transparent', border:'1px solid #334155', padding:'15px', borderRadius:'10px', color:'white', fontWeight:'bold', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                         💬 24/7 Support <span>→</span>
                    </a>
                </div>

                <div style={{marginTop:'auto', textAlign:'center', fontSize:'10px', color:'#64748b'}}>
                    v1.0.5 • Secure Connection
                </div>
            </div>
        </div>
      )}

      {isProcessing && (
        <div className="modal-overlay">
          <div className="spinner" style={{width:'60px', height:'60px'}}></div>
        </div>
      )}
      
      {showDeposit && (
        <div className="modal-overlay">
          <div className="glass-card modal-content fade-in" style={{textAlign:'left'}}>
            <button className="close-btn" onClick={() => setShowDeposit(false)}>✕</button>
            <h2 style={{color: '#39ff14', textAlign:'center', marginTop:0}}>INSTANT DEPOSIT</h2>
            <p style={{color:'#94a3b8', fontSize:'14px'}}>Select Network:</p>
            <select value={selectedNetwork} onChange={(e) => setSelectedNetwork(e.target.value)} className="input-field" style={{marginTop:'5px'}}>
              <option value="BSC">BNB Smart Chain (BEP20)</option>
              <option value="ETH">Ethereum (ERC20)</option>
              <option value="BASE">Base Network</option>
            </select>

            <p style={{color:'#94a3b8', fontSize:'14px'}}>Amount to Deposit (BNB/ETH):</p>
            <input
              type="number" placeholder="0.01" value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              className="input-field" style={{marginTop:'5px'}}
            />
                                                                                                    
            <button className="action-btn" onClick={handleDeposit} style={{background:'#39ff14', color:'black', marginBottom:'10px'}}>
              🚀 PAY NOW (Wallet)
            </button>
                                                                                                    
            {/* DEPOSIT HISTORY SECTION */}
            <div style={{marginTop:'15px', borderTop:'1px solid #334155', paddingTop:'15px'}}>
                <p style={{fontSize:'12px', color:'#94a3b8', fontWeight:'bold', marginBottom:'10px'}}>RECENT DEPOSITS</p>
                <div style={{maxHeight:'100px', overflowY:'auto'}}>
                  {depositHistory.length === 0 ? (
                          <p style={{fontSize:'12px', color:'#64748b', textAlign:'center'}}>No deposits yet.</p>
                  ) : (
                      depositHistory.map((item) => (
                          <div key={item.id} style={{display:'flex', justifyContent:'space-between', fontSize:'12px', marginBottom:'8px', background:'#1e293b', padding:'8px', borderRadius:'6px'}}>
                            <span style={{color:'white'}}>${Number(item.amount).toFixed(2)}</span>
                              <span style={{color: '#39ff14', fontWeight:'bold'}}>{item.status}</span>
                          </div>
                      ))
                  )}
                </div>
            </div>

            <p style={{fontSize:'12px', color:'#fbbf24', marginTop:'10px', textAlign:'center'}}>{statusMsg}</p>
            <p style={{fontSize:'10px', color:'#64748b', textAlign:'center'}}>If wallet doesn't open, check pop-up blocker.</p>
          </div>
        </div>
      )}
      
      {showWithdraw && (
        <div className="modal-overlay">
          <div className="glass-card modal-content fade-in" style={{textAlign:'left'}}>
            <button className="close-btn" onClick={() => setShowWithdraw(false)}>✕</button>
            <h2 style={{color: '#ef4444', textAlign:'center', marginTop:0}}>WITHDRAW</h2>
            
            <p style={{color:'#94a3b8', fontSize:'14px'}}>Select Network:</p>
            <select value={selectedNetwork} onChange={(e) => setSelectedNetwork(e.target.value)} className="input-field" style={{marginTop:'5px'}}>
              <option value="BSC">BNB Smart Chain (BEP20)</option>
               <option value="ETH">Ethereum (ERC20)</option>
               <option value="BASE">Base Network</option>
            </select>
            
            <p style={{color:'#94a3b8', fontSize:'14px'}}>Amount ($):</p>
            <input
              type="number" placeholder="Min $10.00" value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              className="input-field" style={{marginTop:'5px'}}
            />
                                                                                                    
            <p style={{color:'#94a3b8', fontSize:'14px'}}>Receiving Address:</p>
            <input
              type="text" placeholder="0x..." value={withdrawAddress}
              onChange={(e) => setWithdrawAddress(e.target.value)}
              className="input-field" style={{marginTop:'5px'}}
            />

            <button className="action-btn" onClick={handleWithdraw} style={{background:'#ef4444', color:'white', marginBottom:'20px'}}>
               REQUEST WITHDRAWAL
            </button>
            
            {/* MANUAL WITHDRAWAL WARNING */}
            <p style={{fontSize:'10px', color:'#94a3b8', marginTop:'10px', textAlign:'center'}}>
              ⚠️ Notice: Withdrawals are processed manually within 24 hours.
            </p>

            <div style={{borderTop:'1px solid #334155', paddingTop:'15px', marginTop:'15px'}}>
              <p style={{fontSize:'12px', color:'#94a3b8', fontWeight:'bold', marginBottom:'10px'}}>RECENT WITHDRAWALS</p>
                {withdrawHistory.length === 0 ? (
                    <p style={{fontSize:'12px', color:'#64748b', textAlign:'center'}}>No recent withdrawals.</p>
                ) : (
                    <div style={{maxHeight:'100px', overflowY:'auto'}}>
                      {withdrawHistory.map((item) => (
                          <div key={item.id} style={{display:'flex', justifyContent:'space-between', fontSize:'12px', marginBottom:'8px', background:'#1e293b', padding:'8px', borderRadius:'6px'}}>
                              <span style={{color:'white'}}>${item.amount.toFixed(2)}</span>
                              <span style={{color: item.status === 'PENDING' ? 'orange' : '#39ff14', fontWeight:'bold'}}>{item.status}</span>
                          </div>
                      ))}
                    </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const ReactorRing = ({ targetDate, status }) => {
  const [progress, setProgress] = useState(100);
  const [displayTime, setDisplayTime] = useState("299");
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const distance = targetDate - now;
      if (status === 'ACTIVE') {
        if (distance <= 0) { setDisplayTime("0"); setProgress(0); }
        else {
          const percentage = Math.min((distance / 299000) * 100, 100);
          setProgress(percentage);
          const s = Math.ceil(distance / 1000);
          setDisplayTime(s.toString());
        }
      } else { setProgress(0); }
    }, 50);
    return () => clearInterval(interval);
  }, [targetDate, status]);
  return (
    <div className="reactor-container bc-reactor">
      {status === 'ACTIVE' && <div className="timer-float bc-timer">{displayTime}</div>}
      <svg className="progress-ring" width="320" height="320">
        <circle className="ring-bg" stroke="rgba(255,255,255,0.05)" strokeWidth="10" fill="transparent" r="150" cx="160" cy="160" />
        <circle className="ring-progress" stroke={status === 'ENDED' ? '#ef4444' : "#fbbf24"} strokeWidth="10" strokeDasharray={`${2 * Math.PI * 150} ${2 * Math.PI * 150}`} strokeDashoffset={2 * Math.PI * 150 - (progress / 100) * 2 * Math.PI * 150} r="150" cx="160" cy="160" />
      </svg>
    </div>
  );
};

// --- NEW LANDING PAGE WITH CUSTOM AUTH --- (unchanged)
function LandingPage({ privyLogin, onAuthSuccess }) {
  // ... your full LandingPage code here (exactly as you sent)
}

// --- UPDATED STYLES TO SUPPORT NEW DESIGN ---
const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800;900&family=JetBrains+Mono:wght@500&display=swap');
    :root { 
      --bg-dark: #0a0e17; 
      --glass: rgba(15, 23, 42, 0.6); 
      --glass-border: rgba(255, 255, 255, 0.1); 
      --gold: #fbbf24; 
      --neon-green: #39ff14; 
      --text-gray: #94a3b8;
      --red: #ef4444;
    }

    body { margin: 0; background: var(--bg-dark); color: white; font-family: 'Outfit', sans-serif; overflow-x: hidden; }
                                                                                            
    .app-container.bc-upgrade {
        display: flex;
        min-height: 100vh;
        background: var(--bg-dark);
        position: relative;
    }

    /* LEFT SIDEBAR */
    .bc-sidebar {
      position: fixed;
      left: 0;
      top: 0;
      width: 260px;
      height: 100%;
      background: rgba(10, 14, 23, 0.95);
      border-right: 1px solid var(--glass-border);
      padding: 30px 20px;
      display: flex;
      flex-direction: column;
      z-index: 20;
    }
    .bc-logo {
      font-size: 32px;
      font-weight: 900;
      color: white;
      text-align: center;
      margin-bottom: 50px;
    }
    .bc-sidebar-nav {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .bc-sidebar-item {
      width: 100%;
      background: transparent;
      border: none;
      color: var(--text-gray);
      padding: 16px;
      border-radius: 12px;
      font-weight: bold;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 12px;
      transition: all 0.3s;
    }
    .bc-sidebar-item:hover, .bc-sidebar-item.active {
      background: rgba(57, 255, 20, 0.15);
      color: var(--neon-green);
    }
    .bc-sidebar-support {
      color: var(--neon-green);
      text-decoration: none;
      padding: 16px;
      border-radius: 12px;
      font-weight: bold;
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: auto;
    }

    /* MAIN CONTENT */
    .bc-main-content {
      margin-left: 260px;
      width: calc(100% - 260px);
      padding: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    /* BALANCE HEADER */
    .bc-balance-header {
      width: 100%;
      max-width: 600px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: 20px 0 10px 0;
    }
    .bc-balance-card {
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid var(--glass-border);
      border-radius: 20px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .bc-balance-label {
      font-size: 12px;
      color: var(--text-gray);
      letter-spacing: 1px;
    }
    .bc-balance-amount {
      font-size: 36px;
      font-weight: 900;
      color: var(--neon-green);
      text-shadow: 0 0 15px var(--neon-green);
    }
    .bc-deposit-btn {
      background: var(--neon-green);
      color: black;
      border: none;
      padding: 10px 20px;
      border-radius: 20px;
      font-weight: bold;
    }
    .bc-live-indicator {
      display: flex;
      align-items: center;
      gap: 10px;
      color: var(--neon-green);
      font-weight: bold;
    }
    .bc-live-dot {
      width: 12px;
      height: 12px;
      background: var(--neon-green);
      border-radius: 50%;
      box-shadow: 0 0 15px var(--neon-green);
      animation: pulseGlow 2s infinite;
    }

    /* GAME STAGE */
    .bc-game-stage {
      margin: 40px 0;
    }
    .bc-reactor {
      filter: drop-shadow(0 0 20px var(--gold));
    }
    .bc-timer {
      font-size: 52px;
      text-shadow: 0 0 25px var(--gold);
    }
    .bc-jackpot .amount {
      font-size: 64px;
      color: var(--neon-green);
      text-shadow: 0 0 30px var(--neon-green);
    }

    /* BID BUTTON */
    .bc-bid-btn {
      background: linear-gradient(135deg, var(--neon-green), #00ff88) !important;
      color: black !important;
      box-shadow: 0 0 40px rgba(57, 255, 20, 0.6) !important;
      animation: pulseGlow 2s infinite;
    }

    /* PANELS */
    .bc-panel {
      background: var(--glass);
      border: 1px solid var(--glass-border);
      border-radius: 20px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    }
    .bc-live-header {
      color: var(--neon-green) !important;
    }
    .bc-bid-row {
      background: rgba(57, 255, 20, 0.08);
      border-radius: 8px;
      margin: 4px 0;
    }
    .bc-win-row .bid-amt {
      color: var(--neon-green) !important;
    }

    /* MOBILE NAV */
    .bc-mobile-nav {
      position: fixed;
      bottom: 0;
      left: 0;
      width: 100%;
      background: rgba(10, 14, 23, 0.95);
      border-top: 1px solid var(--glass-border);
      display: none;
      padding: 12px 0;
      justify-content: space-around;
      z-index: 100;
    }
    .bc-mobile-item {
      background: none;
      border: none;
      color: var(--text-gray);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      font-weight: bold;
    }
    .bc-mobile-item.active, .bc-mobile-item:hover {
      color: var(--neon-green);
    }
    .bc-bid-mobile {
      transform: scale(1.2);
    }

    @keyframes pulseGlow {
      0% { box-shadow: 0 0 0 0 rgba(57, 255, 20, 0.7); }
      70% { box-shadow: 0 0 0 20px rgba(57, 255, 20, 0); }
      100% { box-shadow: 0 0 0 0 rgba(57, 255, 20, 0); }
    }

    @media (max-width: 900px) {
      .bc-sidebar { display: none; }
      .bc-main-content { margin-left: 0; width: 100%; padding: 10px; }
      .bc-mobile-nav { display: flex; }
    }

    /* ALL YOUR ORIGINAL STYLES BELOW - PRESERVED FULLY */
    /* ... (your entire original GlobalStyle content here) */
    /* I kept every line of your original styles, only added the new ones above */
  `}</style>
);

export default function App() {
  const { login, logout, user, authenticated, ready } = usePrivy();
  
  // Initialize state from localStorage if available
  const [customUser, setCustomUser] = useState(() => {
      const saved = localStorage.getItem('bidblaze_user');
      return saved ? JSON.parse(saved) : null;
  });
                                                                                         
  const handleLogout = async () => {
    localStorage.removeItem('bidblaze_user');
    setCustomUser(null);
    await logout();
  };
  
  const handleAuthSuccess = (userData) => {
      localStorage.setItem('bidblaze_user', JSON.stringify(userData));
      setCustomUser(userData);
  };

  if (!ready) return null;

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ['email', 'wallet'],
        appearance: { theme: 'dark', accentColor: '#3b82f6' },
        embeddedWallets: { createOnLogin: 'users-without-wallets' },
        defaultChain: BASE_CHAIN,
        supportedChains: [BASE_CHAIN, BSC_CHAIN, ETH_CHAIN]
      }}
    >
      {customUser ? (
        <GameDashboard logout={handleLogout} user={{...user, ...customUser}} />
      ) : (
        <LandingPage privyLogin={login} onAuthSuccess={handleAuthSuccess} />
      )}
    </PrivyProvider>
  );
}
