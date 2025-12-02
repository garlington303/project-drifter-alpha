import React, { useEffect, useRef } from 'react';
import { InputManager } from '../game/InputManager';
import { Player } from '../game/Player';
import { World } from '../game/World';
import { Renderer } from '../game/Renderer';
import { AIM_DEADZONE, STAMINA_MAX, MANA_MAX } from '../game/constants';

interface GameCanvasProps {
  isPaused: boolean;
  zoomLevel: number;
  shakeIntensity: number;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ isPaused, zoomLevel, shakeIntensity }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const previousTimeRef = useRef<number>(0);

  // Game Systems Refs
  const inputRef = useRef<InputManager>(null!); 
  const playerRef = useRef<Player>(null!);
  const worldRef = useRef<World>(null!);
  const rendererRef = useRef<Renderer>(null!);

  // Sync props to ref to avoid stale closures in the game loop
  const settingsRef = useRef({ isPaused, zoomLevel, shakeIntensity });
  useEffect(() => {
    settingsRef.current = { isPaused, zoomLevel, shakeIntensity };
  }, [isPaused, zoomLevel, shakeIntensity]);

  const animate = (time: number) => {
    if (previousTimeRef.current === undefined) {
      previousTimeRef.current = time;
    }
    const deltaTime = (time - previousTimeRef.current) / 1000;
    previousTimeRef.current = time;

    const safeDelta = Math.min(deltaTime, 0.1);
    
    // Read latest settings from ref
    const currentSettings = settingsRef.current;

    // 1. Get Input
    const inputState = inputRef.current.getState();

    let shakeOffset = { x: 0, y: 0, angle: 0 };
    
    if (worldRef.current) {
        // Calculate Aim
        if (canvasRef.current && rendererRef.current) {
            const centerX = rendererRef.current.width / 2;
            const centerY = rendererRef.current.height / 2;
            
            const dx = inputState.mouseX - centerX;
            const dy = inputState.mouseY - centerY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            // Use current zoom level for aim calculation
            playerRef.current.aimDistance = dist / currentSettings.zoomLevel;

            if (!currentSettings.isPaused && dist > AIM_DEADZONE) {
                const angle = Math.atan2(dy, dx);
                playerRef.current.targetRotation = angle;
            }
        }

        if (!currentSettings.isPaused) {
            if (worldRef.current.hitStopTimer > 0) {
                worldRef.current.hitStopTimer -= safeDelta;
                shakeOffset = worldRef.current.cameraShake.update(safeDelta);
            } else {
                playerRef.current.update(safeDelta, inputState, worldRef.current);
                worldRef.current.update(playerRef.current.position, safeDelta);
                shakeOffset = worldRef.current.cameraShake.update(safeDelta);
            }
        } else {
             shakeOffset = worldRef.current.cameraShake.update(0); 
        }
    }

    // Apply Settings Multiplier to Shake
    shakeOffset.x *= currentSettings.shakeIntensity;
    shakeOffset.y *= currentSettings.shakeIntensity;
    shakeOffset.angle *= currentSettings.shakeIntensity;

    // 3. Render
    if (canvasRef.current && rendererRef.current) {
      rendererRef.current.draw(
        worldRef.current, 
        playerRef.current, 
        inputState.mouseX, 
        inputState.mouseY,
        time, 
        shakeOffset,
        currentSettings.zoomLevel // Pass latest zoom
      );
    }

    // 4. UI
    updateUI(playerRef.current, worldRef.current);

    requestRef.current = requestAnimationFrame(animate);
  };

  const updateUI = (player: Player, world: World) => {
    const elCoords = document.getElementById('debug-coords');
    if (elCoords) elCoords.innerText = `Pos: ${player.position.x.toFixed(1)}, ${player.position.y.toFixed(1)}`;
    
    const elFloor = document.getElementById('debug-floor');
    if (elFloor) elFloor.innerText = world.currentMap === 'overworld' ? 'OVERWORLD' : 'ROOFTOP CITY';

    const elHealthBar = document.getElementById('ui-health-bar');
    const elHealthVal = document.getElementById('ui-health-val');
    if (elHealthBar) {
        const pct = (player.health / player.maxHealth) * 100;
        elHealthBar.style.width = `${pct}%`;
    }
    if (elHealthVal) {
        elHealthVal.innerText = `${Math.ceil(player.health)}/${player.maxHealth}`;
    }
    
    const elStaminaBar = document.getElementById('ui-stamina-bar');
    const elStaminaVal = document.getElementById('ui-stamina-val');
    if (elStaminaBar) {
        const pct = (player.stamina / STAMINA_MAX) * 100;
        elStaminaBar.style.width = `${pct}%`;
        elStaminaBar.style.backgroundColor = player.stamina <= 0 ? '#94a3b8' : '';
    }
    if (elStaminaVal) {
        elStaminaVal.innerText = `${Math.floor(player.stamina)}/${STAMINA_MAX}`;
    }

    const elManaBar = document.getElementById('ui-mana-bar');
    const elManaVal = document.getElementById('ui-mana-val');
    if (elManaBar) {
        const pct = (player.mana / MANA_MAX) * 100;
        elManaBar.style.width = `${pct}%`;
    }
    if (elManaVal) {
        elManaVal.innerText = `${Math.floor(player.mana)}/${MANA_MAX}`;
    }
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    inputRef.current = new InputManager();
    playerRef.current = new Player();
    worldRef.current = new World();
    
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) throw new Error("Could not get 2D context");
    
    canvasRef.current.width = window.innerWidth;
    canvasRef.current.height = window.innerHeight;
    
    rendererRef.current = new Renderer(ctx, window.innerWidth, window.innerHeight);

    playerRef.current.position = { ...worldRef.current.spawnPosition };

    const handleResize = () => {
      if (canvasRef.current && rendererRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
        rendererRef.current.resize(window.innerWidth, window.innerHeight);
      }
    };
    window.addEventListener('resize', handleResize);

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(requestRef.current);
      window.removeEventListener('resize', handleResize);
      if (inputRef.current) inputRef.current.cleanup();
    };
  }, []); // Keeps empty dependency array to prevent game reset

  return (
    <canvas 
      ref={canvasRef} 
      className="block w-full h-full cursor-none outline-none"
    />
  );
};

export default GameCanvas;