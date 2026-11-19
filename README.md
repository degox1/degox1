# Dennis — Personal Website

A single-page personal website featuring interactive neural-network artwork, an in-browser digit recognition experiment, A* / Dijkstra pathfinding, and a link to GitHub.

## Run locally

The JavaScript uses ordinary browser scripts, so the grid can also initialize when the HTML file is opened directly. A local HTTP server is still recommended for development.

```bash
python -m http.server 8000
```

Then visit http://localhost:8000 . VS Code Live Server also works.

## GitHub link

The contact section links to https://github.com/DeGoX1. No form service or backend is needed.

## Digit-recognition experiment

The digit recognizer uses a lightweight **k-nearest neighbours (k-NN)** machine-learning classifier with locally generated digit samples. It requires no model download or TensorFlow.js, works offline, and is ready almost immediately. It is **not** a neural network or an MNIST-trained handwriting recognizer. Handwritten accuracy can be limited; the prediction scores are similarity votes, not calibrated probabilities.

The animated neural network in the hero remains a visual interactive effect.

Tailwind's browser CDN still requires an internet connection to display its utility styling. The Tailwind browser version is meant for development, not production.

## Files

- `index.html`: page markup and Tailwind browser integration
- `style.css`: custom theme and layout
- `assets/js/network.js`: animated neural network backdrop
- `assets/js/recognition.js`: offline k-NN classification and drawing canvas
- `assets/js/pathfinding.js`: interactive A* and Dijkstra grid
- `assets/js/main.js`: initialization
