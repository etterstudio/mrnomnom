import * as THREE from 'three';

import OBJLoader from 'three-examples/OBJLoader';
import dat from 'dat.gui';
import URLSearchParams from 'url-search-params';

import Maath from 'math/Maath';
import Polar2 from 'math/Polar2';

import CollisionObject from 'objects/CollisionObject';
import Figure from 'objects/Figure';
import Block from 'objects/Block';
import Bee from 'objects/Bee';
import MrNomNom from 'MrNomNom';
import Loader from 'Loader';

import Boombox from 'audio/Boombox';
import Sounds from 'config/Sounds';
import Sprite_Effects from 'config/Sprite_Effects';
import Sprite_Sounds from 'config/Sprite_Sounds';

import Filesizes from '../Filesizes';

/*
Animation Notes (2016-11-11):
- Animations were created in Cinema4D, exported to Collada,
  imported into Blender and exported using three.js' exporter plugin
  (https://github.com/mrdoob/three.js/tree/dev/utils/exporters/blender)
- With FBX the animation would always be baked to keyframes, which 
  increases the file size.
- When importing the Collada in Blender, it was important to 
  check «Fix Leaf Bones», «Find Bone Chains» and «Auto Connect»
  in the import settings for the animation to be imported correctly.
- There's two main ways of exporting to three.js in Blender, depnding
  on wether «Scene» is selected in three.js plugin's export settings.
  Without «Scene» a legacy JSON is exported that has to be loaded 
  using JSONLoader, which is apprently being phased out. With 
  «Scene» selected, the newer ObjectLoader has to be used.
- Only by disabling Scene and using JSONLoader did the animation play
  correctly in three.js.
- When not selecting «Scene», the mesh to be exported has to be
  selected (not the pose or armature) and a keyframe activated 
  where the mesh is in its bind pose (according to Github) 
  before exporting.
- Export settings in Blender:
  GEOMETRY: Additionally select Bones and Skinning
  Type: Select Geometry (BufferGeometry doesn't export animations)
  Skeletal Animation: Pose (the Mesh disappeared when playing animations
    when exported using Rest)
  Keyframe animation: Check «Keyframe animation» and «Embed animation»
  SCENE: Check nothing
- In three.js make sure to enable «skinning» on the material. Then use
  «AnimationMixer» to play the animation clip. There's currently no 
  documentation, only samples. E.g.
  https://github.com/mrdoob/three.js/blob/dev/examples/js/BlendCharacter.js
*/

// ------ Config ------

var config = {
    // Enable debugging (fps counter, dat.gui etc)
    debug: 'false',
    // Visualize collisions sizes and state
    debugCollisions: 'false',
    // Height of camera above ground
    cameraHeight: '',
    // Number of characters to spawn (empty = default)
    figures: '',
    // Starting round (empty = start with intro)
    round: '',
    // Allow free movement of camera
    free: 'false'
};

var searchParams = new URLSearchParams(location.search);
for (var key in config) {
    if (searchParams.has(key)) {
        config[key] = searchParams.get(key);
    }
}

if (config.debugCollisions !== 'false') {
    CollisionObject.debug = true;
}

// ------ Assets ------

var loader = new Loader(function(msg, error) {
    console.error(msg);
});
Loader.main = loader;

loader.registerStatic('config', config);

loader.register(
    'game',
    [
        'config'
    ],
    function(config) {
        var game = new MrNomNom(config);
        window.game = game;
        return game;
    }
)

loader.register(
    'boombox',
    [
        'game'
    ],
    function(game) {
        var box = new Boombox(game.listener);
        
        var onComplete = this.onComplete;
        var toLoad = 0;
        var onLoaded = ()=> {
            toLoad--;
            if (toLoad == 0) {
                onComplete(box);
            }
        };
        
        toLoad++;
        box.loadConfig(Sounds, loader, this.context, onLoaded);
        
        toLoad++;
        box.loadSprite(Sprite_Effects, loader, this.context, onLoaded);

        toLoad++;
        box.loadSprite(Sprite_Sounds, loader, this.context, onLoaded);
        
        return Loader.DEFER;
    }
);

loader.register(
    'landscape',
    [],
    function() {
        var landscape =  new THREE.Group();
        
        // -- Ground
        
        var geom = new THREE.PlaneBufferGeometry(128, 128, 1, 1);
        var mat = new THREE.MeshLambertMaterial({ color: 0x32138c });
        var ground = new THREE.Mesh(geom, mat);
        ground.name = 'ground';
        ground.rotation.set(-Math.PI / 2, 0, 0);
        ground.receiveShadow = true;
        landscape.add(ground);
        
        return landscape;
    }
);

loader.register(
    'faces',
    [
        'img/Faces.json',
        'img/Faces.png',
        'img/Faces-2.png',
        'img/Faces-3.png'
    ],
    function(metadata, atlas1, atlas2, atlas3) {
        var atlas1Tex = new THREE.Texture(atlas1);
        atlas1Tex.needsUpdate = true;
        
        var atlas2Tex = new THREE.Texture(atlas2);
        atlas2Tex.needsUpdate = true;
        
        var atlas3Tex = new THREE.Texture(atlas3);
        atlas3Tex.needsUpdate = true;
        
        var textures = {
            'Faces.png': atlas1Tex,
            'Faces-2.png': atlas2Tex,
            'Faces-3.png': atlas3Tex
        };
        
        var faces = {};
        var nameRegex = /^face_([^_]+)(?:_([^_0-9]+))?(?:_([0-9]+))?$/;
        for (var atlas of metadata.atlantes) {
            var tex = textures[atlas.name];
            if (!tex) {
                console.warn(`Atlas named '${atlas.name}' not found.`);
                continue;
            }
            
            for (var sprite of atlas.sprites) {
                var info = nameRegex.exec(sprite.name);
                if (!info) {
                    console.warn(`Failed to parse name '${sprite.name}' of faces JSON.`);
                    continue;
                }
                
                sprite.texture = tex;
                
                var faceName = info[1];
                var faceType = info[2] || 'nrm';
                var spriteNum = parseInt(info[3]) || 0;
                
                if (!faces[faceName]) {
                    faces[faceName] = {};
                }
                if (!faces[faceName][faceType]) {
                    faces[faceName][faceType] = [];
                }
                faces[faceName][faceType][spriteNum] = sprite;
            }
        }
        
        return faces;
    }
);

loader.register(
    'models',
    [
        'models/donut.obj'
    ],
    function(...input) {
        var result = {};
        var bb = new THREE.Box3();
        for (var i = 0; i < this.deps.length; i++) {
            var mesh;
            if (input[i] instanceof THREE.Geometry) {
                // Exporting a mesh via Blender results in a Geometry
                if (input[i].bones && input[i].bones.length > 0) {
                    var mat = new THREE.MeshBasicMaterial({ skinning: true, color: 0x000000 });
                    mesh = new THREE.SkinnedMesh(input[i], mat);
                } else {
                    mesh = new THREE.Mesh(input[i], new THREE.MeshBasicMaterial());
                }
            } else if (input[i] instanceof THREE.Group) {
                // Wavefront OBJ files are loaded as Group
                mesh = input[i].children[0];
            } else if (input[i] instanceof THREE.Scene) {
                // Some files are also loaded as Scene
                input[i].traverse(function(obj) {
                    if (obj instanceof THREE.Mesh || obj instanceof THREE.SkinnedMesh) {
                        mesh = obj;
                    }
                });
            }
            
            mesh.position.set(0, 0, 0);
            mesh.castShadow = true;
            mesh.receiveShadow = false;

            bb.setFromObject(mesh);
            var baseSize = bb.max.clone().sub(bb.min);

            var path = this.deps[i];
            var name = path.substring(path.lastIndexOf('/') + 1, path.lastIndexOf('.'));
            result[name] = {
                mesh: mesh,
                baseSize: baseSize
            };
        }
        return result;
    }
);

loader.register(
    'textures',
    [
        'models/colors.png'
    ],
    function(...images)
    {
        var result = {};
        for (var i = 0; i < images.length; i++) {
            var texture = new THREE.Texture();
            texture.image = images[i];
            texture.needsUpdate = true;
            
            var path = this.deps[i];
            var name = path.substring(path.lastIndexOf('/') + 1, path.lastIndexOf('.'));
            texture.name = name;
            result[name] = texture;
        }
        return result;
    }
);

loader.register(
    'bee',
    [],
    function() {
        return new Bee();
    }
);

// ------ Start Game ------

loader.setFileSizes(Filesizes);

loader.get(['config', 'game'], function(config, game) {
    var loader = window.nomloader;

    // The loader simulates progress until main.js is loaded
    // Stop simulation now as this executes from main.js
    loader.stopSimulation();
    
    // Check if the loader already displays the progress bar
    var progressReady = true;
    var startProgress = loader.progress;
    if (startProgress < 0) {
        // Progress bar is not yet shown, wait for it to appear 
        progressReady = false;
        loader.onProgressReady = function() {
            progressReady = true;
        };
    }
    
    var startGame = function() {
        loader.complete();
        game.start(loader.hide, loader.show);
    };
    
    game.load(
        function(progress) {
            if (!progressReady) {
                // We're waiting for the progress bar to appear
                // Record the loading progress so it can be deducted later
                startProgress = -progress;
            } else {
                if (startProgress < 0) {
                    // We've started loading before the progress bar appeared,
                    // deduct the initial progress so the bar always starts at 0
                    progress = (progress + startProgress) / (1 + startProgress);
                } else {
                    // We've started loading after the progress bar appeared,
                    // take over from the simulated progress bar's position
                    progress = startProgress + (1 - startProgress) * progress;
                }
                loader.setProgress(progress);
            }
        },
        function() {
            if (config.round === '') {
                // Enforce the minimum display time of the title
                loader.delayStart(startGame);
            } else {
                startGame();
            }
        }
    );
});

// ------ Misc ------

if (config.debug === 'true') {
    // Debug GUI
    window.addEventListener('load', function() {
        loader.get(
            ['game', 'landscape'], 
            function(game, landscape) {
                var gui = new dat.GUI();
                gui.add(game, 'cameraHeight', 0.1, 50).listen();
                gui.add(landscape.children[0], 'visible').name('Ground');
            }
        );
    });
}
