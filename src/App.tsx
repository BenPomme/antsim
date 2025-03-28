import { Canvas } from '@react-three/fiber';
import { KeyboardControls, Stars, EffectComposer, Bloom, Vignette } from '@react-three/drei';
import { Physics } from '@react-three/cannon';
import { Suspense, useState, useRef } from 'react';
import Game from './components/Game';
import UIOverlay from './components/UIOverlay';
import './App.css';

// Define keyboard controls
const controls = [
  { name: 'forward', keys: ['ArrowUp', 'KeyW'] },
  { name: 'backward', keys: ['ArrowDown', 'KeyS'] },
  { name: 'left', keys: ['ArrowLeft', 'KeyA'] },
  { name: 'right', keys: ['ArrowRight', 'KeyD'] },
  { name: 'jump', keys: ['Space'] },
  { name: 'attack', keys: ['KeyF'] },
  { name: 'collect', keys: ['KeyE'] },
];

// Animated ant for start menu
const AnimatedAnt = () => {
  const antRef = useRef<HTMLDivElement>(null);
  
  return (
    <div 
      ref={antRef} 
      className="animated-ant"
      style={{
        animation: 'float 3s ease-in-out infinite',
      }}
    >
      <div className="ant-head"></div>
      <div className="ant-body"></div>
      <div className="ant-abdomen"></div>
      <div className="ant-legs left-legs">
        <div className="leg"></div>
        <div className="leg"></div>
        <div className="leg"></div>
      </div>
      <div className="ant-legs right-legs">
        <div className="leg"></div>
        <div className="leg"></div>
        <div className="leg"></div>
      </div>
      <div className="ant-antennae">
        <div className="antenna"></div>
        <div className="antenna"></div>
      </div>
    </div>
  );
};

function App() {
  const [gameStarted, setGameStarted] = useState(false);
  const [loading, setLoading] = useState(false);

  const startGame = () => {
    setLoading(true);
    // Simulate loading time
    setTimeout(() => {
      setLoading(false);
      setGameStarted(true);
    }, 1500);
  };

  return (
    <div className="app">
      {!gameStarted ? (
        <div className="start-menu">
          <h1>Ant Colony Simulator</h1>
          <div className="ant-graphic">
            <AnimatedAnt />
          </div>
          <p>Build your colony, fight enemy ants, and survive in a vast world</p>
          <ul className="features">
            <li>🔄 Collect resources to grow your colony</li>
            <li>⚔️ Battle enemy ants and defend your territory</li>
            <li>🌲 Explore a detailed 3D environment</li>
            <li>⬆️ Upgrade your colony for better survival</li>
          </ul>
          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
              <p>Loading ant world...</p>
            </div>
          ) : (
            <button className="start-button" onClick={startGame}>Start Game</button>
          )}
          <div className="controls-guide">
            <h3>Controls:</h3>
            <p>W, A, S, D - Move and turn</p>
            <p>E - Collect resources</p>
            <p>F - Attack</p>
            <p>Space - Add new ant to colony</p>
          </div>
        </div>
      ) : (
        <>
          <KeyboardControls map={controls}>
            <Canvas shadows camera={{ fov: 70, position: [0, 5, 10], near: 0.1, far: 1000 }}>
              {/* Enhanced lighting */}
              <ambientLight intensity={0.4} />
              <directionalLight 
                position={[50, 50, 25]} 
                intensity={1} 
                castShadow 
                shadow-mapSize-width={2048} 
                shadow-mapSize-height={2048}
                shadow-camera-left={-100}
                shadow-camera-right={100}
                shadow-camera-top={100}
                shadow-camera-bottom={-100}
              />
              <directionalLight 
                position={[-10, 10, -10]} 
                intensity={0.5} 
              />
              
              {/* Spot light to highlight player colony */}
              <spotLight
                position={[0, 20, 0]}
                angle={0.3}
                penumbra={0.8}
                intensity={0.8}
                color="#ffcc77"
                castShadow
                shadow-mapSize-width={1024}
                shadow-mapSize-height={1024}
              />
              
              {/* Fog for better depth perception */}
              <fog attach="fog" args={['#b9d5ff', 40, 300]} />
              
              {/* Background stars */}
              <Stars radius={300} depth={50} count={1000} factor={4} />
              
              <Suspense fallback={null}>
                <Physics gravity={[0, -30, 0]}>
                  <Game />
                </Physics>
                
                {/* Post-processing effects */}
                <EffectComposer>
                  <Bloom 
                    luminanceThreshold={0.2} 
                    luminanceSmoothing={0.9} 
                    intensity={0.4} 
                  />
                  <Vignette
                    offset={0.5}
                    darkness={0.5}
                    eskil={false}
                  />
                </EffectComposer>
              </Suspense>
            </Canvas>
          </KeyboardControls>
          <UIOverlay />
        </>
      )}
    </div>
  );
}

export default App;
