// Lab_5.jsx - Solución definitiva: caja cerrada con física correcta

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import GUI from 'lil-gui';
import * as CANNON from 'cannon-es';

const Lab_5 = () => {
    const mountRef = useRef(null);

    useEffect(() => {
        if (!mountRef.current) return;

        const gui = new GUI();
        const debugObject = {};

        const scene = new THREE.Scene();

        // Texturas
        const textureLoader = new THREE.TextureLoader();
        const alphaTexture = textureLoader.load('/assets/alpha.png');

        const envTexture = new THREE.CubeTextureLoader().load([
            '/static/textures/environmentMaps/0/px.png',
            '/static/textures/environmentMaps/0/nx.png',
            '/static/textures/environmentMaps/0/py.png',
            '/static/textures/environmentMaps/0/ny.png',
            '/static/textures/environmentMaps/0/pz.png',
            '/static/textures/environmentMaps/0/nz.png'
        ]);

        // Mundo físico
        const world = new CANNON.World();
        world.gravity.set(0, -9.82, 0);
        const defaultMaterial = new CANNON.Material('default');
        const contactMaterial = new CANNON.ContactMaterial(defaultMaterial, defaultMaterial, {
            friction: 0.1,
            restitution: 0.3
        });
        world.defaultContactMaterial = contactMaterial;

        // Tamaños y renderer
        const sizes = { width: window.innerWidth, height: window.innerHeight };
        const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100);
        camera.position.set(5, 5, 5);
        camera.lookAt(0, 1, 0);
        scene.add(camera);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.shadowMap.enabled = true;
        renderer.setSize(sizes.width, sizes.height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        mountRef.current.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;

        window.addEventListener('resize', () => {
            sizes.width = window.innerWidth;
            sizes.height = window.innerHeight;
            camera.aspect = sizes.width / sizes.height;
            camera.updateProjectionMatrix();
            renderer.setSize(sizes.width, sizes.height);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        });

        // Luces
        const ambientLight = new THREE.AmbientLight(0xffffff, 1);
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 10, 5);
        directionalLight.castShadow = true;
        scene.add(directionalLight);

        // Material transparente
        const transparentMaterial = new THREE.MeshStandardMaterial({
            map: alphaTexture,
            alphaMap: alphaTexture,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide,
            envMap: envTexture,
            depthWrite: false
        });

        // Crear caja (6 caras)
        const walls = [
            { pos: [0, -0.1, 0], size: [10, 0.2, 10] }, // Piso
            { pos: [0, 5.1, 0], size: [10, 0.2, 10] },  // Techo
            { pos: [0, 2.5, -5.1], size: [10, 5, 0.2] }, // Atrás
            { pos: [0, 2.5, 5.1], size: [10, 5, 0.2] },  // Frente
            { pos: [-5.1, 2.5, 0], size: [0.2, 5, 10] }, // Izq
            { pos: [5.1, 2.5, 0], size: [0.2, 5, 10] },  // Der
        ];

        walls.forEach(w => {
            const geo = new THREE.BoxGeometry(...w.size);
            const mesh = new THREE.Mesh(geo, transparentMaterial);
            mesh.position.set(...w.pos);
            mesh.receiveShadow = true;
            scene.add(mesh);

            const shape = new CANNON.Box(new CANNON.Vec3(w.size[0]/2, w.size[1]/2, w.size[2]/2));
            const body = new CANNON.Body({ mass: 0, shape, position: new CANNON.Vec3(...w.pos), material: defaultMaterial });
            world.addBody(body);
        });

        // Jugador cubo rojo
        const playerGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const playerMat = new THREE.MeshStandardMaterial({ color: 'red' });
        const playerMesh = new THREE.Mesh(playerGeo, playerMat);
        playerMesh.castShadow = true;
        scene.add(playerMesh);

        const playerBody = new CANNON.Body({
            mass: 1,
            shape: new CANNON.Box(new CANNON.Vec3(0.25, 0.25, 0.25)),
            position: new CANNON.Vec3(0, 1, 0),
            material: defaultMaterial
        });
        world.addBody(playerBody);

        // Movimiento jugador
        const keyStates = {};
        const moveSpeed = 10;

        window.addEventListener('keydown', e => keyStates[e.code] = true);
        window.addEventListener('keyup', e => keyStates[e.code] = false);

        // Objetos dinámicos
        const objectsToUpdate = [];
        const boxGeo = new THREE.BoxGeometry(1, 1, 1);
        const boxMat = new THREE.MeshStandardMaterial({ color: 0x00ccff });
        const sphereGeo = new THREE.SphereGeometry(1, 16, 16);
        const sphereMat = new THREE.MeshStandardMaterial({ color: 0xffff00 });

        const createBox = () => {
            const mesh = new THREE.Mesh(boxGeo, boxMat);
            mesh.scale.setScalar(Math.random() * 0.5 + 0.3);
            mesh.castShadow = true;
            scene.add(mesh);

            const size = mesh.scale.x;
            const shape = new CANNON.Box(new CANNON.Vec3(size/2, size/2, size/2));
            const body = new CANNON.Body({
                mass: 1,
                shape,
                position: new CANNON.Vec3((Math.random() - 0.5) * 8, 4, (Math.random() - 0.5) * 8),
                material: defaultMaterial
            });
            world.addBody(body);
            objectsToUpdate.push({ mesh, body });
        };

        const createSphere = () => {
            const radius = Math.random() * 0.3 + 0.2;
            const mesh = new THREE.Mesh(sphereGeo, sphereMat);
            mesh.scale.setScalar(radius);
            mesh.castShadow = true;
            scene.add(mesh);

            const shape = new CANNON.Sphere(radius);
            const body = new CANNON.Body({
                mass: 1,
                shape,
                position: new CANNON.Vec3((Math.random() - 0.5) * 8, 4, (Math.random() - 0.5) * 8),
                material: defaultMaterial
            });
            world.addBody(body);
            objectsToUpdate.push({ mesh, body });
        };

        debugObject.createBox = createBox;
        debugObject.createSphere = createSphere;
        gui.add(debugObject, 'createBox').name('Agregar Cubo');
        gui.add(debugObject, 'createSphere').name('Agregar Esfera');

        // Loop
        const clock = new THREE.Clock();
        let oldElapsedTime = 0;

        const animate = () => {
            requestAnimationFrame(animate);

            const elapsedTime = clock.getElapsedTime();
            const deltaTime = elapsedTime - oldElapsedTime;
            oldElapsedTime = elapsedTime;

            world.step(1 / 60, deltaTime, 15);

            const force = new CANNON.Vec3();
            if (keyStates['KeyW'] || keyStates['ArrowUp']) force.z -= moveSpeed;
            if (keyStates['KeyS'] || keyStates['ArrowDown']) force.z += moveSpeed;
            if (keyStates['KeyA'] || keyStates['ArrowLeft']) force.x -= moveSpeed;
            if (keyStates['KeyD'] || keyStates['ArrowRight']) force.x += moveSpeed;
            playerBody.applyForce(force, playerBody.position);

            playerBody.velocity.x *= 0.9;
            playerBody.velocity.z *= 0.9;

            playerMesh.position.copy(playerBody.position);
            playerMesh.quaternion.copy(playerBody.quaternion);

            objectsToUpdate.forEach(obj => {
                obj.mesh.position.copy(obj.body.position);
                obj.mesh.quaternion.copy(obj.body.quaternion);
            });

            controls.update();
            renderer.render(scene, camera);
        };

        animate();

        return () => {
            gui.destroy();
            mountRef.current?.removeChild(renderer.domElement);
        };

    }, []);

    return <div ref={mountRef} style={{ width: '100vw', height: '100vh' }} />;
};

export default Lab_5;