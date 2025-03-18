import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';
import { gsap } from 'gsap';

// Define portal position configuration object
const PORTAL_CONFIG = {
    position: {
        x: 0,
        y: 0,
        z: 0
    },
    scale: 1,
    rotationY: Math.PI // Default rotation (180 degrees)
};

const CustomEnvironment = ({ glbPath, hdriPath, onPortalEnter }) => {
    const mountRef = useRef(null);
    const [portalEntered, setPortalEntered] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const loadingOverlayRef = useRef(null);
    const loadingCanvasRef = useRef(null);
    const loadingStartTimeRef = useRef(Date.now());
    const minLoadingTime = 5000; // 5 seconds minimum loading time

    useEffect(() => {
        // Create loading warp tunnel effect identical to portal transition
        if (!loadingCanvasRef.current || !loadingOverlayRef.current) return;

        // Set loading start time reference
        loadingStartTimeRef.current = Date.now();

        const tunnelCanvas = loadingCanvasRef.current;
        tunnelCanvas.width = window.innerWidth;
        tunnelCanvas.height = window.innerHeight;

        const ctx = tunnelCanvas.getContext('2d');

        // Create stars for warp effect
        const warpStars = [];
        for (let i = 0; i < 1000; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = 10 + Math.random() * 490;
            warpStars.push({
                x: Math.cos(angle) * distance,
                y: Math.sin(angle) * distance,
                z: Math.random() * 1000 + 100,
                size: Math.random() * 3 + 2,
                color: `rgb(${155 + Math.random() * 100}, ${155 + Math.random() * 100}, ${255})`
            });
        }

        let speed = 5;

        const centerX = tunnelCanvas.width / 2;
        const centerY = tunnelCanvas.height / 2;

        let warpAnimationId;

        // Warp animation function for loading
        const animateLoadingWarp = () => {
            warpAnimationId = requestAnimationFrame(animateLoadingWarp);

            if (!isLoading && warpAnimationId) {
                cancelAnimationFrame(warpAnimationId);
                return;
            }

            // Speed varies with loading progress
            speed = 5 + Math.min(loadingProgress, 30);

            // Clear canvas with slight motion blur
            ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
            ctx.fillRect(0, 0, tunnelCanvas.width, tunnelCanvas.height);

            // Draw stars
            for (let i = 0; i < warpStars.length; i++) {
                const star = warpStars[i];

                // Move stars closer (simulating forward movement)
                star.z -= speed;

                // Reset stars that get too close
                if (star.z <= 0) {
                    star.z = 1000;
                    const angle = Math.random() * Math.PI * 2;
                    const distance = 10 + Math.random() * 490;
                    star.x = Math.cos(angle) * distance;
                    star.y = Math.sin(angle) * distance;
                }

                // Calculate screen position
                const scale = 600 / star.z;
                const sx = star.x * scale + centerX;
                const sy = star.y * scale + centerY;

                // Calculate streak length based on speed and z position
                const streakLength = speed * scale * 0.2;


                // Draw star as stretched line
                ctx.strokeStyle = star.color;
                ctx.lineWidth = star.size * scale;
                ctx.beginPath();
                ctx.moveTo(sx, sy);

                // Calculate end point for streak - radiating from center
                const dx = sx - centerX;
                const dy = sy - centerY;
                const len = Math.sqrt(dx*dx + dy*dy);
                const streakX = sx - (dx / len) * streakLength;
                const streakY = sy - (dy / len) * streakLength;

                ctx.lineTo(streakX, streakY);
                ctx.stroke();
            }
            // if (loadingProgress > 90) {
            //     const flashIntensity = (loadingProgress - 90) / 10 * 0.7; // 0 to 0.7 opacity
            //     ctx.fillStyle = `rgba(255, 255, 255, ${flashIntensity})`;
            //     ctx.fillRect(0, 0, tunnelCanvas.width, tunnelCanvas.height);
            // }

        };

        // Start warp animation
        animateLoadingWarp();

        return () => {
            if (warpAnimationId) {
                cancelAnimationFrame(warpAnimationId);
            }
        };
    }, [isLoading, loadingProgress]);

    useEffect(() => {
        // Hide cursor immediately when component mounts
        document.body.style.cursor = 'none';

        // Scene setup
        const scene = new THREE.Scene();

        // We'll replace this with the HDRI background later
        scene.background = new THREE.Color(0x87CEEB); // Sky blue background initially

        // Camera
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 0, 10);

        // Create camera collision box for accurate collision detection
        const cameraCollider = new THREE.Box3();
        const cameraSize = new THREE.Vector3(0.5, 0.8, 0.5); // Size of camera collision box

        // Renderer with improved settings
        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: "high-performance"
        });
        renderer.setSize(window.innerWidth, window.innerHeight);

        // Enable shadows
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Enhanced tone mapping for better HDR results
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.5; // Increased from 1.0 for brighter scene
        renderer.outputEncoding = THREE.sRGBEncoding;

        // Add renderer to DOM
        mountRef.current.appendChild(renderer.domElement);

        // Enhanced lighting setup
        // Stronger ambient light to prevent dark shadows
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // Increased from 0.2
        scene.add(ambientLight);

        // Main directional light with shadows
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2); // Increased from 0.5
        directionalLight.position.set(5, 5, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 1024;
        directionalLight.shadow.mapSize.height = 1024;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 30;
        directionalLight.shadow.camera.left = -10;
        directionalLight.shadow.camera.right = 10;
        directionalLight.shadow.camera.top = 10;
        directionalLight.shadow.camera.bottom = -10;
        directionalLight.shadow.bias = -0.001;
        scene.add(directionalLight);

        // Add a secondary fill light from opposite direction
        const fillLight = new THREE.DirectionalLight(0xffffcc, 0.7);
        fillLight.position.set(-5, 3, -5);
        scene.add(fillLight);

        // Add a subtle rim light for depth
        const rimLight = new THREE.DirectionalLight(0xaaccff, 0.5);
        rimLight.position.set(0, -5, -5);
        scene.add(rimLight);

        // Progress manager to track loading
        const manager = new THREE.LoadingManager();
        let assetsLoaded = false;

        manager.onProgress = (url, itemsLoaded, itemsTotal) => {
            const progress = itemsLoaded / itemsTotal * 100;
            setLoadingProgress(progress);
        };

        manager.onLoad = () => {
            // Mark assets as loaded
            assetsLoaded = true;

            // Check if minimum loading time has elapsed
            const elapsedTime = Date.now() - loadingStartTimeRef.current;
            if (elapsedTime >= minLoadingTime) {
                // If minimum time already passed, proceed with fade out
                fadeOutLoading();
            } else {
                // Otherwise wait for the remaining time before fading out
                const remainingTime = minLoadingTime - elapsedTime;
                console.log(`Assets loaded, waiting ${remainingTime}ms more to complete minimum loading time`);

                // Show 100% progress while waiting
                setLoadingProgress(100);

                // Set a timeout to fade out after remaining time
                setTimeout(fadeOutLoading, remainingTime);
            }
        };

        // Function to handle fade out of loading screen
        const fadeOutLoading = () => {
            // Fade out loading overlay
            if (loadingOverlayRef.current) {
                loadingOverlayRef.current.style.opacity = 0;
                setTimeout(() => {
                    setIsLoading(false);
                }, 500);
            } else {
                setIsLoading(false);
            }
        };

        // Simulated loading progress increment for visual smoothness
        // This ensures the progress bar moves even if actual loading is stuck
        const smoothProgressInterval = setInterval(() => {
            if (!assetsLoaded) {
                setLoadingProgress(prev => {
                    // Increment slowly, but never reach 100% until actual loading completes
                    if (prev < 90) {
                        return prev + 0.3;
                    }
                    return prev;
                });
            }
        }, 100);

        // Load HDRI environment map
        const rgbeLoader = new RGBELoader(manager);
        rgbeLoader.setDataType(THREE.FloatType);
        rgbeLoader.load(
            hdriPath,
            (texture) => {
                const pmremGenerator = new THREE.PMREMGenerator(renderer);
                pmremGenerator.compileEquirectangularShader();

                const envMap = pmremGenerator.fromEquirectangular(texture).texture;

                // Set the scene's environment map for reflections
                scene.environment = envMap;

                // Optionally use the HDRI as background too
                scene.background = envMap;

                // Important: dispose of resources to prevent memory leaks
                texture.dispose();
                pmremGenerator.dispose();

                // Update loading progress
                setLoadingProgress(prev => Math.max(prev, 50));
            },
            (xhr) => {
                if (xhr.lengthComputable) {
                    const progress = (xhr.loaded / xhr.total) * 50; // 50% of total loading allocated to HDRI
                    setLoadingProgress(progress);
                }
            },
            (error) => {
                console.error('Error loading HDRI:', error);
                // Continue with default lighting if HDRI fails
            }
        );

        // Load GLB model with the manager
        const loader = new GLTFLoader(manager);
        loader.load(
            glbPath,
            (gltf) => {
                const model = gltf.scene;
                model.scale.set(1, 1, 1); // Adjust scale if necessary
                model.position.set(0, -2, 28); // Adjust position if necessary

                // Enhanced material handling
                model.traverse((child) => {
                    if (child.isMesh) {
                        // Check if the material is a basic material that doesn't respond to lighting
                        if (child.material.isMeshBasicMaterial) {
                            // Replace with standard material that responds to lighting
                            const newMaterial = new THREE.MeshStandardMaterial({
                                map: child.material.map,
                                color: child.material.color,
                                metalness: 0.4,
                                roughness: 0.6
                            });
                            child.material = newMaterial;
                        }
                        // For existing PBR materials, enhance their properties
                        else if (child.material.isMeshStandardMaterial || child.material.isMeshPhysicalMaterial) {
                            // Adjust existing material parameters for better lighting response
                            child.material.metalness = Math.min(child.material.metalness || 0, 0.7);
                            child.material.roughness = Math.max(child.material.roughness || 0.5, 0.3);
                        }

                        // Apply environment map for reflections
                        child.material.envMap = scene.environment;
                        child.material.envMapIntensity = 1.0;

                        // Enable shadows
                        child.castShadow = true;
                        child.receiveShadow = true;

                        // Ensure materials update
                        child.material.needsUpdate = true;
                    }
                });

                scene.add(model);

                // Update loading progress
                setLoadingProgress(prev => Math.max(prev, 75));
            },
            (xhr) => {
                // Update progress during loading
                if (xhr.lengthComputable) {
                    const progress = 50 + (xhr.loaded / xhr.total) * 50; // 50-100% range for GLB loading
                    setLoadingProgress(progress);
                }
            },
            (error) => {
                console.error('Error loading GLB file:', error);
                assetsLoaded = true; // Mark as loaded even on error to proceed
                const elapsedTime = Date.now() - loadingStartTimeRef.current;
                if (elapsedTime >= minLoadingTime) {
                    fadeOutLoading();
                } else {
                    setTimeout(fadeOutLoading, minLoadingTime - elapsedTime);
                }
            }
        );

        // Portal (Using the configuration)
        const portalGeometry = new THREE.TorusGeometry(2, 0.2, 16, 100);
        const portalMaterial = new THREE.MeshStandardMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.7,
            emissive: 0x00ff99,
            emissiveIntensity: 0.5
        });
        const portal = new THREE.Mesh(portalGeometry, portalMaterial);

        // Apply position from config
        portal.position.set(
            PORTAL_CONFIG.position.x,
            PORTAL_CONFIG.position.y,
            PORTAL_CONFIG.position.z
        );
        portal.rotation.y = PORTAL_CONFIG.rotationY;
        portal.scale.set(PORTAL_CONFIG.scale, PORTAL_CONFIG.scale, PORTAL_CONFIG.scale);
        portal.castShadow = true;

        scene.add(portal);


        const portalLight = new THREE.PointLight(0x00ff99, 2, 10);
        portalLight.position.copy(portal.position);
        scene.add(portalLight);

        // Create portal collision box
        const portalCollision = new THREE.Box3();
        const portalSize = new THREE.Vector3(4, 4, 2); // Adjust size as needed for collision detection
        portalCollision.min.set(
            portal.position.x - portalSize.x/2,
            portal.position.y - portalSize.y/2,
            portal.position.z - portalSize.z/2
        );
        portalCollision.max.set(
            portal.position.x + portalSize.x/2,
            portal.position.y + portalSize.y/2,
            portal.position.z + portalSize.z/2
        );

        // Portal particles with emissive materials
        const portalParticles = new THREE.Group();
        const particleGeometry = new THREE.SphereGeometry(0.05, 8, 8);
        const particleMaterial = new THREE.MeshStandardMaterial({
            color: 0x00ff99,
            emissive: 0x00ff99,
            emissiveIntensity: 1.0
        });

        for (let i = 0; i < 50; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 2 + Math.random() * 0.2;
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);

            // Calculate particle position relative to portal position
            particle.position.x = Math.cos(angle) * radius + PORTAL_CONFIG.position.x;
            particle.position.z = Math.sin(angle) * radius + PORTAL_CONFIG.position.z;
            particle.position.y = (Math.random() - 0.5) * 4 + PORTAL_CONFIG.position.y;

            particle.userData = {
                angle: angle,
                radius: radius,
                speed: 0.01 + Math.random() * 0.02,
                direction: Math.random() > 0.5 ? 1 : -1,
                ySpeed: (Math.random() - 0.5) * 0.05,
                centerX: PORTAL_CONFIG.position.x,
                centerZ: PORTAL_CONFIG.position.z
            };
            portalParticles.add(particle);
        }

        scene.add(portalParticles);


        // Mouse controls
        const mouse = new THREE.Vector2();
        const maxRotation = THREE.MathUtils.degToRad(60); // 60 degrees in radians
        let targetRotationY = 0;

        function handleMouseMove(event) {
            if (portalEntered) return;

            // Calculate normalized mouse position (-1 to 1)
            mouse.x = (event.clientX / window.innerWidth) * 2 - 1;

            // Inverted the sign to make camera move in same direction as mouse
            targetRotationY = -mouse.x * maxRotation;
        }

        // Scroll Handler
        let scrollY = 0;
        function handleScroll(event) {
            event.preventDefault(); // Prevent default scroll behavior
            scrollY += event.deltaY * 0.05;

            // Limit how close the camera can get (prevents going through the portal too easily)
            const minDistance = 0.5;
            const maxDistance = 15;
            const newZ = THREE.MathUtils.clamp(8 + scrollY, minDistance, maxDistance);

            gsap.to(camera.position, { z: newZ, duration: 0.5, ease: 'power1.out' });
        }

        // Animation Loop
        const animationRef = { current: null };

        function animate() {
            if (portalEntered) return;

            animationRef.current = requestAnimationFrame(animate);
            // Smooth camera rotation (lerp toward target rotation)
            camera.rotation.y += (targetRotationY - camera.rotation.y) * 0.05;

            // Update camera collider position
            cameraCollider.min.set(
                camera.position.x - cameraSize.x/2,
                camera.position.y - cameraSize.y/2,
                camera.position.z - cameraSize.z/2
            );
            cameraCollider.max.set(
                camera.position.x + cameraSize.x/2,
                camera.position.y + cameraSize.y/2,
                camera.position.z + cameraSize.z/2
            );

            // Check for collision with portal
            if (cameraCollider.intersectsBox(portalCollision)) {
                // Camera is inside portal collision area
                if (!portalEntered) {
                    portalTransition();
                }
            }

            // Animate portal particles
            portalParticles.children.forEach(particle => {
                const data = particle.userData;
                data.angle += data.speed * data.direction;

                // Use the particle's center coordinates from userData (which match portal position)
                particle.position.x = Math.cos(data.angle) * data.radius + data.centerX;
                particle.position.z = Math.sin(data.angle) * data.radius + data.centerZ;
                particle.position.y += data.ySpeed;

                // Wrap particles vertically relative to portal position
                const yOffset = 2; // How far particles can travel from portal center
                if (particle.position.y > PORTAL_CONFIG.position.y + yOffset)
                    particle.position.y = PORTAL_CONFIG.position.y - yOffset;
                if (particle.position.y < PORTAL_CONFIG.position.y - yOffset)
                    particle.position.y = PORTAL_CONFIG.position.y + yOffset;

                // Add pulsing glow effect to particles
                const pulseTime = Date.now() * 0.001;
                const pulseValue = 0.7 + Math.sin(pulseTime * 2 + data.angle) * 0.3;
                particle.material.emissiveIntensity = pulseValue;
            });

            // Portal glow effect with more dramatic pulsing
            const time = Date.now() * 0.001;
            portal.material.opacity = 0.5 + Math.sin(time * 2) * 0.2;
            portal.material.emissiveIntensity = 0.5 + Math.sin(time * 3) * 0.3;

            // Make portal light pulse in intensity
            portalLight.intensity = 1.5 + Math.sin(time * 2.5) * 0.5;

            renderer.render(scene, camera);
        }

        // Portal transition effect with minimum duration
        function portalTransition() {
            setPortalEntered(true);

            // Cancel any ongoing animations
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }

            // Create warp tunnel effect
            const tunnelOverlay = document.createElement('div');
            tunnelOverlay.style.position = 'fixed';
            tunnelOverlay.style.top = '0';
            tunnelOverlay.style.left = '0';
            tunnelOverlay.style.width = '100%';
            tunnelOverlay.style.height = '100%';
            tunnelOverlay.style.zIndex = '1000';
            document.body.appendChild(tunnelOverlay);

            // Create canvas for transition effect
            const tunnelCanvas = document.createElement('canvas');
            tunnelCanvas.width = window.innerWidth;
            tunnelCanvas.height = window.innerHeight;
            tunnelCanvas.style.width = '100%';
            tunnelCanvas.style.height = '100%';
            tunnelOverlay.appendChild(tunnelCanvas);

            const ctx = tunnelCanvas.getContext('2d');

            // Create stars for warp effect
            const warpStars = [];
            for (let i = 0; i < 1000; i++) {
                const angle = Math.random() * Math.PI * 2;
                const distance = 10 + Math.random() * 490;
                warpStars.push({
                    x: Math.cos(angle) * distance,
                    y: Math.sin(angle) * distance,
                    z: Math.random() * 1000 + 100,
                    size: Math.random() * 3 + 1,
                    color: `rgb(${155 + Math.random() * 100}, ${155 + Math.random() * 100}, ${255})`
                });
            }

            let speed = 5;

            const centerX = tunnelCanvas.width / 2;
            const centerY = tunnelCanvas.height / 2;

            // Animation vars
            let warpAnimationId;
            let animationStartTime = Date.now();
            const animationDuration = 100; // 5 seconds for portal transition (matching min loading time)

            // Warp animation function
            const animateWarp = () => {
                warpAnimationId = requestAnimationFrame(animateWarp);

                // Calculate animation progress
                const elapsed = Date.now() - animationStartTime;
                const progress = Math.min(elapsed / animationDuration, 1);

                // Increase speed over time for acceleration effect
                speed = 5 + progress * 45; // Max speed 50

                // Clear canvas with slight motion blur
                ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
                ctx.fillRect(0, 0, tunnelCanvas.width, tunnelCanvas.height);

                // Draw stars
                for (let i = 0; i < warpStars.length; i++) {
                    const star = warpStars[i];

                    // Move stars closer (simulating forward movement)
                    star.z -= speed;

                    // Reset stars that get too close
                    if (star.z <= 0) {
                        star.z = 1000;
                        const angle = Math.random() * Math.PI * 2;
                        const distance = 10 + Math.random() * 490;
                        star.x = Math.cos(angle) * distance;
                        star.y = Math.sin(angle) * distance;
                    }

                    // Calculate screen position
                    const scale = 600 / star.z;
                    const sx = star.x * scale + centerX;
                    const sy = star.y * scale + centerY;

                    // Calculate streak length based on speed and z position
                    const streakLength = speed * scale * 0.2;

                    // Draw star as stretched line
                    ctx.strokeStyle = star.color;
                    ctx.lineWidth = star.size * scale;
                    ctx.beginPath();
                    ctx.moveTo(sx, sy);

                    // Calculate end point for streak - radiating from center
                    const dx = sx - centerX;
                    const dy = sy - centerY;
                    const len = Math.sqrt(dx*dx + dy*dy);
                    const streakX = sx - (dx / len) * streakLength;
                    const streakY = sy - (dy / len) * streakLength;

                    ctx.lineTo(streakX, streakY);
                    ctx.stroke();
                }

                // Add flash effect toward end of animation (last 10%)
                // if (progress > 0.9) {
                //     const flashIntensity = (progress - 0.9) / 0.1 * 0.7; // 0 to 0.7 opacity
                //     ctx.fillStyle = `rgba(255, 255, 255, ${flashIntensity})`;
                //     ctx.fillRect(0, 0, tunnelCanvas.width, tunnelCanvas.height);
                // }

                // End animation when done
                if (progress >= 1) {
                    cancelAnimationFrame(warpAnimationId);

                    // Call the onPortalEnter callback to trigger the component change
                    console.log("Transition complete, calling onPortalEnter callback...");

                    if (onPortalEnter && typeof onPortalEnter === 'function') {
                        setTimeout(() => {
                            onPortalEnter();
                        }, 0);
                    } else {
                        console.error("onPortalEnter callback is not a function or not provided");
                    }

                    // Clean up overlay with fade out
                    tunnelOverlay.style.transition = 'opacity 0.5s';
                    tunnelOverlay.style.opacity = '0';
                    setTimeout(() => {
                        document.body.removeChild(tunnelOverlay);
                    }, 500);
                }
            };

            // Start warp animation
            animateWarp();
        }

        animate();

        // Event Listeners
        window.addEventListener('wheel', handleScroll, { passive: false });
        window.addEventListener('mousemove', handleMouseMove);

        const resizeHandler = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', resizeHandler);

        // Cleanup
        return () => {
            // Cancel any ongoing animations
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }

            // Clear the smooth progress interval
            clearInterval(smoothProgressInterval);

            // Restore cursor
            document.body.style.cursor = 'auto';

            window.removeEventListener('wheel', handleScroll);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('resize', resizeHandler);

            if (mountRef.current && renderer.domElement) {
                mountRef.current.removeChild(renderer.domElement);
            }
        };
    }, [portalEntered, onPortalEnter, glbPath, hdriPath]);

    // Loading screen JSX with warp effect
    return (
        <>
            <div
                ref={loadingOverlayRef}
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundColor: '#000',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000,
                    transition: 'opacity 0.5s ease',
                    opacity: isLoading ? 1 : 0,
                    pointerEvents: isLoading ? 'all' : 'none'
                }}
            >
                {/* Canvas for warp speed effect */}
                <canvas
                    ref={loadingCanvasRef}
                    width={window.innerWidth}
                    height={window.innerHeight}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%'
                    }}
                />

                {/* Optional loading text overlay */}
                <div style={{
                    position: 'absolute',
                    bottom: '10%',
                    left: 0,
                    width: '100%',
                    textAlign: 'center',
                    color: '#fff',
                    fontFamily: 'Arial, sans-serif',
                    fontSize: '16px',
                    zIndex: 1001
                }}>
                    {Math.floor(loadingProgress)}%
                </div>
            </div>

            <div ref={mountRef} style={{ width: '100%', height: '100vh' }} />
        </>
    );
};

export default CustomEnvironment;