# MetalLens: Band & Album Identifier

Point your camera at an unreadable metal band logo or an album cover, and MetalLens tells you who it is.

**Live demo:** [metalidentifier.vercel.app](https://metalidentifier.vercel.app/)

## Why I built this

Extreme metal logos are famously hard to read: spiky, symmetrical, and often more art than text. Regular image search and text recognition usually fail on them. I wanted to see whether a multimodal AI model, combined with live web search, could do what fans usually do by hand: guess candidates, then check them against Metal Archives and Discogs.

## How it works

1. Take a photo with your camera, or upload one.
2. Google Gemini reads the image, generates several candidate bands or albums from the logo shapes or cover art, and checks each one with Google Search against sources such as Metal Archives and Discogs.
3. It returns a match only when the evidence is strong. Otherwise it says it is not sure rather than guessing.
4. The result includes the band or album, background on its history and subgenre, and links to the web sources it used.

## Features

- Camera capture and image upload
- Search-grounded identification with cited web sources
- Lookup history saved on your device
- Daily limit of 10 lookups per device to control API costs

## Tech stack

React, TypeScript, Vite · Vercel serverless function · Google Gemini API with Google Search grounding · Browser local storage for history

The Gemini API key stays on the server: the browser sends the photo to `api/identify`, which calls Gemini and returns the result.

## Run locally

Prerequisites: Node.js and a Gemini API key.

1. Install dependencies: `npm install`
2. Create a `.env.local` file containing `GEMINI_API_KEY=your-key`
3. Start the app with the Vercel CLI so the server function runs too: `npx vercel dev`

When deploying, set `GEMINI_API_KEY` in the Vercel project's environment variables. Never prefix it with `VITE_`.

## Author

Built by [Allison Dai](https://www.linkedin.com/in/allison-weijia-d-966055154).
