import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'

const ImportarModelos = () => {
  const mountRef = useRef(null)

  useEffect(() => {
    let mixers = [] // Lista de mezcladores de animación
    const sizes = { width: window.innerWidth, height: window.innerHeight }

    // Crear y agregar el canvas
    const canvas = document.createElement('canvas')
    canvas.classList.add('webgl')
    mountRef.current.appendChild(canvas)

    // Escena y renderizador
    const scene = new THREE.Scene()
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    // Cámara
    const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
    camera.position.set(4, 4, 4)
    scene.add(camera)

    // Controles de órbita
    const controls = new OrbitControls(camera, canvas)
    controls.enableDamping = true

    // Iluminación
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 2)
    directionalLight.castShadow = true
    directionalLight.position.set(5, 5, 5)
    scene.add(directionalLight)

    // Cargar HDR
    const rgbeLoader = new RGBELoader()
    const pmremGenerator = new THREE.PMREMGenerator(renderer)
    pmremGenerator.compileEquirectangularShader()
    rgbeLoader.load('/textures/0/restaurant.hdr', (hdrTexture) => {
      const envMap = pmremGenerator.fromEquirectangular(hdrTexture).texture
      scene.environment = envMap
      scene.background = envMap
      hdrTexture.dispose()
      pmremGenerator.dispose()
    })

    // Cargadores GLTF y DRACO
    const dracoLoader = new DRACOLoader()
    dracoLoader.setDecoderPath('/draco/')
    const gltfLoader = new GLTFLoader()
    gltfLoader.setDRACOLoader(dracoLoader)

    // Función para cargar modelos
    const cargarModelo = (ruta, escala, posicion) => {
      gltfLoader.load(ruta, (gltf) => {
        const modelo = gltf.scene
        modelo.scale.set(escala, escala, escala)
        modelo.position.set(...posicion)
        scene.add(modelo)

        // Si el modelo tiene animaciones, inicializarlas
        if (gltf.animations.length > 0) {
          const mixer = new THREE.AnimationMixer(modelo)
          mixers.push(mixer)
          const action = mixer.clipAction(gltf.animations[0])
          action.play()
        }
      })
    }

    // Cargar modelos con animación
    cargarModelo('/models/image1/image1.glb', 2.0, [0, 0.8, 0])
    cargarModelo('/models/image2/image2.glb', 1.0, [2, 1, -2])
    cargarModelo('/models/image3/image3.glb', 1.2, [-1, 1, 1])
    cargarModelo('/models/image4/image4.glb', 0.03, [0, 0, 1])
    cargarModelo('/models/image5/image5.glb', 0.7, [2, 0, -2])

    // Animación
    const clock = new THREE.Clock()
    const tick = () => {
      const deltaTime = clock.getDelta()
      mixers.forEach(mixer => mixer.update(deltaTime))

      controls.update()
      renderer.render(scene, camera)
      requestAnimationFrame(tick)
    }
    tick()

    // Manejo de redimensionamiento
    const handleResize = () => {
      sizes.width = window.innerWidth
      sizes.height = window.innerHeight
      camera.aspect = sizes.width / sizes.height
      camera.updateProjectionMatrix()
      renderer.setSize(sizes.width, sizes.height)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (mountRef.current.contains(canvas)) {
        mountRef.current.removeChild(canvas)
      }
    }
  }, [])

  return <div ref={mountRef} />
}

export default ImportarModelos
