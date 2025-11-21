
# Hosting Aventura Gramatical on Raspberry Pi

This project is a React application configured with Vite. It is designed to be lightweight and easily hosted on a Raspberry Pi.

## 1. Prerequisites on Raspberry Pi

Open your terminal on the Pi and ensure Node.js is installed:

```bash
node -v
npm -v
```

If not installed:
```bash
sudo apt update
sudo apt install nodejs npm
```

## 2. Transfer Files
Copy all project files (including `package.json`, `vite.config.ts`, `index.html`, etc.) to your Raspberry Pi folder (e.g., `~/aventura-gramatical`).

## 3. Environment Configuration
Create a `.env` file in the root directory of your project to safely store your Gemini API Key.

```bash
nano .env
```

Add the following line (replace with your actual key):
```
API_KEY=your_actual_gemini_api_key_here
```
*Note: The build process is configured to inject this key into the application.*

## 4. Installation & Build
Navigate to the project folder and run:

```bash
npm install
npm run build
```

This will create a `dist` folder containing the optimized static website.

## 5. Serve the App
You need a lightweight web server to serve the static files.

```bash
sudo npm install -g serve
```

Serve the build folder on port 3000 (or any port you like):

```bash
serve -s dist -l 3000
```

## 6. Accessing the Game
Now you can access the game from other devices on your local network:
`http://<RASPBERRY_PI_IP>:3000`

## 7. Offline/Assets
The application uses remote images from Unsplash. Ensure your Raspberry Pi has an internet connection to load these assets initially. The browser will cache them for subsequent visits.
