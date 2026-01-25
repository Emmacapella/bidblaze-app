import { useState, useEffect, useRef } from 'react';

// This component handles the high-speed millisecond countdown
// without re-rendering the entire game board.
const MilliTimer = ({ targetDate, status, onEnd }) => {
  const [displayTime, setDisplayTime] = useState("0.00");
  const [progress, setProgress] = useState(100);
  const [isUrgent, setIsUrgent] = useState(false);
  
  // Use a ref to track the animation frame ID so we can cancel it
  const requestRef = useRef();

  const calculateTime = () => {
    const now = Date.now();
    const distance = targetDate - now;

    if (status !== 'ACTIVE' || distance <= 0) {
      setDisplayTime("0.00");
      setProgress(0);
      setIsUrgent(false);
      if (distance <= 0 && status === 'ACTIVE' && onEnd) {
        onEnd(); // Trigger parent check
      }
      return;
    }

    // Calculate seconds and milliseconds
    const seconds = Math.floor(distance / 1000);
    const milliseconds = Math.floor((distance % 1000) / 10); // Get first 2 digits of ms

    // Format string: "299.99"
    const formatted = `${seconds}.${milliseconds.toString().padStart(2, '0')}`;
    setDisplayTime(formatted);

    // Calculate progress bar (Based on 5 minutes = 300000ms)
    const percentage = Math.min((distance / 300000) * 100, 100);
    setProgress(percentage);

    // Urgent mode (shake effect) if under 10 seconds
    if (distance < 10000) {
      setIsUrgent(true);
    } else {
      setIsUrgent(false);
    }

    // Loop
    requestRef.current = requestAnimationFrame(calculateTime);
  };

  useEffect(() => {
    // Start the loop
    requestRef.current = requestAnimationFrame(calculateTime);
    return () => cancelAnimationFrame(requestRef.current);
  }, [targetDate, status]);

  return (
    <div className={`reactor-container ${isUrgent ? 'urgent-pulse' : ''}`}>
      {status === 'ACTIVE' && (
        <div className="timer-float" style={{ 
          color: isUrgent ? '#ef4444' : 'white',
          textShadow: isUrgent ? '0 0 15px #ef4444' : '0 0 20px #fbbf24'
        }}>
          {displayTime}
        </div>
      )}
      
      <svg className="progress-ring" width="280" height="280">
        <circle 
          className="ring-bg" 
          stroke="rgba(255,255,255,0.05)" 
          strokeWidth="8" 
          fill="transparent" 
          r="130" cx="140" cy="140" 
        />
        <circle 
          className="ring-progress" 
          stroke={status === 'ENDED' ? '#ef4444' : (isUrgent ? '#ef4444' : "#fbbf24")} 
          strokeWidth="8" 
          strokeDasharray={`${2 * Math.PI * 130} ${2 * Math.PI * 130}`} 
          strokeDashoffset={2 * Math.PI * 130 - (progress / 100) * 2 * Math.PI * 130} 
          r="130" cx="140" cy="140" 
        />
      </svg>
      
      {/* CSS for the shake animation */}
      <style>{`
        .urgent-pulse {
          animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) infinite;
        }
        @keyframes shake {
          10%, 90% { transform: translate3d(-1px, 0, 0); }
          20%, 80% { transform: translate3d(2px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
          40%, 60% { transform: translate3d(4px, 0, 0); }
        }
      `}</style>
    </div>
  );
};

export default MilliTimer;
