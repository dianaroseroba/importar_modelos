(function () {
    if (!window.Leap) return;
  
    Leap.plugin('riggedHand', function (scope) {
      scope.parent = scope.parent || new THREE.Scene();
      const handsMap = {}; // ✅ Mapeo por hand.id
  
      return {
        hand: function (hand) {
          if (!handsMap[hand.id]) {
            const handGroup = new THREE.Group();
            const boneMeshes = [];
  
            hand.fingers.forEach((finger) => {
              ['metacarpal', 'proximal', 'medial', 'distal'].forEach((boneName) => {
                const bone = finger[boneName];
                const boneMesh = new THREE.Mesh(
                  new THREE.CylinderGeometry(1, 1, 20, 8),
                  new THREE.MeshNormalMaterial()
                );
                scope.parent.add(boneMesh);
                boneMeshes.push({ bone, mesh: boneMesh });
              });
            });
  
            handsMap[hand.id] = { boneMeshes, group: handGroup };
          }
  
          const { boneMeshes } = handsMap[hand.id];
  
          boneMeshes.forEach(({ bone, mesh }) => {
            const pos = bone.center();
            const dir = bone.direction();
  
            mesh.position.set(pos[0], pos[1], pos[2]);
  
            const quat = new THREE.Quaternion().setFromUnitVectors(
              new THREE.Vector3(0, 1, 0),
              new THREE.Vector3(dir[0], dir[1], dir[2])
            );
            mesh.setRotationFromQuaternion(quat);
          });
  
          if (scope.renderFn) scope.renderFn();
        },
  
        removeHand: function (hand) {
          const handData = handsMap[hand.id];
          if (handData) {
            handData.boneMeshes.forEach(({ mesh }) => {
              scope.parent.remove(mesh);
              mesh.geometry.dispose();
              mesh.material.dispose();
            });
            delete handsMap[hand.id];
          }
        },
      };
    });
  })();
  