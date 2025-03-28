import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import GUI from 'lil-gui';
import * as CANNON from 'cannon-es';

const EscenarioCannon = () => {
    const mountRef = useRef(null);

    useEffect(() => {
        if (!mountRef.current) return;

        const gui = new GUI();
        const debugObject = {};

        const scene = new THREE.Scene();

        const hitSound = new Audio('/static/sounds/hit.mp3');
        const playHitSound = (collision) => {
            const impactStrength = collision.contact.getImpactVelocityAlongNormal();
            if (impactStrength > 1.5) {
                hitSound.volume = Math.random();
                hitSound.currentTime = 0;
                hitSound.play();
            }
        };

        const textureLoader = new THREE.TextureLoader();
        const cubeTextureLoader = new THREE.CubeTextureLoader();

        const environmentMapTexture = cubeTextureLoader.load([
            '/static/textures/environmentMaps/0/px.png',
            '/static/textures/environmentMaps/0/nx.png',
            '/static/textures/environmentMaps/0/py.png',
            '/static/textures/environmentMaps/0/ny.png',
            '/static/textures/environmentMaps/0/pz.png',
            '/static/textures/environmentMaps/0/nz.png'
        ]);

        const world = new CANNON.World();
        world.broadphase = new CANNON.SAPBroadphase(world);
        world.allowSleep = true;
        world.gravity.set(0, -9.82, 0);

        const defaultMaterial = new CANNON.Material('default');
        const defaultContactMaterial = new CANNON.ContactMaterial(
            defaultMaterial,
            defaultMaterial,
            { friction: 0.01, restitution: 0.6 }
        );
        world.addContactMaterial(defaultContactMaterial);
        world.defaultContactMaterial = defaultContactMaterial;

        const floorShape = new CANNON.Plane();
        const floorBody = new CANNON.Body({ mass: 0 });
        floorBody.addShape(floorShape);
        floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(-1, 0, 0), Math.PI * 0.5);
        world.addBody(floorBody);

        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(10, 10),
            new THREE.MeshStandardMaterial({
                color: '#777777',
                metalness: 0.3,
                roughness: 0.4,
                envMap: environmentMapTexture,
                envMapIntensity: 0.5
            })
        );
        floor.receiveShadow = true;
        floor.rotation.x = -Math.PI * 0.5;
        scene.add(floor);

        const ambientLight = new THREE.AmbientLight(0xffffff, 2.1);
        scene.add(ambientLight);
        gui.add(ambientLight, 'intensity').min(0).max(3).step(0.1).name('Amb. Light');

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.set(1024, 1024);
        directionalLight.shadow.camera.far = 15;
        directionalLight.position.set(5, 5, 5);
        scene.add(directionalLight);

        const sizes = {
            width: window.innerWidth,
            height: window.innerHeight
        };

        const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100);
        camera.position.set(-3, 3, 3);
        scene.add(camera);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.setSize(sizes.width, sizes.height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        mountRef.current.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;

        const handleResize = () => {
            sizes.width = window.innerWidth;
            sizes.height = window.innerHeight;
            camera.aspect = sizes.width / sizes.height;
            camera.updateProjectionMatrix();
            renderer.setSize(sizes.width, sizes.height);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        };
        window.addEventListener('resize', handleResize);

        const objectsToUpdate = [];

        const sphereGeometry = new THREE.SphereGeometry(1, 20, 20);
        const sphereMaterial = new THREE.MeshStandardMaterial({
            metalness: 0.3,
            roughness: 0.4,
            envMap: environmentMapTexture
        });

        const createSphere = (radius, position) => {
            const mesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
            mesh.scale.set(radius, radius, radius);
            mesh.castShadow = true;
            mesh.position.copy(position);
            scene.add(mesh);

            const shape = new CANNON.Sphere(radius);
            const body = new CANNON.Body({
                mass: 1,
                position: new CANNON.Vec3(position.x, position.y, position.z),
                shape,
                material: defaultMaterial
            });
            body.position.copy(position);
            body.addEventListener('collide', playHitSound);
            world.addBody(body);

            objectsToUpdate.push({ mesh, body });
        };

        createSphere(0.5, { x: 0, y: 3, z: 0 });

        debugObject.createSphere = () => {
            createSphere(Math.random() * 0.5, {
                x: (Math.random() - 0.5) * 3,
                y: 3,
                z: (Math.random() - 0.5) * 3
            });
        };

        const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
        const boxMaterial = new THREE.MeshStandardMaterial({
            metalness: 0.3,
            roughness: 0.4,
            envMap: environmentMapTexture
        });

        const createbox = (width, height, depth, position) => {
            const mesh = new THREE.Mesh(boxGeometry, boxMaterial);
            mesh.scale.set(width, height, depth);
            mesh.castShadow = true;
            mesh.position.copy(position);
            scene.add(mesh);

            const shape = new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, depth / 2));
            const body = new CANNON.Body({
                mass: 1,
                position: new CANNON.Vec3(position.x, position.y, position.z),
                shape,
                material: defaultMaterial
            });
            body.position.copy(position);
            body.addEventListener('collide', playHitSound);
            world.addBody(body);

            objectsToUpdate.push({ mesh, body });
        };

        createbox(0.5, 0.5, 0.5, { x: 0, y: 3, z: 0 });

        debugObject.createbox = () => {
            createbox(
                Math.random(),
                Math.random(),
                Math.random(),
                {
                    x: (Math.random() - 0.5) * 3,
                    y: 3,
                    z: (Math.random() - 0.5) * 3
                }
            );
        };

        debugObject.reset = () => {
            for (const object of objectsToUpdate) {
                object.body.removeEventListener('collide', playHitSound);
                world.removeBody(object.body);
                scene.remove(object.mesh);
            }

            objectsToUpdate.splice(0, objectsToUpdate.length);
        };

        gui.add(debugObject, 'createbox');
        gui.add(debugObject, 'createSphere');
        gui.add(debugObject, 'reset');

        // Caja controlable para revisiones de mover objetos
        const playerSize = { x: 0.5, y: 0.5, z: 0.5 };
        const playerGeometry = new THREE.BoxGeometry(playerSize.x, playerSize.y, playerSize.z);
        // Materiales por cara
        const playerMaterials = [
            new THREE.MeshStandardMaterial({ color: 'red' }),    // derecha (+X)
            new THREE.MeshStandardMaterial({ color: 'green' }),  // izquierda (-X)
            new THREE.MeshStandardMaterial({ color: 'blue' }),   // arriba (+Y)
            new THREE.MeshStandardMaterial({ color: 'blue' }),   // abajo (-Y)
            new THREE.MeshStandardMaterial({ color: 'blue' }),   // frente (+Z)
            new THREE.MeshStandardMaterial({ color: 'blue' }),   // atrás (-Z)
        ];

        const playerMesh = new THREE.Mesh(playerGeometry, playerMaterials);
        playerMesh.castShadow = true;
        scene.add(playerMesh);
        // Crear luces tipo faro (SpotLight)
        const leftLight = new THREE.SpotLight(0xffffff, 8, 20, Math.PI / 12, 0.2, 1);
        const rightLight = new THREE.SpotLight(0xffffff, 8, 20, Math.PI / 12, 0.2, 1);

        // Posicionar los focos frente al cubo (ligeramente hacia los lados y arriba)
        leftLight.position.set(0.55, 0.25, 0.3);  // lado derecho
        rightLight.position.set(0.55, 0.25, -0.3); // lado izquierdo

        // Orientar los focos hacia adelante en el eje X
        leftLight.target.position.set(2, 0.25, 0.3);
        rightLight.target.position.set(2, 0.25, -0.3);

        // Añadir luces y targets a la escena
        scene.add(leftLight);
        scene.add(leftLight.target);
        scene.add(rightLight);
        scene.add(rightLight.target);

        // Hacer que sigan al cubo
        playerMesh.add(leftLight);
        playerMesh.add(leftLight.target);
        playerMesh.add(rightLight);
        playerMesh.add(rightLight.target);


        const playerShape = new CANNON.Box(new CANNON.Vec3(
            playerSize.x / 2,
            playerSize.y / 2,
            playerSize.z / 2
        ));
        const playerBody = new CANNON.Body({
            mass: 5,
            material: defaultMaterial,
            position: new CANNON.Vec3(0, 1, 0),
        });
        playerBody.angularFactor.set(0, 0, 0);
        playerBody.addShape(playerShape);
        world.addBody(playerBody);

        const keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
        };
        const force = 50;

        const handleKeyDown = (e) => {
            console.log("Tecla presionada:", e.code);

            if (e.code === 'ArrowUp') keys.forward = true;
            if (e.code === 'ArrowDown') keys.backward = true;
            if (e.code === 'ArrowLeft') keys.left = true;
            if (e.code === 'ArrowRight') keys.right = true;
        };

        const handleKeyUp = (e) => {
            if (e.code === 'ArrowUp') keys.forward = false;
            if (e.code === 'ArrowDown') keys.backward = false;
            if (e.code === 'ArrowLeft') keys.left = false;
            if (e.code === 'ArrowRight') keys.right = false;
        };

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('keyup', handleKeyUp);

        const clock = new THREE.Clock();
        let oldElapsedTime = 0;
        let animationId;

        const tick = () => {
            animationId = requestAnimationFrame(tick);
            const elapsedTime = clock.getElapsedTime();
            const deltaTime = elapsedTime - oldElapsedTime;
            oldElapsedTime = elapsedTime;
            world.step(1 / 60, deltaTime, 3);

            // Movimiento del cubo controlable
            const direction = new CANNON.Vec3(0, 0, 0);
            if (keys.forward) direction.z -= 1;
            if (keys.backward) direction.z += 1;
            if (keys.left) direction.x -= 1;
            if (keys.right) direction.x += 1;

            if (direction.length()) {
                direction.normalize();
                direction.scale(force, direction);
                playerBody.applyForce(direction, playerBody.position);
            }

            playerMesh.position.copy(playerBody.position);
            playerMesh.quaternion.copy(playerBody.quaternion);

            objectsToUpdate.forEach(object => {
                object.mesh.position.copy(object.body.position);
                object.mesh.quaternion.copy(object.body.quaternion);
            });

            controls.update();
            renderer.render(scene, camera);
        };
        animationId = requestAnimationFrame(tick);

        return () => {
            gui.destroy();
            window.removeEventListener('resize', handleResize);
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('keyup', handleKeyUp);
            if (mountRef.current) {
                mountRef.current.removeChild(renderer.domElement);
            }
            cancelAnimationFrame(animationId);
        };
    }, []);

    return <div ref={mountRef} />;
};

export default EscenarioCannon;
