import { useEffect, useState } from 'react';
import { useStore } from '../store/gameStore';
import { Resource } from '../store/gameStore';
import Player from './Player';
import ResourceComponent from './Resource';
import AntColony from './AntColony';
import Ground from './Ground';

export default function Game() {
  const { increaseColonySize, colonySize } = useStore();
  const [gameResources, setGameResources] = useState<Resource[]>([]);

  useEffect(() => {
    // Generate starting resources
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * 15 + 5;
      const position: [number, number, number] = [
        Math.cos(angle) * distance,
        0,
        Math.sin(angle) * distance
      ];
      
      const resource: Resource = {
        id: `resource-${i}`,
        position,
        type: Math.random() > 0.5 ? 'food' : 'material',
        value: Math.floor(Math.random() * 10) + 1
      };
      
      setGameResources(prev => [...prev, resource]);
    }

    // Add some ants to start
    for (let i = 0; i < 5; i++) {
      increaseColonySize();
    }

    // Spawn new resources and enemy ants periodically
    const spawnInterval = setInterval(() => {
      // Spawn new resources
      if (Math.random() < 0.7) {
        generateNewResource();
      }
    }, 5000);

    return () => clearInterval(spawnInterval);
  }, [increaseColonySize]);

  // Generate new resources
  const generateNewResource = () => {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * 15 + 5;
    const position: [number, number, number] = [
      Math.cos(angle) * distance,
      0,
      Math.sin(angle) * distance
    ];
    
    const resource: Resource = {
      id: `resource-${Date.now()}`,
      position,
      type: Math.random() > 0.5 ? 'food' : 'material',
      value: Math.floor(Math.random() * 10) + 1
    };
    
    setGameResources(prev => [...prev, resource]);
  };

  return (
    <>
      <Ground />
      <Player />
      {gameResources.map(resource => (
        <ResourceComponent key={resource.id} resource={resource} />
      ))}
      <AntColony colony={{
        id: 'player-colony',
        position: [0, 0, 0],
        size: colonySize,
        level: 1,
        relation: 'neutral'
      }} isPlayerColony />
    </>
  );
} 