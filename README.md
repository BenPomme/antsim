# Ant Colony Simulator

![Deploy to GitHub Pages](https://github.com/BenPomme/antsim/actions/workflows/gh-pages-deploy.yml/badge.svg)

An interactive 3D ant colony simulator built with React, Three.js, and React Three Fiber.

![Ant Colony Simulator Screenshot](./screenshot.png)

## Play Online

You can play the game online at: [https://benpomme.github.io/antsim/](https://benpomme.github.io/antsim/)

## Features

- Control your own ant character and navigate a detailed 3D environment
- Manage your ant colony by collecting resources and increasing its size
- Worker ants automatically gather food and materials from the environment
- Battle against enemy ant colonies
- Upgrade your colony to unlock new abilities
- Detailed environment with procedural textures, grass, rocks, and more

## Controls

- **W/S**: Move forward/backward
- **A/D**: Rotate left/right
- **E**: Collect resources
- **Space**: Add new ant to colony
- **F**: Attack

## Development

To run the project locally:

```bash
# Clone the repository
git clone https://github.com/BenPomme/antsim.git
cd antsim

# Install dependencies
npm install

# Start the development server
npm run dev
```

The development server will start at http://localhost:5173/antsim/

## Deployment

The project is automatically deployed to GitHub Pages when changes are pushed to the main branch. The deployment workflow is defined in `.github/workflows/gh-pages-deploy.yml`.

## Technologies Used

- React
- Three.js
- React Three Fiber
- React Three Drei
- Zustand for state management
- TypeScript
- Vite

## License

MIT
