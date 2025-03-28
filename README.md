# Ant Colony Simulator

An interactive 3D ant colony simulator built with React, Three.js, and React Three Fiber.

![Ant Colony Simulator Screenshot](./screenshot.png)

## Play Online

You can play the game online at: [https://benpomme.github.io/antsim/](https://benpomme.github.io/antsim/)

## Features

- Control your ant in a 3D environment
- Manage and grow your colony
- Collect resources to expand
- Fight enemy ants with adaptive AI
- Radar system to navigate the world
- Multiple controllable ants
- Enemy ants with self-learning behavior

## Controls

- **W/Up Arrow**: Move Forward
- **S/Down Arrow**: Move Backward
- **A/Left Arrow**: Turn Left
- **D/Right Arrow**: Turn Right
- **Space**: Jump (once until landing)
- **F**: Attack enemy ants
- **E**: Collect resources
- **U**: Upgrade colony (costs 50 food)
- **C**: Add new ant to colony (costs 5 food)
- **1-9**: Switch between different ants
- **Tab**: Show/Hide controls

## Development

### Installation

```bash
# Clone the repository
git clone https://github.com/BenPomme/antsim.git
cd antsim

# Install dependencies
npm install

# Start development server
npm run dev
```

### Build

```bash
npm run build
```

## Technologies Used

- React
- TypeScript
- Three.js
- React Three Fiber
- React Three Drei
- React Three Cannon (Physics)
- Zustand (State Management)
- Vite (Build Tool)

## License

MIT
