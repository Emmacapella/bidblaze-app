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
  transports: ['websocket', 'polling']
});

const ASSETS = {
  soundBid: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
  soundWin: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
  soundPop: 'https://assets.mixkit.co/active_storage/sfx/2578/2578-preview.mp3'
};

const ADMIN_WALLET = "0x6edadf13a704cd2518cd2ca9afb5ad9dee3ce34c"; 

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
  rpcUrls: { default: { http: ['https://bsc-dataseed.binance.org'] } },
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

// --- HOW TO PLAY GUIDE (FULL) ---
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

        {/* RULE #4: REFUND POLICY */}
        <div style={{display:'flex', gap:'15px', marginBottom:'15px'}}>
          <div style={{background:'#a855f7', borderRadius:'50%', width:'30px', height:'30px', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold'}}>4</div>
          <div><div style={{fontWeight:'bold', color:'white'}}>No Opponent?</div><div style={{fontSize:'12px', color:'#94a3b8'}}>If no one joins, you get a <span style={{color:'#fbbf24'}}>FULL REFUND</span> instantly.</div></div>
        </div>

        <button className="action-btn" onClick={onClose}>Got it! Let's Play</button>
      </div>
    </div>
  );
};

// --- GAME DASHBOARD ---
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

  // --- SOUND ---
  const playSound = (key) => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    const audio = new Audio(ASSETS[key]);
    audio.volume = 0.5;
    audioRef.current = audio;
    audio.play().catch(() => {});
  };

  // --- DEPOSIT LOGIC (Safe Method) ---
const handleDeposit = async () => {
  try {
    const amt = Number(depositAmount);
    if (!amt || amt <= 0) {
      alert("Enter a valid amount");
      return;
    }

    // ✅ Pick a wallet that can actually sign transactions
    const activeWallet = wallets.find(w =>
      w.walletClientType === 'metamask' ||
      w.walletClientType === 'wallet_connect' ||
      w.walletClientType === 'coinbase_wallet' ||
      w.walletClientType === 'privy'
    );

    if (!activeWallet) {
      alert("Please connect a wallet that supports transactions.");
      return;
    }

    setIsProcessing(true);
    setShowDeposit(false);

    const provider = await activeWallet.getEthereumProvider();

    // ✅ Request account access (forces wallet UI)
    const [from] = await provider.request({
      method: 'eth_requestAccounts'
    });

    // ✅ Chain configuration
    const chainMap = {
      BSC: { chainId: '0x38' },
      ETH: { chainId: '0x1' },
      BASE: { chainId: '0x2105' }
    };

    const targetChain = chainMap[selectedNetwork];

    if (!targetChain) {
      throw new Error("Unsupported network selected");
    }

    // ✅ Enforce correct chain
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: targetChain.chainId }]
    });

    // ✅ SAFE ether parsing
    const value = `0x${parseEther(depositAmount).toString(16)}`;

    // ✅ Send REAL transaction
    const txHash = await provider.request({
      method: 'eth_sendTransaction',
      params: [{
        from,
        to: ADMIN_WALLET,
        value,
        // gas is optional but helps BSC/Base wallets
        gas: '0x5208' // 21000
      }]
    });

    socket.emit('verifyDeposit', {
      email: user.email.address,
      txHash,
      network: selectedNetwork
    });

    alert("✅ Transaction sent. Waiting for confirmation...");
  } catch (err) {
    console.error(err);

    if (err.code === 4001) {
      alert("Transaction rejected by user.");
    } else {
      alert(err.message || "Deposit failed. Check wallet and network.");
    }
  } finally {
    setIsProcessing(false);
  }
};

  const handleWithdraw = () => {
      const amt = parseFloat(withdrawAmount);
      if (isNaN(amt) || amt < 10) return alert("Minimum withdrawal is $10.00");
      if (withdrawAddress.length < 10) return alert("Enter a valid receiving address");
      if (credits < amt) return alert("Insufficient Balance");

      socket.emit('requestWithdrawal', { 
          email: user.email.address, 
          amount: amt, 
          address: withdrawAddress, 
          network: selectedNetwork 
      });
      setWithdrawAmount('');
      setWithdrawAddress('');
  };

  useEffect(() => {
    socket.on('depositSuccess', (newBalance) => {
      setCredits(newBalance); 
      setDepositAmount('');
      setIsProcessing(false);
      alert(`✅ SUCCESS! Deposit Verified.`);
    });

    socket.on('depositError', (msg) => {
      alert(`❌ Error: ${msg}`);
      setIsProcessing(false);
    });

    socket.on('withdrawalSuccess', (newBalance) => {
        setCredits(newBalance);
        alert("✅ Withdrawal Request Sent!");
    });
    
    socket.on('withdrawalError', (msg) => { alert(`❌ Withdrawal Failed: ${msg}`); });
    socket.on('withdrawalHistory', (data) => { setWithdrawHistory(data); });

    if(user?.email?.address) socket.emit('getUserBalance', user.email.address);

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
        if (data.lastBidder === user?.email?.address) {
            setTimeout(() => { socket.emit('getUserBalance', user.email.address); }, 1000);
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
    };
  }, [user]);

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
    socket.emit('placeBid', user.email ? user.email.address : "User");
    setIsCooldown(true);
    setCd(8);
  };

  const runAdmin = () => {
    const pwd = prompt("🔐 ADMIN PANEL\nEnter Password:");
    if (!pwd) return;
    const action = prompt("1. Reset Game\n2. Set Jackpot\n3. Add Time");
    if (action === '1') socket.emit('adminAction', { password: pwd, action: 'RESET' });
    else if (action === '2') socket.emit('adminAction', { password: pwd, action: 'SET_JACKPOT', value: prompt("Amount:") });
    else if (action === '3') socket.emit('adminAction', { password: pwd, action: 'ADD_TIME', value: 299 });
  };

  if (!gameState) return (
    <div className="loading-screen" style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'20px'}}>
      <div className="spinner"></div>
      <div style={{color:'#64748b', fontSize:'12px', letterSpacing:'2px', animation:'pulse 1.5s infinite'}}>CONNECTING...</div>
      <style>{`.spinner { width: 40px; height: 40px; border: 3px solid rgba(255,255,255,0.1); border-radius: 50%; border-top-color: #fbbf24; animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div className="app-container">
      <GlobalStyle />
      {gameState?.status === 'ENDED' && <Confetti width={window.innerWidth} height={window.innerHeight} recycle={false} numberOfPieces={500} colors={['#fbbf24', '#ffffff', '#22c55e']} />}
      
      {showVault && <WalletVault onClose={() => setShowVault(false)} userAddress={userAddress} userEmail={user.email?.address} currentCredits={credits} />}
      {showHelp && <HowToPlay onClose={() => setShowHelp(false)} />}

      {/* Global Loading Spinner */}
      {isProcessing && (
          <div className="modal-overlay">
              <div className="spinner" style={{width:'60px', height:'60px'}}></div>
          </div>
      )}

      {/* DEPOSIT POPUP */}
      {showDeposit && (
        <div className="modal-overlay">
          <div className="glass-card modal-content fade-in" style={{textAlign:'left'}}>
            <button className="close-btn" onClick={() => setShowDeposit(false)}>✕</button>
            <h2 style={{color: '#22c55e', textAlign:'center', marginTop:0}}>INSTANT DEPOSIT</h2>
            
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
            
            <button className="action-btn" onClick={handleDeposit} style={{background:'#22c55e', color:'white', marginBottom:'10px'}}>
              🚀 PAY NOW (Wallet)
            </button>
            
            <p style={{fontSize:'12px', color:'#fbbf24', marginTop:'10px', textAlign:'center'}}>{statusMsg}</p>
            <p style={{fontSize:'10px', color:'#64748b', textAlign:'center'}}>If wallet doesn't open, check pop-up blocker.</p>
          </div>
        </div>
      )}

      {/* WITHDRAW POPUP (FIXED HISTORY) */}
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

            {/* RESTORED HISTORY SECTION */}
            <div style={{borderTop:'1px solid #334155', paddingTop:'15px', marginTop:'15px'}}>
                <p style={{fontSize:'12px', color:'#94a3b8', fontWeight:'bold', marginBottom:'10px'}}>RECENT WITHDRAWALS</p>
                {withdrawHistory.length === 0 ? (
                    <p style={{fontSize:'12px', color:'#64748b', textAlign:'center'}}>No recent withdrawals.</p>
                ) : (
                    <div style={{maxHeight:'100px', overflowY:'auto'}}>
                        {withdrawHistory.map((item) => (
                            <div key={item.id} style={{display:'flex', justifyContent:'space-between', fontSize:'12px', marginBottom:'8px', background:'#1e293b', padding:'8px', borderRadius:'6px'}}>
                                <span style={{color:'white'}}>${item.amount.toFixed(2)}</span>
                                <span style={{color: item.status === 'PENDING' ? 'orange' : '#22c55e', fontWeight:'bold'}}>{item.status}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
          </div>
        </div>
      )}

      {/* NAV BAR */}
      <nav className="glass-nav">
        <button className="nav-btn vault-btn" onClick={() => setShowDeposit(true)}>🏦 ${credits.toFixed(2)}</button>
        <div className="live-pill" style={{color:'#22c55e', fontWeight:'bold', display:'flex', alignItems:'center', gap:'5px'}}>
           <div style={{width:'8px', height:'8px', background:'#22c55e', borderRadius:'50%', boxShadow:'0 0 10px #22c55e'}}></div>
           {gameState.connectedUsers || 1} LIVE
        </div>
        <div style={{display:'flex', gap:'8px'}}>
           <button className="nav-btn" onClick={() => setShowHelp(true)} style={{fontSize:'18px'}}>❓</button>
           <button className="nav-btn logout-btn" onClick={logout}>✕</button>
        </div>
      </nav>

      {/* GAME STAGE */}
      <div className="game-stage">
        <ReactorRing targetDate={gameState.endTime} status={gameState.status} />
        <div className="jackpot-core">
          {gameState.status === 'ACTIVE' ? (
            <>
              <div className="label">JACKPOT</div>
              <div className="amount">${gameState.jackpot.toFixed(2)}</div>
            </>
          ) : (
            <div className="restart-box">
               <div className="restart-label">NEW GAME IN</div>
               <div className="restart-timer">{restartCount}</div>
               <div className="winner-badge">🏆 WINNER: {gameState.history[0]?.user.slice(0,10)}...</div>
            </div>
          )}
        </div>
        {floatingBids.map(id => (
          <div key={id} className="float-anim" onAnimationEnd={() => setFloatingBids(prev => prev.filter(bid => bid !== id))}>-$1.00</div>
        ))}
      </div>

      <button className={`main-btn ${isCooldown ? 'cooldown' : ''}`} onClick={placeBid} disabled={gameState.status !== 'ACTIVE' || isCooldown}>
        {gameState.status === 'ENDED' ? 'GAME CLOSED' : (isCooldown ? `WAIT (${cd}s)` : `BID NOW ($${gameState.bidCost})`)}
      </button>

      {/* ACTION BUTTONS */}
      <div className="action-buttons" style={{display: 'flex', gap: '15px', justifyContent: 'center', margin: '25px 0', width:'100%', maxWidth:'350px'}}>
        <button className="deposit-btn" onClick={() => setShowDeposit(true)} style={{background:'#22c55e', color:'white', border:'none', padding:'12px 25px', borderRadius:'12px', fontWeight:'bold', display:'flex', alignItems:'center', gap:'5px', flex:1, justifyContent:'center', fontSize:'14px'}}>
          💰 DEPOSIT
        </button>
        <button className="withdraw-btn" onClick={() => setShowWithdraw(true)} style={{background:'#ef4444', color:'white', border:'none', padding:'12px 25px', borderRadius:'12px', fontWeight:'bold', display:'flex', alignItems:'center', gap:'5px', flex:1, justifyContent:'center', fontSize:'14px'}}>
          💸 WITHDRAW
        </button>
      </div>

      {/* WINNERS PANEL */}
      <div className="glass-panel" style={{marginTop:'20px', borderColor: '#fbbf24', background: 'rgba(251, 191, 36, 0.05)'}}>
        <div className="panel-header" style={{color: '#fbbf24'}}>🏆 RECENT BIG WINS</div>
        <div className="history-list" style={{maxHeight: '120px'}}>
          {gameState.recentWinners && gameState.recentWinners.length > 0 ? (
            gameState.recentWinners.map((win, index) => (
              <div key={index} className="history-row">
                <span className="user" style={{color: 'white', fontWeight:'bold'}}>{win.user.split('@')[0].slice(0,12)}...</span>
                <span className="bid-amt" style={{fontSize:'14px', color:'#fbbf24'}}>+${win.amount.toFixed(2)}</span>
              </div>
            ))
          ) : (
            <div style={{color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '10px'}}>No winners yet. Be the first!</div>
          )}
        </div>
      </div>

      {/* LIVE BIDS HISTORY */}
      <div className="glass-panel history-panel" style={{marginTop:'15px'}}>
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

      {/* FOOTER */}
      <div style={{marginTop: '40px', marginBottom: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', opacity: 0.8}}>
          <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
             <span style={{fontSize:'24px', fontWeight:'900', color:'white', letterSpacing:'1px'}}>BID<span style={{color:'#fbbf24'}}>BLAZE</span></span>
          </div>
          <div style={{fontSize:'10px', color:'#64748b', fontWeight:'600', letterSpacing:'2px'}}>PROVABLY FAIR • INSTANT PAYOUTS</div>
      </div>

      {user?.email?.address?.toLowerCase() === MY_EMAIL && (
        <button onClick={runAdmin} style={{marginTop:'10px', background:'none', border:'1px solid #ef4444', color:'#ef4444', padding:'5px 10px', fontSize:'10px'}}>ADMIN</button>
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
    <div className="reactor-container">
      {status === 'ACTIVE' && <div className="timer-float">{displayTime}</div>}
      <svg className="progress-ring" width="280" height="280">
        <circle className="ring-bg" stroke="rgba(255,255,255,0.05)" strokeWidth="8" fill="transparent" r="130" cx="140" cy="140" />
        <circle className="ring-progress" stroke={status === 'ENDED' ? '#ef4444' : "#fbbf24"} strokeWidth="8" strokeDasharray={`${2 * Math.PI * 130} ${2 * Math.PI * 130}`} strokeDashoffset={2 * Math.PI * 130 - (progress / 100) * 2 * Math.PI * 130} r="130" cx="140" cy="140" />
      </svg>
    </div>
  );
};

function LandingPage({ login }) {
  return (
    <div className="landing-container">
      <GlobalStyle />
      <div className="landing-content" style={{textAlign:'center'}}>
        <div style={{fontSize:'60px', marginBottom:'20px'}}>🔥</div>
        <h1>BidBlaze <span style={{color:'#fbbf24'}}>Pro</span></h1>
        <p style={{color:'#94a3b8', fontSize:'16px', marginTop:'-10px'}}>Real-Time Crypto Auctions</p>
        <button className="start-btn" onClick={login} style={{marginTop:'30px'}}>🚀 Play Now</button>
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
    .landing-container { height: 100vh; display: flex; justify-content: center; align-items: center; background: linear-gradient(135deg, #1e293b, #0f172a); }
    .glass-nav { width: 100%; max-width: 450px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding: 10px 15px; background: rgba(15, 23, 42, 0.6); border-radius: 20px; border: 1px solid var(--glass-border); backdrop-filter: blur(10px); }
    .glass-panel { background: var(--glass); border: 1px solid var(--glass-border); border-radius: 20px; backdrop-filter: blur(10px); width: 100%; max-width: 400px; padding: 20px; box-sizing: border-box; }
    .glass-card { background: #0f172a; border: 1px solid #334155; border-radius: 24px; padding: 30px; width: 90%; max-width: 380px; text-align: center; position: relative; }
    .nav-btn { background: transparent; border: none; color: #94a3b8; font-weight: bold; cursor: pointer; padding: 8px 12px; }
    .vault-btn { color: var(--blue); background: rgba(59, 130, 246, 0.1); border-radius: 12px; }
    .live-pill { color: #22c55e; font-size: 12px; font-weight: bold; text-shadow: 0 0 10px rgba(34, 197, 94, 0.4); }
    .main-btn { width: 100%; max-width: 350px; padding: 22px; border-radius: 50px; border: none; font-size: 20px; font-weight: 900; color: white; background: linear-gradient(135deg, #fbbf24, #d97706); cursor: pointer; box-shadow: 0 10px 20px rgba(251, 191, 36, 0.3); transition: transform 0.1s; margin-bottom: 10px; }
    .main-btn:active { transform: translateY(6px); }
    .main-btn.cooldown { background: #334155; box-shadow: none; transform: translateY(6px); color: #64748b; cursor: not-allowed; }
    .start-btn { padding: 20px 60px; font-size: 20px; font-weight: bold; border-radius: 50px; border: none; background: white; color: #000; cursor: pointer; }
    .game-stage { position: relative; width: 300px; height: 300px; display: flex; justify-content: center; align-items: center; margin: 20px 0; }
    .reactor-container { position: absolute; width: 100%; height: 100%; }
    .progress-ring { transform: rotate(-90deg); width: 100%; height: 100%; overflow: visible; }
    .ring-progress { transition: stroke-dashoffset 0.1s linear; filter: drop-shadow(0 0 8px var(--gold)); }
    .timer-float { position: absolute; top: -40px; left: 50%; transform: translateX(-50%); font-family: 'JetBrains Mono', monospace; font-size: 48px; font-weight: bold; color: white; text-shadow: 0 0 20px var(--gold); }
    
    /* ⚠️ Z-INDEX + POSITION FIX BELOW */
    .jackpot-core { z-index: 10; text-align: center; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); }
    .jackpot-core .label { font-size: 12px; color: #64748b; letter-spacing: 2px; margin-bottom: 5px; }
    .jackpot-core .amount { font-size: 56px; font-weight: 900; color: white; text-shadow: 0 4px 20px rgba(0,0,0,0.5); }
    
    .restart-box { animation: popIn 0.3s; }
    .restart-label { color: #ef4444; font-size: 14px; font-weight: bold; letter-spacing: 2px; margin-bottom: 5px; }
    .restart-timer { font-size: 60px; font-weight: 900; color: white; text-shadow: 0 0 20px rgba(239, 68, 68, 0.5); line-height: 1; }
    .winner-badge { background: #fbbf24; color: black; padding: 6px 12px; border-radius: 20px; font-weight: bold; font-size: 14px; margin-top: 10px; display: inline-block; }
    .panel-header { font-size: 11px; color: #64748b; letter-spacing: 1px; margin-bottom: 10px; font-weight: bold; text-align: left; }
    .history-list { max-height: 300px; overflow-y: auto; padding-right: 5px; }
    .history-list::-webkit-scrollbar { width: 4px; }
    .history-list::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
    .history-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--glass-border); font-size: 13px; }
    .history-row .bid-amt { color: var(--gold); font-weight: bold; }
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(5px); z-index: 50; display: flex; justify-content: center; align-items: center; }
    .close-btn { position: absolute; top: 15px; right: 15px; background: none; border: none; color: white; font-size: 20px; cursor: pointer; }
    .input-field { width: 100%; background: #1e293b; border: 1px solid #334155; padding: 14px; border-radius: 12px; color: white; margin-bottom: 15px; box-sizing: border-box; }
    .action-btn { width: 100%; padding: 14px; background: var(--blue); border: none; border-radius: 12px; color: white; font-weight: bold; cursor: pointer; }
    .float-anim { position: absolute; color: var(--red); font-weight: 900; font-size: 24px; animation: floatUp 0.8s forwards; z-index: 50; pointer-events: none; }
    @keyframes popIn { 0% { transform: scale(0); } 100% { transform: scale(1); } }
    @keyframes floatUp { 0% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-80px); } }
    .fade-in { animation: popIn 0.3s ease-out; }
    .spinner { border: 4px solid rgba(255,255,255,0.1); border-left-color: #3b82f6; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
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
        // ⚠️ NEW: ADDED SUPPORT FOR ETH & BSC
        defaultChain: BASE_CHAIN,
        supportedChains: [BASE_CHAIN, BSC_CHAIN, ETH_CHAIN]
      }}
    >
      {authenticated ? <GameDashboard logout={logout} user={user} /> : <LandingPage login={login} />}
    </PrivyProvider>
  );
}
// END OF FILE
