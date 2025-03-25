import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';
import { gsap } from 'gsap';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader';

const PORTAL_CONFIG = {
    position: { x: 0, y: 0, z: 0 },
    scale: 1,
    rotationY: Math.PI
};

const CustomEnvironment = ({ glbPath, hdriPath, onPortalEnter }) => {
    const mountRef = useRef(null);
    const [portalEntered, setPortalEntered] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const loadingOverlayRef = useRef(null);
    const loadingCanvasRef = useRef(null);
    const loadingStartTimeRef = useRef(Date.now());
    const minLoadingTime = 5000;

    const mixerRef = useRef(null);
    const clockRef = useRef(new THREE.Clock());
    const animationActionsRef = useRef([]);
    const modelRef = useRef(null);

    useEffect(() => {
        // Loading warp tunnel effect (unchanged)
        if (!loadingCanvasRef.current || !loadingOverlayRef.current) return;
        loadingStartTimeRef.current = Date.now();
        const tunnelCanvas = loadingCanvasRef.current;
        tunnelCanvas.width = window.innerWidth;
        tunnelCanvas.height = window.innerHeight;
        const ctx = tunnelCanvas.getContext('2d');

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

        const animateLoadingWarp = () => {
            warpAnimationId = requestAnimationFrame(animateLoadingWarp);
            if (!isLoading && warpAnimationId) {
                cancelAnimationFrame(warpAnimationId);
                return;
            }
            speed = 5 + Math.min(loadingProgress, 30);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
            ctx.fillRect(0, 0, tunnelCanvas.width, tunnelCanvas.height);

            for (let i = 0; i < warpStars.length; i++) {
                const star = warpStars[i];
                star.z -= speed;
                if (star.z <= 0) {
                    star.z = 1000;
                    const angle = Math.random() * Math.PI * 2;
                    const distance = 10 + Math.random() * 490;
                    star.x = Math.cos(angle) * distance;
                    star.y = Math.sin(angle) * distance;
                }
                const scale = 600 / star.z;
                const sx = star.x * scale + centerX;
                const sy = star.y * scale + centerY;
                const streakLength = speed * scale * 0.2;
                ctx.strokeStyle = star.color;
                ctx.lineWidth = star.size * scale;
                ctx.beginPath();
                ctx.moveTo(sx, sy);
                const dx = sx - centerX;
                const dy = sy - centerY;
                const len = Math.sqrt(dx * dx + dy * dy);
                const streakX = sx - (dx / len) * streakLength;
                const streakY = sy - (dy / len) * streakLength;
                ctx.lineTo(streakX, streakY);
                ctx.stroke();
            }
        };
        animateLoadingWarp();

        return () => {
            if (warpAnimationId) cancelAnimationFrame(warpAnimationId);
        };
    }, [isLoading, loadingProgress]);

    useEffect(() => {
        document.body.style.cursor = 'none';
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x87CEEB);

        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 0, 10);

        const cameraCollider = new THREE.Box3();
        const cameraSize = new THREE.Vector3(0.5, 0.8, 0.5);

        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: "high-performance"
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 0.6;
        renderer.outputEncoding = THREE.sRGBEncoding;
        mountRef.current.appendChild(renderer.domElement);

        // Lighting setup (unchanged)
        const ambientLight = new THREE.AmbientLight(0xffa500, 0.1);
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffd500, 3);
        directionalLight.position.set(5, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        directionalLight.shadow.camera.left = -15;
        directionalLight.shadow.camera.right = 15;
        directionalLight.shadow.camera.top = 15;
        directionalLight.shadow.camera.bottom = -15;
        directionalLight.shadow.bias = -0.0005;
        directionalLight.shadow.normalBias = 0.02;
        directionalLight.shadow.radius = 0;
        scene.add(directionalLight);
        const fillLight = new THREE.DirectionalLight(0xffa500, 0.3);
        fillLight.position.set(-5, 3, -5);
        fillLight.castShadow = true;
        fillLight.shadow.mapSize.width = 1024;
        fillLight.shadow.mapSize.height = 1024;
        fillLight.shadow.camera.near = 0.5;
        fillLight.shadow.camera.far = 30;
        fillLight.shadow.radius = 0;
        scene.add(fillLight);
        const rimLight = new THREE.DirectionalLight(0xaaccff, 0.5);
        rimLight.position.set(0, -5, -5);
        scene.add(rimLight);

        const manager = new THREE.LoadingManager();
        let assetsLoaded = false;

        manager.onProgress = (url, itemsLoaded, itemsTotal) => {
            const progress = itemsLoaded / itemsTotal * 100;
            setLoadingProgress(progress);
        };

        manager.onLoad = () => {
            assetsLoaded = true;
            const elapsedTime = Date.now() - loadingStartTimeRef.current;
            if (elapsedTime >= minLoadingTime) fadeOutLoading();
            else {
                const remainingTime = minLoadingTime - elapsedTime;
                console.log(`Assets loaded, waiting ${remainingTime}ms more`);
                setLoadingProgress(100);
                setTimeout(fadeOutLoading, remainingTime);
            }
        };

        const fadeOutLoading = () => {
            if (loadingOverlayRef.current) {
                loadingOverlayRef.current.style.opacity = 0;
                setTimeout(() => setIsLoading(false), 500);
            } else {
                setIsLoading(false);
            }
        };

        const smoothProgressInterval = setInterval(() => {
            if (!assetsLoaded) {
                setLoadingProgress(prev => (prev < 90 ? prev + 0.3 : prev));
            }
        }, 100);

        // Environment map loading (unchanged)
        function loadEnvironmentMap(path) {
            const fileExtension = path.split('.').pop().toLowerCase();
            console.log("Loading environment map with extension:", fileExtension);

            let loader;
            if (fileExtension === 'hdr') loader = new RGBELoader(manager);
            else if (fileExtension === 'exr') loader = new EXRLoader(manager);
            else if (['jpg', 'jpeg', 'png'].includes(fileExtension)) loader = new THREE.TextureLoader(manager);
            else {
                console.error('Unsupported format:', fileExtension);
                setupFallbackEnvironment();
                return;
            }

            loader.setDataType(THREE.FloatType);
            loader.load(path, handleLoadedTexture, onProgress, (error) => {
                console.error('Error loading:', error);
                setupFallbackEnvironment();
            });

            function handleLoadedTexture(texture) {
                const pmremGenerator = new THREE.PMREMGenerator(renderer);
                pmremGenerator.compileEquirectangularShader();
                const envMap = pmremGenerator.fromEquirectangular(texture).texture;
                scene.environment = envMap;
                scene.background = envMap;
                texture.dispose();
                pmremGenerator.dispose();
            }

            function onProgress(xhr) {
                if (xhr.lengthComputable) setLoadingProgress((xhr.loaded / xhr.total) * 50);
            }
        }

        function setupFallbackEnvironment() {
            scene.background = new THREE.Color(0x87CEEB);
            const pmremGenerator = new THREE.PMREMGenerator(renderer);
            pmremGenerator.compileEquirectangularShader();
            const envLight = new THREE.HemisphereLight(0x88CCFF, 0x444444, 0.5);
            scene.add(envLight);
            const canvas = document.createElement('canvas');
            canvas.width = 1024;
            canvas.height = 512;
            const context = canvas.getContext('2d');
            const gradient = context.createLinearGradient(0, 0, 0, 512);
            gradient.addColorStop(0, '#8888ff');
            gradient.addColorStop(1, '#000033');
            context.fillStyle = gradient;
            context.fillRect(0, 0, 1024, 512);
            const texture = new THREE.CanvasTexture(canvas);
            texture.mapping = THREE.EquirectangularReflectionMapping;
            scene.environment = pmremGenerator.fromEquirectangular(texture).texture;
            texture.dispose();
            pmremGenerator.dispose();
        }
        loadEnvironmentMap(hdriPath);

        // GLB loading (unchanged)
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
        dracoLoader.setDecoderConfig({ type: 'js' });
        const loader = new GLTFLoader(manager);
        loader.setDRACOLoader(dracoLoader);
        loader.load(glbPath, (gltf) => {
            const model = gltf.scene;
            model.scale.set(1, 1, 1);
            model.position.set(0, -2, 5);
            model.traverse((child) => {
                if (child.isMesh) {
                    if (child.material.isMeshBasicMaterial) {
                        child.material = new THREE.MeshStandardMaterial({
                            map: child.material.map,
                            color: child.material.color,
                            metalness: 0.4,
                            roughness: 0.6
                        });
                    } else if (child.material.isMeshStandardMaterial || child.material.isMeshPhysicalMaterial) {
                        child.material.metalness = Math.min(child.material.metalness || 0, 0.7);
                        child.material.roughness = Math.max(child.material.roughness || 0.5, 0.3);
                    }
                    child.material.envMap = scene.environment;
                    child.material.envMapIntensity = 1.0;
                    child.castShadow = true;
                    child.receiveShadow = true;
                    child.material.needsUpdate = true;
                }
                if (gltf.animations && gltf.animations.length > 0) {
                    mixerRef.current = new THREE.AnimationMixer(model);
                    animationActionsRef.current = [];
                    gltf.animations.forEach((clip, index) => {
                        const action = mixerRef.current.clipAction(clip);
                        animationActionsRef.current.push(action);
                        if (index === 0) {
                            action.setLoop(THREE.LoopRepeat);
                            action.clampWhenFinished = false;
                            action.play();
                        }
                    });
                    clockRef.current.start();
                }
            });
            scene.add(model);
            setLoadingProgress(prev => Math.max(prev, 75));
        }, (xhr) => {
            if (xhr.lengthComputable) setLoadingProgress(50 + (xhr.loaded / xhr.total) * 50);
        }, (error) => {
            console.error('Error loading GLB:', error);
            assetsLoaded = true;
            const elapsedTime = Date.now() - loadingStartTimeRef.current;
            if (elapsedTime >= minLoadingTime) fadeOutLoading();
            else setTimeout(fadeOutLoading, minLoadingTime - elapsedTime);
        });

        // Portal setup (unchanged)
        const portalGeometry = new THREE.TorusGeometry(2, 0.2, 16, 100);
        const portalMaterial = new THREE.MeshStandardMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.7,
            emissive: 0x00ff99,
            emissiveIntensity: 0.5
        });
        const portal = new THREE.Mesh(portalGeometry, portalMaterial);
        portal.position.set(PORTAL_CONFIG.position.x, PORTAL_CONFIG.position.y, PORTAL_CONFIG.position.z);
        portal.rotation.y = PORTAL_CONFIG.rotationY;
        portal.scale.set(PORTAL_CONFIG.scale, PORTAL_CONFIG.scale, PORTAL_CONFIG.scale);
        portal.castShadow = true;
        scene.add(portal);

        const portalLight = new THREE.PointLight(0x00ff99, 2, 10);
        portalLight.position.copy(portal.position);
        scene.add(portalLight);

        const portalCollision = new THREE.Box3();
        const portalSize = new THREE.Vector3(4, 4, 2);
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

        const portalParticles = new THREE.Group();
        const particleGeometry = new THREE.SphereGeometry(0.05, 8, 8);
        const particleMaterial = new THREE.MeshStandardMaterial({
            color: 0x00ff99,
            emissive: 0x00ff99,
            emissiveIntensity: 1.0
        });

        // Controls
        const maxRotation = THREE.MathUtils.degToRad(55);
        let targetRotationY = 0;
        let scrollY = 0;

        // Mouse controls (desktop)
        const mouse = new THREE.Vector2();
        function handleMouseMove(event) {
            if (portalEntered) return;
            mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            targetRotationY = -mouse.x * maxRotation;
        }

        function handleScroll(event) {
            event.preventDefault();
            scrollY += event.deltaY * 0.05;
            const minDistance = 0.5;
            const maxDistance = 12;
            const newZ = THREE.MathUtils.clamp(8 + scrollY, minDistance, maxDistance);
            gsap.to(camera.position, { z: newZ, duration: 0.5, ease: 'power1.out' });
        }

        // Touch controls (mobile)
        const touchState = {
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0,
            isTouching: false
        };

        function handleTouchStart(event) {
            if (portalEntered) return;
            event.preventDefault();
            touchState.isTouching = true;
            touchState.startX = event.touches[0].clientX;
            touchState.startY = event.touches[0].clientY;
            touchState.currentX = touchState.startX;
            touchState.currentY = touchState.startY;
        }

        function handleTouchMove(event) {
            if (!touchState.isTouching || portalEntered) return;
            event.preventDefault();
            touchState.currentX = event.touches[0].clientX;
            touchState.currentY = event.touches[0].clientY;

            // Rotation (horizontal swipe)
            const deltaX = (touchState.currentX - touchState.startX) / window.innerWidth * 2;
            targetRotationY = THREE.MathUtils.clamp(-deltaX * maxRotation, -maxRotation, maxRotation);

            // Zoom (vertical swipe)
            const deltaY = (touchState.currentY - touchState.startY) * 0.05;
            const minDistance = 0.5;
            const maxDistance = 12;
            const newZ = THREE.MathUtils.clamp(10 + deltaY, minDistance, maxDistance);
            gsap.to(camera.position, { z: newZ, duration: 0.5, ease: 'power1.out' });
        }

        function handleTouchEnd(event) {
            touchState.isTouching = false;
        }

        // Animation Loop
        const animationRef = { current: null };

        function animate() {
            if (portalEntered) return;
            animationRef.current = requestAnimationFrame(animate);
            camera.rotation.y += (targetRotationY - camera.rotation.y) * 0.05;

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

            if (cameraCollider.intersectsBox(portalCollision) && !portalEntered) {
                portalTransition();
            }

            const delta = clockRef.current.getDelta();
            if (mixerRef.current) mixerRef.current.update(delta);

            const time = Date.now() * 0.001;
            portal.material.opacity = 0;
            portal.material.emissiveIntensity = 0.5 + Math.sin(time * 3) * 0.3;
            portalLight.intensity = 1.5 + Math.sin(time * 2.5) * 0.5;

            renderer.render(scene, camera);
        }

        // Portal transition (unchanged)
        function portalTransition() {
            setPortalEntered(true);
            if (animationRef.current) cancelAnimationFrame(animationRef.current);

            const tunnelOverlay = document.createElement('div');
            tunnelOverlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 1000;';
            document.body.appendChild(tunnelOverlay);

            const tunnelCanvas = document.createElement('canvas');
            tunnelCanvas.width = window.innerWidth;
            tunnelCanvas.height = window.innerHeight;
            tunnelCanvas.style.cssText = 'width: 100%; height: 100%;';
            tunnelOverlay.appendChild(tunnelCanvas);

            const ctx = tunnelCanvas.getContext('2d');
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
            let warpAnimationId;
            let animationStartTime = Date.now();
            const animationDuration = 100;

            const animateWarp = () => {
                warpAnimationId = requestAnimationFrame(animateWarp);
                const elapsed = Date.now() - animationStartTime;
                const progress = Math.min(elapsed / animationDuration, 1);
                speed = 5 + progress * 45;

                ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
                ctx.fillRect(0, 0, tunnelCanvas.width, tunnelCanvas.height);

                for (let i = 0; i < warpStars.length; i++) {
                    const star = warpStars[i];
                    star.z -= speed;
                    if (star.z <= 0) {
                        star.z = 1000;
                        const angle = Math.random() * Math.PI * 2;
                        const distance = 10 + Math.random() * 490;
                        star.x = Math.cos(angle) * distance;
                        star.y = Math.sin(angle) * distance;
                    }
                    const scale = 600 / star.z;
                    const sx = star.x * scale + centerX;
                    const sy = star.y * scale + centerY;
                    const streakLength = speed * scale * 0.2;
                    ctx.strokeStyle = star.color;
                    ctx.lineWidth = star.size * scale;
                    ctx.beginPath();
                    ctx.moveTo(sx, sy);
                    const dx = sx - centerX;
                    const dy = sy - centerY;
                    const len = Math.sqrt(dx * dx + dy * dy);
                    const streakX = sx - (dx / len) * streakLength;
                    const streakY = sy - (dy / len) * streakLength;
                    ctx.lineTo(streakX, streakY);
                    ctx.stroke();
                }

                if (progress >= 1) {
                    cancelAnimationFrame(warpAnimationId);
                    if (onPortalEnter && typeof onPortalEnter === 'function') {
                        setTimeout(() => onPortalEnter(), 0);
                    } else {
                        console.error("onPortalEnter callback is not a function or not provided");
                    }
                    tunnelOverlay.style.transition = 'opacity 0.5s';
                    tunnelOverlay.style.opacity = '0';
                    setTimeout(() => document.body.removeChild(tunnelOverlay), 500);
                }
            };
            animateWarp();
        }

        animate();

        // Event Listeners
        window.addEventListener('wheel', handleScroll, { passive: false });
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('touchstart', handleTouchStart, { passive: false });
        window.addEventListener('touchmove', handleTouchMove, { passive: false });
        window.addEventListener('touchend', handleTouchEnd, { passive: false });

        const resizeHandler = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
            if (loadingCanvasRef.current) {
                loadingCanvasRef.current.width = window.innerWidth;
                loadingCanvasRef.current.height = window.innerHeight;
            }
        };
        window.addEventListener('resize', resizeHandler);

        // Cleanup
        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            clearInterval(smoothProgressInterval);
            document.body.style.cursor = 'auto';
            window.removeEventListener('wheel', handleScroll);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('touchstart', handleTouchStart);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEnd);
            window.removeEventListener('resize', resizeHandler);
            if (mountRef.current && renderer.domElement) {
                mountRef.current.removeChild(renderer.domElement);
            }
        };
    }, [portalEntered, onPortalEnter, glbPath, hdriPath]);

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
                <button
                    onClick={() => navigate('/')}
                    style={{
                        position: 'fixed',
                        top: '20px',
                        right: '20px',
                        zIndex: 1000,
                        padding: '10px 20px',
                        background: 'linear-gradient(145deg, #00cc99, #0066ff, #00cc99)',
                        backgroundSize: '200% 200%',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontSize: '16px',
                        fontFamily: 'Arial, sans-serif',
                        transition: 'all 0.3s ease',
                        opacity: portalEntered ? 0 : 1,
                        pointerEvents: portalEntered ? 'none' : 'auto',
                        textShadow: '0 0 8px rgba(0, 255, 153, 0.3)',
                        boxShadow: '0 0 15px rgba(0, 255, 153, 0.3)',
                        ':hover': {
                            background: 'linear-gradient(145deg, #00ff99, #00cc77, #00ff99)',
                            transform: 'scale(1.05)',
                            boxShadow: '0 0 25px rgba(0, 255, 153, 0.5)'
                        }
                    }}
                >
                    Exit to Home
                </button>
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
                    {Math.floor(loadingProgress)}
                </div>
            </div>
            <div ref={mountRef} style={{ width: '100%', height: '100vh' }} />
        </>
    );
};

export default CustomEnvironment;