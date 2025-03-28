import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import GUI from 'lil-gui';
import * as CANNON from 'cannon-es';
import { object } from 'framer-motion/client';

const Lab_6 = () => {
  const mountRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;

    /**
     * Debug UI
     */
    const gui = new GUI();
    const debugObject = {};

    /**
     * Base
     */
    const scene = new THREE.Scene();

    /**
     * Sonidos
     */
    const hitSound = new Audio('/static/sounds/hit.mp3');
    const playHitSound = (collision) => {
      const impactStrength = collision.contact.getImpactVelocityAlongNormal();
      if (impactStrength > 1.5) {
        hitSound.volume = Math.random();
        hitSound.currentTime = 0;
        hitSound.play();
      }
      //console.log(collision.contact.getImpactVelocityAlongNormal());

    }


    /**
     * Textures
     */
    const textureLoader = new THREE.TextureLoader();
    const cubeTextureLoader = new THREE.CubeTextureLoader();

    const environmentMapTexture = cubeTextureLoader.load(
      [
        '/static/textures/environmentMaps/0/px.png',
        '/static/textures/environmentMaps/0/nx.png',
        '/static/textures/environmentMaps/0/py.png',
        '/static/textures/environmentMaps/0/ny.png',
        '/static/textures/environmentMaps/0/pz.png',
        '/static/textures/environmentMaps/0/nz.png'
      ],
      /*
      *
          () => console.log("Textura de entorno cargada"),
          undefined,
          (error) => console.error("Error al cargar la textura de entorno", error)
      */
    );

    /**
     * Físicas
     */
    const world = new CANNON.World();
    //Estas lineas son claves para darle mejor naturalidad al mundo de Cannon
    //tambien en rendimiento
    world.broadphase = new CANNON.SAPBroadphase(world);
    //Permitir que los cuerpos duerman cuando no se muevan
    world.allowSleep = true;
    world.gravity.set(0, -9.82, 0);

    const defaultMaterial = new CANNON.Material('default');
    const defaultContactMaterial = new CANNON.ContactMaterial(
      defaultMaterial,
      defaultMaterial,
      { friction: 0.1, restitution: 0.6 }
    );
    world.addContactMaterial(defaultContactMaterial);
    world.defaultContactMaterial = defaultContactMaterial;

    // Piso
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

    /**
     * Luces
     */
    const ambientLight = new THREE.AmbientLight(0xffffff, 2.1);
    scene.add(ambientLight);
    gui.add(ambientLight, 'intensity').min(0).max(3).step(0.1).name('Amb. Light');

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.set(1024, 1024);
    directionalLight.shadow.camera.far = 15;
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    /**
     * Tamaños
     */
    const sizes = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    /**
     * Cámara
     */
    const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100);
    camera.position.set(-3, 3, 3);
    scene.add(camera);

    /**
     * Renderizador
     */
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    /**
     * Controles
     */
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    /**
     * Manejo de Resize
     */
    const handleResize = () => {
      sizes.width = window.innerWidth;
      sizes.height = window.innerHeight;
      camera.aspect = sizes.width / sizes.height;
      camera.updateProjectionMatrix();
      renderer.setSize(sizes.width, sizes.height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };
    window.addEventListener('resize', handleResize);


    /**
     * Objetos 
     */
    const objectsToUpdate = [];
    /**
     * Crear Esferas
     */

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
      body.addEventListener('collide', playHitSound)
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

    /**
     * Agregar cubos
     */

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
      body.addEventListener('collide', playHitSound)
      world.addBody(body);

      objectsToUpdate.push({ mesh, body });
    };

    createbox(0.5, 0.5, 0.5, { x: 0, y: 3, z: 0 });

    debugObject.createbox = () => {
      createbox(
        Math.random(),  // Ancho
        Math.random(),  // Alto
        Math.random(),  // Profundidad
        {                     // Posición
          x: (Math.random() - 0.5) * 3,
          y: 3,
          z: (Math.random() - 0.5) * 3
        }
      );
    };

    debugObject.reset = () => {
      for (const object of objectsToUpdate) {
        //Remove body
        object.body.removeEventListener('collide', playHitSound);
        world.removeBody(object.body);
        //Remove mesh
        scene.remove(object.mesh);
      }

      objectsToUpdate.splice(0, objectsToUpdate.length)
      //console.log('reset')
    }

    gui.add(debugObject, 'createbox')
    gui.add(debugObject, 'createSphere');
    gui.add(debugObject, 'reset');


    /**
     * Animación
     */
    const clock = new THREE.Clock();
    let oldElapsedTime = 0;
    let animationId;

    const tick = () => {
      animationId = requestAnimationFrame(tick);
      const elapsedTime = clock.getElapsedTime();
      const deltaTime = elapsedTime - oldElapsedTime;
      oldElapsedTime = elapsedTime;
      world.step(1 / 60, deltaTime, 3);
      objectsToUpdate.forEach(object => {
        object.mesh.position.copy(object.body.position);
        object.mesh.quaternion.copy(object.body.quaternion)
      });

      controls.update();
      renderer.render(scene, camera);
    };
    animationId = requestAnimationFrame(tick);

    /**
     * Cleanup
     */
    return () => {
      gui.destroy();
      window.removeEventListener('resize', handleResize);
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
      cancelAnimationFrame(animationId);
    };
  }, []);

  return <div ref={mountRef} />;
};

export default Lab_6;