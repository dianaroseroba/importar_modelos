import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as CANNON from 'cannon-es';

const Lab_7 = () => {
    const mountRef = useRef(null);
    const soundUnlocked = useRef(false);

    useEffect(() => {
        if (!mountRef.current) return;

        // Escena y mundo físico
        const scene = new THREE.Scene();
        const world = new CANNON.World();
        world.gravity.set(0, -9.82, 0);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.shadowMap.enabled = true;
        renderer.setSize(window.innerWidth, window.innerHeight);
        mountRef.current.appendChild(renderer.domElement);

        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
        camera.position.set(-6, 6, 6);
        scene.add(camera);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;

        // Luces
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 10, 5);
        directionalLight.castShadow = true;
        scene.add(directionalLight);

        const pointLight = new THREE.PointLight(0xffaa33, 1, 10);
        pointLight.position.set(0, 3, 0);
        scene.add(pointLight);

        // Piso
        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(20, 20),
            new THREE.MeshStandardMaterial({ color: 'blue', metalness: 0.5, roughness: 0.5 })
        );
        floor.rotation.x = -Math.PI * 0.5;
        scene.add(floor);

        const floorBody = new CANNON.Body({ mass: 0 });
        floorBody.addShape(new CANNON.Plane());
        floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(-1, 0, 0), Math.PI * 0.5);
        world.addBody(floorBody);

        // Sonido
        const collisionSound = new Audio('/assets/chair-move.mp3');
        collisionSound.volume = 0.5;

        // Vehículo
        let carMesh;
        const loader = new GLTFLoader();
        loader.load('/assets/Car.glb', (gltf) => {
            carMesh = gltf.scene;
            carMesh.scale.set(5, 5, 5);
            scene.add(carMesh);
        });

        const carBody = new CANNON.Body({ mass: 2, position: new CANNON.Vec3(0.75, 1, 0) });
        carBody.addShape(new CANNON.Box(new CANNON.Vec3(0.75, 0.5, 1.5)));
        carBody.fixedRotation = true;
        carBody.updateMassProperties();
        world.addBody(carBody);

        // Cubo
        const boxBody = new CANNON.Body({ mass: 2, position: new CANNON.Vec3(0, 1, 0) });
        boxBody.addShape(new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5)));
        world.addBody(boxBody);

        const boxMesh = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 1),
            new THREE.MeshStandardMaterial({ color: 'red' })
        );
        scene.add(boxMesh);

        // Sonido al colisionar
        boxBody.addEventListener('collide', (e) => {
            if (e.body === carBody && soundUnlocked.current) {
                collisionSound.currentTime = 0;
                collisionSound.play().catch((err) => console.error('Sound error:', err));
            }
        });

        // Teclado
        const keys = {
            ArrowUp: false,
            ArrowDown: false,
            ArrowLeft: false,
            ArrowRight: false,
        };

        const onKeyDown = (e) => {
            if (keys.hasOwnProperty(e.key)) {
                keys[e.key] = true;
                soundUnlocked.current = true;
            }
        };

        const onKeyUp = (e) => {
            if (keys.hasOwnProperty(e.key)) {
                keys[e.key] = false;
            }
        };

        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);

        // Resize
        const onResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', onResize);

        // Animación
        let animationId;
        const tick = () => {
            const speed = 10;
            let vx = 0,
                vz = 0;
            if (keys.ArrowUp) vz -= speed;
            if (keys.ArrowDown) vz += speed;
            if (keys.ArrowLeft) vx -= speed;
            if (keys.ArrowRight) vx += speed;

            carBody.velocity.x = vx;
            carBody.velocity.z = vz;

            world.step(1 / 60);

            if (carMesh) {
                carMesh.position.copy(carBody.position);
                carMesh.quaternion.copy(carBody.quaternion);
            }

            boxMesh.position.copy(boxBody.position);
            boxMesh.quaternion.copy(boxBody.quaternion);

            controls.update();
            renderer.render(scene, camera);
            animationId = requestAnimationFrame(tick);
        };

        tick();

        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
            window.removeEventListener('resize', onResize);
            cancelAnimationFrame(animationId);
            mountRef.current.removeChild(renderer.domElement);
        };
    }, []);

    return <div ref={mountRef} style={{ width: '100vw', height: '100vh' }} />;
};

export default Lab_7;
