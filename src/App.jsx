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
        <button className="close-btn" onClick={onClose}>âœ•</button>
        <h2 style={{color: '#fbbf24', textAlign:'center', marginBottom:'20px'}}>How to Win ðŸ†</h2>
        
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
        alert("âœ… Transaction Sent! Check your wallet activities.");
      }

    } catch (err) {
      console.error(err);
      setIsProcessing(false);

      if (err.message && err.message.includes("insufficient funds")) {
          alert("âŒ INSUFFICIENT FUNDS: Your wallet is empty. You need a small amount of ETH/BNB to pay for gas fees.");
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
      alert(`âœ… SUCCESS! Deposit Verified.`);
    });
    
    socket.on('depositError', (msg) => {
      alert(`âŒ Error: ${msg}`);
      setIsProcessing(false);
    });

    socket.on('withdrawalSuccess', (newBalance) => {
        setCredits(newBalance);
        alert("âœ… Withdrawal Request Sent!");
    });

    socket.on('withdrawalError', (msg) => { alert(`âŒ Withdrawal Failed: ${msg}`); });
    socket.on('withdrawalHistory', (data) => { setWithdrawHistory(data); });
    socket.on('depositHistory', (data) => { setDepositHistory(data); });
                                                                                            
    // âš ï¸ CRITICAL FIX: Ensure request is sent on mount with correct email format
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
    <div className="app-container">
      <GlobalStyle />
      {gameState?.status === 'ENDED' && <Confetti width={window.innerWidth} height={window.innerHeight} recycle={false} numberOfPieces={500} colors={['#fbbf24', '#ffffff', '#22c55e']} />}
                                                                                              
      {showVault && <WalletVault onClose={() => setShowVault(false)} userAddress={userAddress} userEmail={userEmail} currentCredits={credits} />}
      {showHelp && <HowToPlay onClose={() => setShowHelp(false)} />}

      {/* SIDE MENU MODAL */}
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
                     <button onClick={() => setShowMenu(false)} style={{background:'none', border:'none', color:'white', fontSize:'24px'}}>âœ•</button>
                </div>
                {/* USER PROFILE SNIPPET */}
                <div style={{background: 'rgba(255,255,255,0.05)', padding:'15px', borderRadius:'12px'}}>
                    <div style={{color:'#94a3b8', fontSize:'12px', fontWeight:'bold', marginBottom:'5px'}}>LOGGED IN AS</div>
                    <div style={{color:'white', fontSize:'16px', fontWeight:'bold'}}>{username}</div>
                    <div style={{color:'#64748b', fontSize:'12px'}}>{userEmail}</div>
                </div>

                {/* BALANCE CARD */}
                <div style={{background: 'rgba(34, 197, 94, 0.1)', padding:'20px', borderRadius:'12px', border:'1px solid rgba(34, 197, 94, 0.2)'}}>
                    <div style={{color:'#22c55e', fontSize:'12px', fontWeight:'bold', marginBottom:'5px', letterSpacing:'1px'}}>TOTAL BALANCE</div>
                    <div style={{fontSize:'32px', fontWeight:'900', color:'white', marginBottom:'15px'}}>${credits.toFixed(2)}</div>
                    <button onClick={() => { setShowMenu(false); setShowDeposit(true); }} style={{width:'100%', padding:'12px', background:'#22c55e', border:'none', borderRadius:'8px', color:'white', fontWeight:'bold', cursor:'pointer'}}>
                        + DEPOSIT
                    </button>
                </div>

                {/* MENU LINKS */}
                <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                    <button onClick={() => { setShowMenu(false); setShowWithdraw(true); }} style={{textAlign:'left', background:'transparent', border:'1px solid #334155', padding:'15px', borderRadius:'10px', color:'white', fontWeight:'bold', display:'flex', justifyContent:'space-between'}}>
                         ðŸ’¸ Withdraw Funds <span>â†’</span>
                    </button>

                     <button onClick={() => setMuted(!muted)} style={{textAlign:'left', background:'transparent', border:'1px solid #334155', padding:'15px', borderRadius:'10px', color:'white', fontWeight:'bold', display:'flex', justifyContent:'space-between'}}>
                         {muted ? 'ðŸ”Š Unmute Sound' : 'ðŸ”‡ Mute Sound'} <span>{muted ? 'OFF' : 'ON'}</span>
                    </button>
                    <button onClick={() => { setShowMenu(false); setShowHelp(true); }} style={{textAlign:'left', background:'transparent', border:'1px solid #334155', padding:'15px', borderRadius:'10px', color:'white', fontWeight:'bold', display:'flex', justifyContent:'space-between'}}>
                         â“ Help / Rules <span>â†’</span>
                    </button>
                    {/* NEW SUPPORT BUTTON */}
                    <a href="https://t.me/Bidblaze" target="_blank" rel="noopener noreferrer" style={{textDecoration:'none', textAlign:'left', background:'transparent', border:'1px solid #334155', padding:'15px', borderRadius:'10px', color:'white', fontWeight:'bold', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                         ðŸ’¬ 24/7 Support <span>â†’</span>
                    </a>
                </div>

                <div style={{marginTop:'auto', textAlign:'center', fontSize:'10px', color:'#64748b'}}>
                    v1.0.5 â€¢ Secure Connection
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
            <button className="close-btn" onClick={() => setShowDeposit(false)}>âœ•</button>
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
              ðŸš€ PAY NOW (Wallet)
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
                              <span style={{color: '#22c55e', fontWeight:'bold'}}>{item.status}</span>
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
            <button className="close-btn" onClick={() => setShowWithdraw(false)}>âœ•</button>
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
              âš ï¸ Notice: Withdrawals are processed manually within 24 hours.
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
                              <span style={{color: item.status === 'PENDING' ? 'orange' : '#22c55e', fontWeight:'bold'}}>{item.status}</span>
                          </div>
                      ))}
                    </div>
                )}
            </div>
          </div>
        </div>
      )}

      {/* UPDATED NAV BAR */}
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
            <div className="live-pill" style={{color:'#22c55e', fontWeight:'bold', display:'flex', alignItems:'center', gap:'5px'}}>
                <div style={{width:'8px', height:'8px', background:'#22c55e', borderRadius:'50%', boxShadow:'0 0 10px #22c55e'}}></div>
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
          <div key={id} className="float-anim" onAnimationEnd={() => setFloatingBids(prev => prev.filter(bid => bid !== id))}>-$1.00</div>
        ))}
      </div>
      
      <button className={`main-btn ${isCooldown ? 'cooldown' : ''}`} onClick={placeBid} disabled={gameState.status !== 'ACTIVE' || isCooldown}>
        {gameState.status === 'ENDED' ? 'GAME CLOSED' : (isCooldown ? `WAIT (${cd}s)` : `BID NOW ($${gameState.bidCost})`)}
      </button>
      
      {/* ACTION BUTTONS (Still here for quick access, but also in menu now) */}
      <div className="action-buttons" style={{display: 'flex', gap: '15px', justifyContent: 'center', margin: '25px 0', width:'100%', maxWidth:'350px'}}>
        <button className="deposit-btn" onClick={() => setShowDeposit(true)} style={{background:'#22c55e', color:'white', border:'none', padding:'12px 25px', borderRadius:'12px', fontWeight:'bold', display:'flex', alignItems:'center', gap:'5px', flex:1, justifyContent:'center', fontSize:'14px'}}>
          💰 DEPOSIT
        </button>
        <button className="withdraw-btn" onClick={() => setShowWithdraw(true)} style={{background:'#ef4444', color:'white', border:'none', padding:'12px 25px', borderRadius:'12px', fontWeight:'bold', display:'flex', alignItems:'center', gap:'5px', flex:1, justifyContent:'center', fontSize:'14px'}}>
          💸 WITHDRAW
        </button>
      </div>

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
      
      <div style={{marginTop: '40px', marginBottom: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', opacity: 0.8}}>
          <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
             <span style={{fontSize:'24px', fontWeight:'900', color:'white', letterSpacing:'1px'}}>BID<span style={{color:'#fbbf24'}}>BLAZE</span></span>
          </div>
          <div style={{fontSize:'10px', color:'#64748b', fontWeight:'600', letterSpacing:'2px'}}>PROVABLY FAIR • INSTANT PAYOUTS</div>
          {/* SUPPORT LINK */}
          <a href="https://t.me/Bidblaze" target="_blank" rel="noopener noreferrer" style={{color: '#3b82f6', textDecoration: 'none', fontSize: '12px', marginTop: '10px', fontWeight: 'bold'}}>💬 24/7 SUPPORT</a>
      </div>
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

// --- NEW LANDING PAGE WITH CUSTOM AUTH ---
function LandingPage({ privyLogin, onAuthSuccess }) {
  const [authMode, setAuthMode] = useState('home'); // 'home', 'login', 'signup', 'reset'
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState('');
  const [signupStep, setSignupStep] = useState(1); // 1 = Details, 2 = OTP
  const [resetStep, setResetStep] = useState(1); // 1 = Email, 2 = OTP + New Password

  const features = [
    { icon: "⚡", title: "Instant", desc: "No signup lag. Create account & play immediately." },
    { icon: "🛡️", title: "Fair", desc: "Provably fair game logic. Blockchain verified payouts." },
    { icon: "💰", title: "High Yield", desc: "Small bids, massive jackpots. Winner takes all." }
  ];

  const handleAuthSubmit = async () => {
    // 1. Client-Side Validation
    if(authMode !== 'reset' && (!formData.email || !formData.password)) return alert("Fill all fields");

    // SIGNUP LOGIC
    if(authMode === 'signup') {
        if(signupStep === 1) {
             if(!formData.username) return alert("Enter a username");
             const usernameRegex = /^[a-zA-Z0-9]+$/;
             if (!usernameRegex.test(formData.username)) return alert('Username must contain only letters and numbers.');
             const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,}$/;
             if (!passwordRegex.test(formData.password)) return alert('Password must be 8+ characters, with at least 1 uppercase, 1 lowercase, and 1 special character.');
             
             setLoading(true);
             // Request OTP for Signup
             socket.emit('requestSignupOtp', { email: formData.email });
        } else {
             if(otp.length < 4) return alert("Enter valid OTP");
             setLoading(true);
             // Finalize Signup with OTP
             socket.emit('register', { ...formData, otp });
        }
    } 
    // LOGIN LOGIC
    else if (authMode === 'login') {
      setLoading(true);
      socket.emit('login', { email: formData.email, password: formData.password });
    }
    // RESET PASSWORD LOGIC
    else if (authMode === 'reset') {
        if(resetStep === 1) {
            if(!formData.email) return alert("Enter your email");
            setLoading(true);
            socket.emit('requestResetOtp', { email: formData.email });
        } else {
            if(otp.length < 4 || !formData.password) return alert("Enter OTP and new password");
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,}$/;
            if (!passwordRegex.test(formData.password)) return alert('Password must be 8+ characters, with at least 1 uppercase, 1 lowercase, and 1 special character.');
            
            setLoading(true);
            socket.emit('resetPassword', { email: formData.email, otp, newPassword: formData.password });
        }
    }
  };

  // Socket listeners for Auth
  useEffect(() => {
    const handleSuccess = (userData) => {
      setLoading(false);
      onAuthSuccess(userData);
    };

    const handleError = (msg) => {
      setLoading(false);
      alert("❌" + msg);
    };
    
    // OTP Sent Listeners
    const handleSignupOtpSent = () => {
        setLoading(false);
        setSignupStep(2);
        alert( "OTP Sent to your email!");
    };

    const handleResetOtpSent = () => {
        setLoading(false);
        setResetStep(2);
        alert( "OTP Sent to your email! Enter it below.");
    };

    const handleResetSuccess = () => {
        setLoading(false);
        alert("… Password Reset Successful! Please login.");
        setAuthMode('login');
        setResetStep(1);
        setFormData(prev => ({ ...prev, password: '' })); // clear password
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
      <GlobalStyle />
                                                                                              
      {/* Navbar */}
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
            <button className="lp-login-btn-small" onClick={() => { setAuthMode('home'); setSignupStep(1); setResetStep(1); }}>â† Back</button>
          )}
        </div>
      </div>
                                                                                              
      {/* AUTH FORMS OR HERO */}
      {authMode === 'home' ? (
        <div className="lp-hero">
            <div className="lp-badge">LIVE CRYPTO AUCTIONS</div>
            <h1 className="lp-title">
            Bid Small. <br />
            <span className="text-gradient">Win Massive.</span>
            </h1>
            <p className="lp-subtitle">
            The world's first PvP crypto auction battle. Be the last to bid and the jackpot is yours instantly.
            </p>
            {/* UPDATED ACTION BUTTONS CONTAINER */}
            <div className="lp-action-container">
                <button className="lp-btn-primary" onClick={() => setAuthMode('login')}>
                    LOGIN
                </button>
                 <button className="lp-btn-secondary" onClick={() => { setAuthMode('signup'); setSignupStep(1); }}>
                    SIGN UP 🚀
                 </button>
            </div>

            {/* Live Stats Illusion */}
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
      ) : (
        <div className="glass-card fade-in" style={{marginTop:'50px', maxWidth:'400px'}}>
            <h2 style={{color:'white', marginTop:0}}>
                {authMode === 'login' ? 'Welcome Back' : (authMode === 'reset' ? 'Reset Password' : 'Create Account')}
            </h2>

            {/* --- SIGNUP FLOW --- */}
            {authMode === 'signup' && (
                <>
                  {signupStep === 1 ? (
                      <>
                        <p style={{textAlign:'left', color:'#94a3b8', fontSize:'12px', marginBottom:'5px'}}>Username</p>
                        <input
                            className="input-field"
                            type="text"
                            placeholder="CryptoKing99"
                            value={formData.username}
                            onChange={(e) => setFormData({...formData, username: e.target.value})}
                        />
                        <p style={{textAlign:'left', color:'#94a3b8', fontSize:'12px', marginBottom:'5px'}}>Email Address</p>
                        <input
                            className="input-field"
                            type="email"
                            placeholder="you@example.com"
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                        />
                        <p style={{textAlign:'left', color:'#94a3b8', fontSize:'12px', marginBottom:'5px'}}>Password</p>
                        <input
                            className="input-field"
                            type="password"
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={(e) => setFormData({...formData, password: e.target.value})}
                        />
                        <button className="main-btn" onClick={handleAuthSubmit} style={{fontSize:'16px', marginTop:'10px'}}>
                            {loading ? 'SENDING OTP...' : 'NEXT: VERIFY EMAIL'}
                        </button>
                      </>
                  ) : (
                      <>
                        <p style={{textAlign:'center', color:'#94a3b8', fontSize:'14px', marginBottom:'15px'}}>Enter the OTP sent to {formData.email}</p>
                        <input
                            className="input-field"
                            type="text"
                            placeholder="Enter 6-digit Code"
                            style={{textAlign:'center', letterSpacing:'5px', fontSize:'20px', fontWeight:'bold'}}
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                        />
                        <button className="main-btn" onClick={handleAuthSubmit} style={{fontSize:'16px', marginTop:'10px'}}>
                            {loading ? 'VERIFYING...' : 'FINISH SIGNUP'}
                        </button>
                        <p style={{fontSize:'12px', color:'#fbbf24', cursor:'pointer'}} onClick={() => setSignupStep(1)}>Wrong Email?</p>
                      </>
                  )}
                </>
            )}
            
            {/* --- LOGIN FLOW --- */}
            {authMode === 'login' && (
                <>
                    <p style={{textAlign:'left', color:'#94a3b8', fontSize:'12px', marginBottom:'5px'}}>Email Address</p>
                    <input
                        className="input-field"
                        type="email"
                        placeholder="you@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                    <p style={{textAlign:'left', color:'#94a3b8', fontSize:'12px', marginBottom:'5px'}}>Password</p>
                    <input
                        className="input-field"
                        type="password"
                        placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                    />

                    <button className="main-btn" onClick={handleAuthSubmit} style={{fontSize:'16px', marginTop:'10px'}}>
                        {loading ? 'PROCESSING...' : 'LOG IN'}
                    </button>
                    
                    {/* Forgot Password Link */}
                    <p style={{fontSize:'12px', color:'#3b82f6', marginTop:'10px', cursor:'pointer', textAlign:'right'}} onClick={() => { setAuthMode('reset'); setResetStep(1); setFormData({...formData, password: ''}); }}>
                        Forgot Password?
                    </p>
                </>
            )}

            {/* --- RESET PASSWORD FLOW --- */}
            {authMode === 'reset' && (
                <>
                    {resetStep === 1 ? (
                         <>
                            <p style={{color:'#94a3b8', fontSize:'14px', marginBottom:'15px'}}>Enter your email to receive a reset code.</p>
                            <input
                                className="input-field"
                                type="email"
                                placeholder="you@example.com"
                                value={formData.email}
                                onChange={(e) => setFormData({...formData, email: e.target.value})}
                            />
                            <button className="main-btn" onClick={handleAuthSubmit} style={{fontSize:'16px', marginTop:'10px'}}>
                                {loading ? 'SENDING...' : 'GET OTP'}
                            </button>
                         </>
                    ) : (
                         <>
                            <p style={{textAlign:'left', color:'#94a3b8', fontSize:'12px', marginBottom:'5px'}}>OTP Code</p>
                            <input
                                className="input-field"
                                type="text"
                                placeholder="Code"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                            />
                            <p style={{textAlign:'left', color:'#94a3b8', fontSize:'12px', marginBottom:'5px'}}>New Password</p>
                            <input
                                className="input-field"
                                type="password"
                                placeholder="New Password"
                                value={formData.password}
                                onChange={(e) => setFormData({...formData, password: e.target.value})}
                            />
                            <button className="main-btn" onClick={handleAuthSubmit} style={{fontSize:'16px', marginTop:'10px'}}>
                                {loading ? 'UPDATING...' : 'RESET PASSWORD'}
                            </button>
                         </>
                    )}
                </>
            )}

            {/* Toggle between Login/Signup (Hidden when in reset mode) */}
            {authMode !== 'reset' && (
                <p style={{fontSize:'12px', color:'#64748b', marginTop:'15px', cursor:'pointer'}} onClick={() => {
                    setAuthMode(authMode === 'login' ? 'signup' : 'login');
                    setSignupStep(1);
                }}>
                    {authMode === 'login' ? "Don't have an account? Sign Up" : "Already have an account? Log In"}
                </p>
            )}
        </div>
      )}
                                                                                              
      {/* Marquee Section */}
      <div className="lp-marquee-container">
         <div className="lp-marquee-content">
           <span>ðŸ† User88 just won $450.00 (ETH)</span> â€¢
           <span>ðŸ† CryptoKing just won $1,200.00 (BNB)</span> â€¢
           <span>ðŸ”¥ Jackpot currently at $52.00</span> â€¢
           <span>ðŸ† Alex_99 just won $320.00 (BASE)</span> â€¢
           <span>ðŸ’Ž New Round Starting...</span> â€¢
           <span>ðŸ† User88 just won $450.00 (ETH)</span> â€¢
           <span>ðŸ† CryptoKing just won $1,200.00 (BNB)</span> â€¢
           <span>ðŸ”¥ Jackpot currently at $52.00</span>
         </div>
      </div>
                                                                                              
      {/* Features Grid */}
      <div className="lp-features">
         {features.map((f, i) => (
           <div key={i} className="lp-feature-card">
                 <div className="lp-icon">{f.icon}</div>
                 <h3>{f.title}</h3>
                 <p>{f.desc}</p>
           </div>
         ))}
      </div>
      
      {/* Footer */}
      <div className="lp-footer">
        &copy; 2025 BidBlaze Protocol.
      </div>
    </div>
  );
}

// --- UPDATED STYLES TO SUPPORT NEW DESIGN ---
const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800;900&family=JetBrains+Mono:wght@500&display=swap');
    :root { --bg-dark: #020617; --glass: rgba(255, 255, 255, 0.05); --glass-border: rgba(255, 255, 255, 0.1); --gold: #fbbf24; --blue: #3b82f6; --red: #ef4444; }

    body { margin: 0; background: var(--bg-dark); color: white; font-family: 'Outfit', sans-serif; overflow-x: hidden; }
                                                                                            
    /* --- APP CONTAINER (GAME) --- */
    .app-container {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 20px;
        background-color: #0f172a;
        background-image:
            radial-gradient(at 0% 0%, hsla(253,16%,7%,1) 0, transparent 50%),
            radial-gradient(at 50% 0%, hsla(225,39%,30%,1) 0, transparent 50%),
            radial-gradient(at 100% 0%, hsla(339,49%,30%,1) 0, transparent 50%);
        background-size: 200% 200%;
        animation: gradientMove 15s ease infinite;
    }
    
    /* --- LANDING PAGE STYLES (NEW) --- */
    .landing-page-wrapper {
        min-height: 100vh;
        width: 100%;
        background: radial-gradient(circle at top, #1e293b, #020617);
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
    }

    .lp-nav {
        width: 100%;
        max-width: 1000px;
        padding: 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        box-sizing: border-box;
    }
    .lp-logo { font-size: 24px; font-weight: 900; letter-spacing: -1px; }
    .lp-login-btn-small {
        background: rgba(255,255,255,0.1);
        border: 1px solid rgba(255,255,255,0.2);
        color: white;
        padding: 8px 20px;
        border-radius: 20px;
        cursor: pointer;
        font-weight: 600;
        transition: all 0.2s;
    }
    .lp-login-btn-small:hover { background: white; color: black; }

    .lp-hero {
        padding: 60px 20px;
        max-width: 800px;
        display: flex;
        flex-direction: column;
        align-items: center;
    }
    .lp-badge {
        background: rgba(251, 191, 36, 0.15);
        color: #fbbf24;
        font-size: 12px;
        font-weight: bold;
        padding: 6px 12px;
        border-radius: 20px;
        margin-bottom: 20px;
        border: 1px solid rgba(251, 191, 36, 0.3);
    }
    .lp-title {
        font-size: 56px;
        font-weight: 900;
        line-height: 1.1;
        margin: 0 0 20px 0;
        letter-spacing: -2px;
    }
    .text-gradient {
        background: linear-gradient(135deg, #fff 30%, #94a3b8 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
    }
    .lp-subtitle {
        color: #94a3b8;
        font-size: 18px;
        line-height: 1.6;
        max-width: 500px;
        margin-bottom: 40px;
    }

    /* --- NEW ACTION BUTTON STYLES --- */
    .lp-action-container {
        display: flex;
        gap: 15px;
        margin-top: 10px;
        justify-content: center;
        width: 100%;
        max-width: 400px;
    }

    .lp-btn-primary {
        flex: 1;
        background: white;
        color: black;
        border: none;
        padding: 14px 24px;
        font-size: 16px;
        font-weight: 800;
        border-radius: 12px;
        cursor: pointer;
        transition: transform 0.2s;
        text-transform: uppercase;
    }
    .lp-btn-primary:hover { transform: scale(1.05); background: #f8fafc; }
                                                                                            
    .lp-btn-secondary {
        flex: 1;
        background: #fbbf24;
        color: black;
        border: none;
        padding: 14px 24px;
        font-size: 16px;
        font-weight: 800;
        border-radius: 12px;
        cursor: pointer;
        box-shadow: 0 4px 20px rgba(251, 191, 36, 0.4);
        transition: transform 0.2s;
        text-transform: uppercase;
    }
    .lp-btn-secondary:hover { transform: scale(1.05); background: #f59e0b; }

    .lp-stats-row {
        display: flex;
        gap: 40px;
        margin-top: 60px;
        border-top: 1px solid rgba(255,255,255,0.1);
        padding-top: 30px;
    }
    .lp-stat { display: flex; flex-direction: column; }
    .lp-stat .val { font-size: 28px; font-weight: 800; }
    .lp-stat .lbl { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-top: 5px; }

    .lp-marquee-container {
        width: 100%;
        background: #0f172a;
        padding: 15px 0;
        margin: 40px 0;
        overflow: hidden;
        white-space: nowrap;
        border-top: 1px solid #1e293b;
        border-bottom: 1px solid #1e293b;
    }
    .lp-marquee-content {
        display: inline-block;
        animation: marquee 20s linear infinite;
        font-family: 'JetBrains Mono', monospace;
        font-size: 14px;
        color: #cbd5e1;
    }
    .lp-marquee-content span { margin: 0 20px; }

    .lp-features {
        display: flex;
        gap: 20px;
        padding: 20px;
        flex-wrap: wrap;
        justify-content: center;
        max-width: 1000px;
    }
    .lp-feature-card {
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.05);
        padding: 30px;
        border-radius: 20px;
        width: 250px;
        text-align: left;
    }
    .lp-icon { font-size: 30px; margin-bottom: 15px; }
    .lp-feature-card h3 { margin: 0 0 10px 0; font-size: 18px; }
    .lp-feature-card p { margin: 0; font-size: 14px; color: #94a3b8; line-height: 1.5; }

    .lp-footer { margin-top: 50px; color: #475569; font-size: 12px; padding-bottom: 20px; }

    @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
    @keyframes pulseBtn { 0% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.7); } 70% { box-shadow: 0 0 0 15px rgba(251, 191, 36, 0); } 100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0); } }
    @keyframes slideIn { from { transform: translateX(100%); opacity:0; } to { transform: translateX(0); opacity:1; } }

    /* --- GAME DASHBOARD STYLES (EXISTING & REFINED) --- */
    @keyframes gradientMove {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
    }
                                                                                            
    .glass-nav { width: 100%; max-width: 450px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding: 10px 15px; background: rgba(15, 23, 42, 0.6); border-radius: 20px; border: 1px solid var(--glass-border); backdrop-filter: blur(10px); }
    .glass-panel { background: var(--glass); border: 1px solid var(--glass-border); border-radius: 20px; backdrop-filter: blur(10px); width: 100%; max-width: 400px; padding: 20px; box-sizing: border-box; }
    .glass-card { background: #0f172a; border: 1px solid #334155; border-radius: 24px; padding: 30px; width: 90%; max-width: 380px; text-align: center; position: relative; }
    .nav-btn { background: transparent; border: none; color: #94a3b8; font-weight: bold; cursor: pointer; padding: 8px 12px; }
    .vault-btn { color: var(--blue); background: rgba(59, 130, 246, 0.1); border-radius: 12px; }
    .live-pill { color: #22c55e; font-size: 12px; font-weight: bold; text-shadow: 0 0 10px rgba(34, 197, 94, 0.4); }
    .main-btn { width: 100%; max-width: 350px; padding: 22px; border-radius: 50px; border: none; font-size: 20px; font-weight: 900; color: white; background: linear-gradient(135deg, #fbbf24, #d97706); cursor: pointer; box-shadow: 0 10px 20px rgba(251, 191, 36, 0.3); transition: transform 0.1s; margin-bottom: 10px; }
    .main-btn:active { transform: translateY(6px); }
    .main-btn.cooldown { background: #334155; box-shadow: none; transform: translateY(6px); color: #64748b; cursor: not-allowed; }
    .game-stage { position: relative; width: 300px; height: 300px; display: flex; justify-content: center; align-items: center; margin: 20px 0; }
    .reactor-container { position: absolute; width: 100%; height: 100%; }
    .progress-ring { transform: rotate(-90deg); width: 100%; height: 100%; overflow: visible; }
    .ring-progress { transition: stroke-dashoffset 0.1s linear; filter: drop-shadow(0 0 8px var(--gold)); }
    .timer-float { position: absolute; top: -40px; left: 50%; transform: translateX(-50%); font-family: 'JetBrains Mono', monospace; font-size: 48px; font-weight: bold; color: white; text-shadow: 0 0 20px var(--gold); }

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
    
    /* MEDIA QUERIES */
    @media (max-width: 600px) {
        .lp-title { font-size: 36px; }
        .lp-stats-row { flex-direction: column; gap: 20px; margin-top: 40px; }
        .lp-features { flex-direction: column; align-items: center; }
        .lp-action-container { flex-direction: column; gap: 10px; width: 100%; max-width: 250px; }
    }
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
      {/* LOGIC: If customUser exists (logged in via form) -> Show Dashboard.
         Else -> Show Landing Page.
         We pass 'login' to LandingPage to allow triggering Privy if needed for wallet connection later.
      */}
      {customUser ? (
        <GameDashboard logout={handleLogout} user={{...user, ...customUser}} />
      ) : (
        <LandingPage privyLogin={login} onAuthSuccess={handleAuthSuccess} />
      )}
    </PrivyProvider>
  );
}
