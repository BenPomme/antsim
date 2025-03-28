import { useEffect, useState, useRef } from 'react';
import { useStore } from '../store/gameStore';

// Radar configuration
const RADAR_SIZE = 200;
const RADAR_RANGE = 100; // How far the radar can "see" in game units

const UIOverlay = () => {
  const { 
    health, 
    food, 
    colonySize, 
    colonyLevel, 
    enemiesDefeated,
    colonies,
  } = useStore();
  
  // Get player position from store
  const playerPosition = useStore(state => state.playerPosition);
  
  // Canvas ref for radar
  const radarCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const [showControls, setShowControls] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [canUpgrade, setCanUpgrade] = useState(false);
  
  // Show controls on Tab key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        setShowControls(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  // Check if colony can be upgraded
  useEffect(() => {
    setCanUpgrade(enemiesDefeated >= colonyLevel * 3 && food >= 50);
  }, [enemiesDefeated, colonyLevel, food]);
  
  // Show temporary messages
  const showTemporaryMessage = (msg: string, duration = 3000) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), duration);
  };
  
  // Handle upgrade and growth key presses
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyU') {
        if (canUpgrade) {
          showTemporaryMessage(`Colony upgraded to level ${colonyLevel + 1}!`);
        } else {
          showTemporaryMessage(`Cannot upgrade yet. Need more food and to defeat ${colonyLevel * 3 - enemiesDefeated} more enemies.`);
        }
      } else if (e.code === 'KeyC') {
        if (food >= 5) {
          showTemporaryMessage(`Added a new ant to the colony!`);
        } else {
          showTemporaryMessage(`Not enough food to add more ants. Need 5 food.`);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUpgrade, colonyLevel, enemiesDefeated, food]);
  
  // Draw the radar map
  useEffect(() => {
    const canvas = radarCanvasRef.current;
    if (!canvas || !playerPosition) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, RADAR_SIZE, RADAR_SIZE);
    
    // Draw radar background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.beginPath();
    ctx.arc(RADAR_SIZE/2, RADAR_SIZE/2, RADAR_SIZE/2, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw radar grid
    ctx.strokeStyle = 'rgba(50, 255, 50, 0.3)';
    ctx.lineWidth = 1;
    
    // Draw circles
    for (let r = 1; r <= 3; r++) {
      const radius = (RADAR_SIZE/2) * (r/3);
      ctx.beginPath();
      ctx.arc(RADAR_SIZE/2, RADAR_SIZE/2, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    // Draw cross
    ctx.beginPath();
    ctx.moveTo(RADAR_SIZE/2, 0);
    ctx.lineTo(RADAR_SIZE/2, RADAR_SIZE);
    ctx.moveTo(0, RADAR_SIZE/2);
    ctx.lineTo(RADAR_SIZE, RADAR_SIZE/2);
    ctx.stroke();
    
    // Draw player's own colony at center (always at [0,0,0])
    const centerX = RADAR_SIZE/2;
    const centerY = RADAR_SIZE/2;
    
    ctx.fillStyle = '#ff9900';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 7, 0, Math.PI * 2);
    ctx.fill();
    
    // Calculate player position on radar
    const playerX = centerX + (playerPosition[0] / RADAR_RANGE) * (RADAR_SIZE/2);
    const playerY = centerY + (playerPosition[2] / RADAR_RANGE) * (RADAR_SIZE/2);
    
    // Draw player (ant) on radar
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(playerX, playerY, 4, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw other colonies on radar
    if (colonies) {
      colonies.forEach(colony => {
        if (colony.id === 'player-colony') return; // Skip player colony
        
        // Calculate distance to see if it's in radar range
        const dx = colony.position[0] - playerPosition[0];
        const dz = colony.position[2] - playerPosition[2]; 
        const distance = Math.sqrt(dx*dx + dz*dz);
        
        if (distance <= RADAR_RANGE) {
          // Convert colony position to radar coordinates
          const colonyX = centerX + (dx / RADAR_RANGE) * (RADAR_SIZE/2);
          const colonyY = centerY + (dz / RADAR_RANGE) * (RADAR_SIZE/2);
          
          // Choose color based on colony relation
          let colonyColor;
          switch(colony.relation) {
            case 'ally': colonyColor = '#33ff33'; break;
            case 'enemy': colonyColor = '#ff3333'; break;
            default: colonyColor = '#cccccc'; break;
          }
          
          // Draw colony on radar
          ctx.fillStyle = colonyColor;
          ctx.beginPath();
          ctx.arc(colonyX, colonyY, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }
    
    // Draw enemy ants as small red dots
    const enemyAnts = useStore.getState().enemyAnts || [];
    
    enemyAnts.forEach(ant => {
      if (!ant.position) return;
      
      // Calculate distance to see if it's in radar range
      const dx = ant.position[0] - playerPosition[0];
      const dz = ant.position[2] - playerPosition[2]; 
      const distance = Math.sqrt(dx*dx + dz*dz);
      
      if (distance <= RADAR_RANGE) {
        // Convert ant position to radar coordinates
        const antX = centerX + (dx / RADAR_RANGE) * (RADAR_SIZE/2);
        const antY = centerY + (dz / RADAR_RANGE) * (RADAR_SIZE/2);
        
        // Draw enemy ant on radar
        ctx.fillStyle = '#ff3333';
        ctx.beginPath();
        ctx.arc(antX, antY, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    
    // Draw resources on radar
    const resources = useStore.getState().resources || [];
    
    resources.forEach(resource => {
      if (!resource.position) return;
      
      // Calculate distance to see if it's in radar range
      const dx = resource.position[0] - playerPosition[0];
      const dz = resource.position[2] - playerPosition[2]; 
      const distance = Math.sqrt(dx*dx + dz*dz);
      
      if (distance <= RADAR_RANGE) {
        // Convert resource position to radar coordinates
        const resourceX = centerX + (dx / RADAR_RANGE) * (RADAR_SIZE/2);
        const resourceY = centerY + (dz / RADAR_RANGE) * (RADAR_SIZE/2);
        
        // Draw resource on radar (green for food, blue for material)
        ctx.fillStyle = resource.type === 'food' ? '#44ff44' : '#4444ff';
        ctx.beginPath();
        ctx.arc(resourceX, resourceY, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    
  }, [playerPosition, colonies]);

  return (
    <div className="ui-container">
      <div className="game-hud">
        <div className="resource-bar">
          <span>Health:</span>
          <div className="health-bar">
            <div style={{ width: `${health}%` }}></div>
          </div>
        </div>
        <div className="resource-bar">
          <span>Food:</span>
          <div className="food-bar">
            <div style={{ width: `${food}%` }}></div>
          </div>
        </div>
      </div>

      <div className="colony-stats">
        <p>Colony Level: {colonyLevel}</p>
        <p>Colony Size: {colonySize} ants</p>
        <p>Enemies Defeated: {enemiesDefeated}</p>
        {canUpgrade && (
          <p className="upgrade-ready">Colony upgrade available! Press 'U'</p>
        )}
      </div>
      
      {message && (
        <div className="message-popup">
          {message}
        </div>
      )}

      <div className="minimap">
        <canvas 
          ref={radarCanvasRef} 
          width={RADAR_SIZE} 
          height={RADAR_SIZE}
        />
      </div>

      {showControls && (
        <div className="controls-panel">
          <h3>Controls:</h3>
          <p>W / Up Arrow - Move Forward</p>
          <p>S / Down Arrow - Move Backward</p>
          <p>A / Left Arrow - Turn Left</p>
          <p>D / Right Arrow - Turn Right</p>
          <p>Space - Jump (only once until landing)</p>
          <p>F - Attack</p>
          <p>E - Collect resources</p>
          <p>U - Upgrade colony (costs 50 food)</p>
          <p>C - Add ant to colony (costs 5 food)</p>
          <p>1-9 - Switch between ants</p>
          <p>Tab - Show/Hide controls</p>
        </div>
      )}
      
      {!showControls && (
        <div className="initial-instructions">
          Third-person controls: WASD to move, A/D to turn. Press Tab for more info.
        </div>
      )}
    </div>
  );
};

export default UIOverlay; 