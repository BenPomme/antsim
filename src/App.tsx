import { Canvas } from '@react-three/fiber';
import { KeyboardControls, Stars } from '@react-three/drei';
import { Physics } from '@react-three/cannon';
import { Suspense, useState } from 'react';
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

function App() {
  const [gameStarted, setGameStarted] = useState(false);

  return (
    <div className="app">
      {!gameStarted ? (
        <div className="start-menu">
          <h1>Ant Colony Simulator</h1>
          <p>Build your colony, fight enemy ants, and survive in a vast world</p>
          <button onClick={() => setGameStarted(true)}>Start Game</button>
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
              
              {/* Fog for better depth perception */}
              <fog attach="fog" args={['#b9d5ff', 0, 300]} />
              
              {/* Background stars */}
              <Stars radius={300} depth={50} count={1000} factor={4} />
              
              <Suspense fallback={null}>
                <Physics gravity={[0, -30, 0]}>
                  <Game />
                </Physics>
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
