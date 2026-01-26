import React from 'react';

const Lobby = ({ user, onJoin, onLogout, connectedUsers, onOpenHelp, onOpenMenu, onOpenProfile, onOpenDeposit }) => {
  return (
    <div className="lobby-container fade-in">
      
      {/* 1. HEADER (Aligned) */}
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

      {/* 2. SCROLLABLE CONTENT */}
      <div className="lobby-scroll-area">
          
          {/* BANNER */}
          <div className="promo-banner">
             <div className="promo-content">
                 <div className="promo-tag">EXCLUSIVE</div>
                 <h3>DEPOSIT BONUS</h3>
                 <h1>240% BONUS</h1>
                 <button className="promo-btn" onClick={onOpenDeposit}>DEPOSIT NOW</button>
             </div>
             <div className="promo-dots">
                 <span className="dot active"></span><span className="dot"></span><span className="dot"></span>
             </div>
          </div>

          {/* CONTINUE PLAYING (Horizontal) */}
          <div className="section-header">
             <span>Continue Playing</span>
             <span className="see-all">All</span>
          </div>
          <div className="horizontal-scroll">
             <div className="game-icon-card" onClick={() => onJoin('low')}>
                <div className="icon-img green-grad">🛡️</div>
                <div className="icon-name">Novice</div>
                <div className="icon-players">👤 {connectedUsers}</div>
             </div>
             <div className="game-icon-card" onClick={() => onJoin('high')}>
                <div className="icon-img purple-grad">👑</div>
                <div className="icon-name">High Roller</div>
                <div className="icon-players">👤 {connectedUsers}</div>
             </div>
          </div>

          {/* RECENT BIG WINS (Ticker) */}
          <div className="section-header">
             <span style={{color:'#3bc117'}}>● Recent Big Wins</span>
          </div>
          <div className="wins-ticker">
             <div className="win-item">
                 <div className="win-img">🦄</div>
                 <div className="win-info"><span className="win-u">User88</span><span className="win-a text-green">+$450.00</span></div>
             </div>
             <div className="win-item">
                 <div className="win-img">🦁</div>
                 <div className="win-info"><span className="win-u">CryptoKing</span><span className="win-a text-gold">+$1,200.00</span></div>
             </div>
             <div className="win-item">
                 <div className="win-img">🦊</div>
                 <div className="win-info"><span className="win-u">Alex_99</span><span className="win-a text-green">+$320.00</span></div>
             </div>
          </div>

          {/* MAIN GAME GRID */}
          <div className="section-header">
             <span>BidBlaze Originals</span>
             <span className="see-all">All</span>
          </div>
          <div className="game-grid">
             {/* NOVICE */}
             <div className="poster-card novice-bg" onClick={() => onJoin('low')}>
                <div className="poster-content">
                    <div className="poster-icon">🛡️</div>
                    <div className="poster-title">NOVICE</div>
                    <div className="poster-sub">Jackpot +$0.095</div>
                </div>
                <div className="poster-players">👤 {connectedUsers}</div>
             </div>

             {/* HIGH ROLLER */}
             <div className="poster-card pro-bg" onClick={() => onJoin('high')}>
                <div className="poster-content">
                    <div className="poster-icon">👑</div>
                    <div className="poster-title">HIGH ROLLER</div>
                    <div className="poster-sub">Jackpot +$0.95</div>
                </div>
                <div className="poster-players">👤 {connectedUsers}</div>
             </div>
          </div>

      </div>

      {/* 3. BOTTOM NAV (Fixed) */}
      <div className="bottom-nav">
         <div className="nav-item active">
            <span className="nav-icon">🏠</span>
            <span className="nav-label">Home</span>
         </div>
         <div className="nav-item" onClick={onOpenDeposit}>
            <span className="nav-icon">👛</span>
            <span className="nav-label">Wallet</span>
         </div>
         <div className="nav-item big-play" onClick={() => onJoin('low')}>
            <div className="play-circle">▶</div>
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
        .lobby-container { width: 100%; height: 100vh; background: #17181b; color: white; display: flex; flex-direction: column; overflow: hidden; font-family: 'Outfit', sans-serif; }
        
        .app-header { padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; background: #1e2024; z-index: 10; height: 60px; box-sizing: border-box; box-shadow: 0 4px 10px rgba(0,0,0,0.3); }
        .user-pill { display: flex; align-items: center; gap: 8px; cursor: pointer; }
        .avatar-small { width: 32px; height: 32px; background: #3bc117; border-radius: 50%; display: flex; alignItems: center; justify-content: center; font-weight: bold; color: black; }
        .username { font-size: 14px; font-weight: 700; }
        .wallet-btn { background: #2d3035; padding: 6px 12px; border-radius: 20px; display: flex; align-items: center; gap: 8px; cursor: pointer; border: 1px solid #3bc117; }
        .balance { font-weight: 800; font-size: 13px; color: white; }
        .plus-btn { background: #3bc117; width: 18px; height: 18px; border-radius: 50%; display: flex; alignItems: center; justify-content: center; font-size: 12px; color: black; font-weight: bold; }

        .lobby-scroll-area { flex: 1; overflow-y: auto; padding: 20px; padding-bottom: 90px; }
        
        .promo-banner { background: linear-gradient(135deg, #1e2024, #17181b); border: 1px solid #333; padding: 20px; border-radius: 12px; margin-bottom: 25px; position: relative; overflow: hidden; height: 140px; display: flex; flex-direction: column; justify-content: center; align-items: flex-start; }
        .promo-content { position: relative; z-index: 2; }
        .promo-tag { background: white; color: black; font-size: 9px; font-weight: 900; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-bottom: 8px; }
        .promo-banner h3 { margin: 0; font-size: 12px; color: #98a7b5; font-weight: 700; letter-spacing: 1px; }
        .promo-banner h1 { margin: 5px 0 15px 0; font-size: 24px; font-weight: 900; color: white; line-height: 1; }
        .promo-btn { background: #3bc117; color: black; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 800; font-size: 11px; cursor: pointer; }
        .promo-dots { position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%); display: flex; gap: 5px; }
        .dot { width: 6px; height: 6px; background: #333; border-radius: 50%; }
        .dot.active { background: #3bc117; width: 12px; border-radius: 6px; }

        .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; font-size: 13px; font-weight: 700; color: white; }
        .see-all { font-size: 11px; color: #98a7b5; background: #24262b; padding: 4px 10px; border-radius: 8px; }

        .horizontal-scroll { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 10px; margin-bottom: 25px; scrollbar-width: none; }
        .game-icon-card { min-width: 100px; background: #24262b; padding: 12px; border-radius: 12px; display: flex; flex-direction: column; align-items: center; cursor: pointer; }
        .icon-img { width: 50px; height: 50px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 24px; margin-bottom: 8px; }
        .green-grad { background: linear-gradient(135deg, #059669, #10b981); }
        .purple-grad { background: linear-gradient(135deg, #7c3aed, #d946ef); }
        .icon-name { font-size: 11px; font-weight: 700; }
        .icon-players { font-size: 9px; color: #676d7c; margin-top: 2px; }

        .wins-ticker { display: flex; gap: 10px; overflow-x: auto; margin-bottom: 25px; padding-bottom: 5px; scrollbar-width: none; }
        .win-item { min-width: 130px; background: #1e2024; padding: 8px; border-radius: 8px; display: flex; align-items: center; gap: 8px; border: 1px solid #2d3035; }
        .win-img { width: 30px; height: 30px; background: #2d3035; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; }
        .win-info { display: flex; flex-direction: column; }
        .win-u { font-size: 9px; color: #98a7b5; }
        .win-a { font-size: 11px; font-weight: 800; }
        .text-green { color: #3bc117; } .text-gold { color: #fbbf24; }

        .game-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .poster-card { height: 160px; border-radius: 12px; padding: 15px; position: relative; display: flex; flex-direction: column; justify-content: space-between; cursor: pointer; overflow: hidden; }
        .novice-bg { background: linear-gradient(180deg, #059669 0%, #000 100%); border-top: 2px solid #10b981; }
        .pro-bg { background: linear-gradient(180deg, #7c3aed 0%, #000 100%); border-top: 2px solid #d946ef; }
        .poster-icon { font-size: 32px; margin-bottom: 10px; filter: drop-shadow(0 5px 15px rgba(0,0,0,0.3)); }
        .poster-title { font-size: 14px; font-weight: 900; letter-spacing: 1px; }
        .poster-sub { font-size: 10px; opacity: 0.8; margin-top: 2px; font-weight: 600; }
        .poster-players { font-size: 9px; color: rgba(255,255,255,0.5); text-align: right; }

        .bottom-nav { position: fixed; bottom: 0; left: 0; width: 100%; height: 70px; background: #1e2024; display: flex; justify-content: space-around; align-items: center; z-index: 20; padding-bottom: 10px; border-top: 1px solid #2d3035; box-sizing: border-box; }
        .nav-item { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 20%; cursor: pointer; color: #676d7c; transition: 0.2s; }
        .nav-item.active { color: white; }
        .nav-icon { font-size: 18px; margin-bottom: 4px; }
        .nav-label { font-size: 9px; font-weight: 600; }
        .big-play { position: relative; top: -20px; }
        .play-circle { width: 55px; height: 55px; background: #3bc117; border-radius: 50%; display: flex; alignItems: center; justify-content: center; font-size: 20px; color: black; box-shadow: 0 10px 25px rgba(59, 193, 23, 0.4); border: 5px solid #17181b; }

        .fade-in { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
      `}</style>
    </div>
  );
};

export default Lobby;
