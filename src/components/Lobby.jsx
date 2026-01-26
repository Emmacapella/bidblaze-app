import React from 'react';

const Lobby = ({ 
  user, 
  onJoin, 
  onLogout, 
  connectedUsers, 
  onOpenHelp, 
  onOpenMenu, 
  onOpenProfile, 
  onOpenDeposit 
}) => {

  return (
    <div className="lobby-container fade-in">
      
      {/* 1. APP-LIKE HEADER */}
      <div className="app-header">
         <div className="user-pill" onClick={onOpenProfile}>
            <div className="avatar-small">{user.username.charAt(0).toUpperCase()}</div>
            <span className="username">{user.username}</span>
         </div>
         
         <div className="wallet-btn" onClick={onOpenDeposit}>
            <span className="wallet-icon">⚡</span>
            <span className="balance">${user.balance.toFixed(2)}</span>
            <div className="plus-btn">+</div>
         </div>
      </div>

      {/* 2. MAIN CONTENT AREA */}
      <div className="lobby-scroll-area">
          {/* BANNER AREA */}
          <div className="promo-banner">
             <h3>BIDBLAZE</h3>
             <p>The Ultimate Crypto Auction</p>
          </div>

          {/* HORIZONTAL SCROLL: RECENT WINS */}
          <div className="section-title">
             <span className="fire">🏆</span> RECENT BIG WINS
          </div>
          <div className="horizontal-scroll">
             <div className="win-card">
                <span className="win-user">User88</span>
                <span className="win-amt text-green">+$450.00</span>
             </div>
             <div className="win-card">
                <span className="win-user">CryptoKing</span>
                <span className="win-amt text-gold">+$1,200.00</span>
             </div>
             <div className="win-card">
                <span className="win-user">Alex_99</span>
                <span className="win-amt text-green">+$320.00</span>
             </div>
             <div className="win-card">
                <span className="win-user">Satoshi_V</span>
                <span className="win-amt text-gold">+$9,999.00</span>
             </div>
          </div>

          <div className="section-title" style={{marginTop:'20px'}}>
             <span className="fire">🔥</span> POPULAR GAMES
          </div>

          <div className="game-grid">
             {/* NOVICE CARD (Green Gradient) */}
             <div className="game-card novice" onClick={() => onJoin('low')}>
                <div className="card-top">
                   <span className="badge">HOT</span>
                   <div className="icon">🛡️</div>
                </div>
                <div className="card-bottom">
                   <h3>Novice</h3>
                   <div className="details">
                      <span>Entry: $0.10</span>
                      <span style={{color:'#a7f3d0'}}>Jackpot +$0.095</span>
                   </div>
                </div>
             </div>

             {/* HIGH ROLLER CARD (Purple/Gold Gradient) */}
             <div className="game-card pro" onClick={() => onJoin('high')}>
                <div className="card-top">
                   <span className="badge gold">VIP</span>
                   <div className="icon">👑</div>
                </div>
                <div className="card-bottom">
                   <h3>High Roller</h3>
                   <div className="details">
                      <span>Entry: $1.00</span>
                      <span style={{color:'#fde68a'}}>Jackpot +$0.95</span>
                   </div>
                </div>
             </div>
          </div>

          <div className="live-stats">
             <div className="stat-pill">🟢 {connectedUsers} Players Online</div>
             <div className="stat-pill">🔒 Provably Fair</div>
          </div>
      </div>

      {/* 3. FIXED BOTTOM NAVIGATION BAR */}
      <div className="bottom-nav">
         <div className="nav-item active">
            <span className="nav-icon">🏠</span>
            <span className="nav-label">Lobby</span>
         </div>
         <div className="nav-item" onClick={onOpenDeposit}>
            <span className="nav-icon">👛</span>
            <span className="nav-label">Wallet</span>
         </div>
         <div className="nav-item big-play" onClick={() => onJoin('low')}>
            <span className="play-icon">▶</span>
         </div>
         <div className="nav-item">
            <span className="nav-icon">💬</span>
            <span className="nav-label">Chat</span>
         </div>
         <div className="nav-item" onClick={onOpenMenu}>
            <span className="nav-icon">☰</span>
            <span className="nav-label">Menu</span>
         </div>
      </div>

      <style>{`
        /* LAYOUT */
        .lobby-container { 
            width: 100%; height: 100vh; background: #18191d; color: white; 
            display: flex; flex-direction: column; overflow: hidden;
        }

        /* HEADER */
        .app-header {
            padding: 15px 20px; display: flex; justify-content: space-between; align-items: center;
            background: #24262b; box-shadow: 0 4px 10px rgba(0,0,0,0.3); z-index: 10;
        }
        .user-pill { display: flex; align-items: center; gap: 8px; cursor: pointer; }
        .avatar-small { width: 32px; height: 32px; background: #fbbf24; border-radius: 50%; display: flex; alignItems: center; justify-content: center; font-weight: bold; color: black; }
        .username { font-size: 14px; font-weight: 700; }
        
        .wallet-btn { 
            background: #2d3035; padding: 6px 12px; border-radius: 20px; display: flex; align-items: center; gap: 8px; cursor: pointer; border: 1px solid #fbbf24; 
        }
        .balance { font-weight: 800; font-size: 14px; color: white; }
        .plus-btn { background: #fbbf24; width: 20px; height: 20px; border-radius: 50%; display: flex; alignItems: center; justify-content: center; font-size: 14px; color: black; font-weight: bold; }

        /* SCROLL AREA */
        .lobby-scroll-area { flex: 1; overflow-y: auto; padding: 20px; padding-bottom: 90px; }
        
        .promo-banner {
            background: linear-gradient(135deg, #1e293b, #0f172a); border: 1px solid #334155; padding: 20px; border-radius: 16px; margin-bottom: 25px; text-align: center; box-shadow: 0 5px 15px rgba(0,0,0,0.5);
        }
        .promo-banner h3 { margin: 0; font-size: 24px; font-weight: 900; letter-spacing: 1px; color: white; }
        .promo-banner p { margin: 5px 0 0 0; font-size: 12px; opacity: 0.8; color: #94a3b8; }

        .section-title { font-size: 14px; font-weight: 800; color: #98a7b5; margin-bottom: 15px; letter-spacing: 1px; }

        /* HORIZONTAL SCROLL */
        .horizontal-scroll { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 10px; }
        .win-card { min-width: 120px; background: #24262b; padding: 10px; border-radius: 12px; display: flex; flex-direction: column; align-items: center; }
        .win-user { font-size: 10px; color: #98a7b5; }
        .win-amt { font-size: 14px; font-weight: 800; }
        .text-green { color: #3bc117; }
        .text-gold { color: #fbbf24; }

        /* GRID LAYOUT */
        .game-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        
        .game-card { 
            border-radius: 16px; padding: 15px; cursor: pointer; height: 160px; display: flex; flex-direction: column; justify-content: space-between; position: relative; overflow: hidden; transition: transform 0.1s;
        }
        .game-card:active { transform: scale(0.96); }
        
        .novice { background: linear-gradient(135deg, #059669, #10b981); box-shadow: 0 5px 15px rgba(16, 185, 129, 0.3); }
        .pro { background: linear-gradient(135deg, #7c3aed, #d946ef); box-shadow: 0 5px 15px rgba(217, 70, 239, 0.3); }

        .card-top { display: flex; justify-content: space-between; align-items: flex-start; }
        .badge { font-size: 9px; font-weight: 900; background: rgba(0,0,0,0.3); padding: 3px 6px; border-radius: 4px; }
        .badge.gold { background: #fbbf24; color: black; }
        .icon { font-size: 32px; filter: drop-shadow(0 2px 5px rgba(0,0,0,0.3)); }

        .card-bottom h3 { margin: 0; font-size: 16px; font-weight: 800; }
        .details { margin-top: 5px; font-size: 10px; display: flex; flex-direction: column; font-weight: 600; opacity: 0.9; }

        .live-stats { display: flex; justify-content: center; gap: 10px; margin-top: 30px; }
        .stat-pill { background: #24262b; padding: 6px 12px; border-radius: 20px; font-size: 10px; color: #676d7c; font-weight: bold; }

        /* BOTTOM NAV */
        .bottom-nav {
            position: fixed; bottom: 0; left: 0; width: 100%; height: 70px; background: #24262b; border-top: 1px solid #2d3035; display: flex; justify-content: space-around; align-items: center; z-index: 20; padding-bottom: 10px; box-sizing: border-box;
        }
        .nav-item { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 20%; cursor: pointer; color: #676d7c; transition: 0.2s; }
        .nav-item.active { color: #fbbf24; }
        .nav-icon { font-size: 20px; margin-bottom: 4px; }
        .nav-label { font-size: 10px; font-weight: 600; }
        
        .big-play { position: relative; top: -15px; }
        .play-icon { width: 50px; height: 50px; background: #fbbf24; border-radius: 50%; display: flex; alignItems: center; justify-content: center; font-size: 20px; color: black; box-shadow: 0 5px 15px rgba(251, 191, 36, 0.4); border: 4px solid #18191d; }

        .fade-in { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
      `}</style>
    </div>
  );
};

export default Lobby;
