import * as THREE from 'three';
import webvr from 'webvr-polyfill/webvr-polyfill';
import VRControls from 'three-examples/VRControls';
import VREffect from 'three-examples/VREffect';
import { EnterVRButton, State as VRUIState } from 'webvr-ui/build/webvr-ui';
import webAudioIos from 'web-audio-ios';
import Stats from 'stats.js';
import CubemapToEquirectangular from 'CubemapToEquirectangular';

import GameObject from 'objects/GameObject';
import Maath from 'math/Maath';

import ShadowMapViewer from 'three-examples/ShadowMapViewer';
import DebugDraw from 'three-debug-draw/draw';

export default class Game extends THREE.EventDispatcher
{
    constructor(config)
    {
        this.config = config;

        // --- THREE Setup ---

        this.isMobile = (window.screenX === 0 && 'ontouchstart' in window);

        // Setup three.js WebGL renderer. Note: Antialiasing is a big performance hit.
        // Only enable it if you actually need to.
        this.renderer = new THREE.WebGLRenderer({ antialias: !this.isMobile });
        this.renderer.setPixelRatio(Math.floor(window.devicePixelRatio));

        // Create a three.js scene.
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x32138c);
        this.scene.game = this;

        // Create a three.js camera.
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 200);
        this.scene.add(this.camera);

        // Set up audio
        this.listener = new THREE.AudioListener();
        this.camera.add(this.listener);

        // Workaround for audio muting on ios
        if (/iPad|iPhone|iPod/.test(navigator.platform)) {
            var context = this.listener.context;
            function iosUnlock() {
                webAudioIos(document.body, context, iosUnlockResult);
            }
            function iosUnlockResult(unlocked) {
                console.log('iOS WebAudio workaround: ' + unlocked);
                if (!unlocked) {
                    iosUnlock();
                }
            }
            iosUnlock();
        }

        // --- VR Setup ---
        
        this.landscapeCallback = null;

        // Apply VR headset positional data to camera.
        this.controls = new VRControls(this.camera);
        this.updateCameraHeight();
        this.camera.position.y = this.cameraHeight;
        this.enableControls = false;

        if (this.config.free === 'true') {
            this.controls.scale = 10;
            this.controls.standing = true;
        }

        // Apply VR stereo rendering to renderer.
        this.effect = new VREffect(this.renderer);
        this.effect.setSize(window.innerWidth, window.innerHeight);

        this.ui = document.getElementById('ui');
        this.notice = document.getElementById('notice');

        // Create WebVR UI button
        var buttonOptions = {
            color: 'white',
            background: false,
            corners: 'square',
            //beforeEnter: ()=>new Promise(this.onBeforeEnterVR.bind(this))
        };

        this.enterVR = new EnterVRButton(this.renderer.domElement, buttonOptions)
            .on("enter", this.onEnterVR.bind(this))
            .on("exit", this.onExitVR.bind(this))
            .on("error", function(error){
                console.error(error)
            });

        var container = document.getElementById("entervr-button");
        container.appendChild(this.enterVR.domElement);

        // Append the canvas element created by the renderer to document body element.
        document.body.appendChild(this.renderer.domElement);

        this.clock = new THREE.Clock();
        this._updateAndRenderBound = this._updateAndRender.bind(this);

        this.vrDisplay = null;
        this.enterVR.getVRDisplay()
            .then((display)=> {
                console.log(display);
                this.vrDisplay = display;
                this.vrDisplay.requestAnimationFrame(this._updateAndRenderBound);
            })
            .catch(()=> {
                // If there is no display available, fallback to window
                console.log("using window as VRDisplay");
                this.vrDisplay = window;
                this.vrDisplay.requestAnimationFrame(this._updateAndRenderBound);
            });

        // --- Scene Setup ---

        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
        this.scene.add(this.ambientLight);

        // --- Events ---

        window.addEventListener('resize', this.onResize.bind(this), true);
        window.addEventListener('vrdisplaypresentchange', this.onResize.bind(this), true);
        document.addEventListener("visibilitychange", this.onVisibilityChanged.bind(this), true);

        this.delayedCalls = [];
        this.tweens = [];

        // --- Debug ---

        if (config.debug === 'true') {
            this.stats = new Stats();
            this.stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
            document.body.appendChild(this.stats.dom);
            
            document.addEventListener('keydown', function(event) {
                if (event.keyCode == 83 && event.ctrlKey) { // S
                    this.exportPanorama();
                }
            }.bind(this));
        }
    }

    delay(fn, time)
    {
        this.delayedCalls.push({
            fn: fn,
            time: this.clock.elapsedTime + (time / 1000)
        })
    }

    animate(target, props, duration, onComplete)
    {
        if (!target)
            return;
        
        if (duration <= 0) {
            for (var name in props) {
                if (name in target) {
                    target[name] = props[name];
                }
            }
            if (typeof onComplete === 'function') {
                onComplete();
            }
            return;
        }

        var values = {};
        for (var name in props) {
            if (name in target) {
                var current = target[name];
                values[name] = {
                    start: current,
                    diff: props[name] - current
                };
            }
        }

        this.tweens.push({
            target: target,
            values: values,
            start: this.clock.elapsedTime,
            duration: duration,
            onComplete: onComplete
        });
    }

    easeInOutQuad(t) { 
        return t<.5 ? 2*t*t : -1+(4-2*t)*t
    }

    showVRUI()
    {
        this.ui.classList.remove('hidden');
        this.enableControls = false;
    }

    hideVRUI()
    {
        this.ui.classList.add('hidden');
        this.enableControls = true;
    }

    onBeforeEnterVR(resolve, reject)
    {
        if (!this.isMobile || window.matchMedia("(orientation: landscape)").matches) {
            resolve();
        } else {
            this.notice.classList.remove('hidden');
            this.landscapeCallback = resolve;
        }
    }

    onEnterVR()
    {
        //
    }

    onExitVR()
    {
        this.camera.quaternion.set(0, 0, 0, 1);
        this.camera.position.set(0, this.cameraHeight, 0);
    }

    exportPanorama(event)
    {
        if (!this.converter) {
            this.converter = new CubemapToEquirectangular(this.renderer, true);
        }
        
        this.converter.update(this.camera, this.scene);
    }

    onResize(e) {
        this.effect.setSize(window.innerWidth, window.innerHeight);
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
    }

    updateCameraHeight()
    {
        this.cameraHeight = parseFloat(this.config.cameraHeight) || 10;
    }

    onVisibilityChanged()
    {
        var context = this.listener.context;

        if (typeof context.suspend !== 'function' || typeof context.resume !== 'function')
            return;

        if (document.hidden) {
            if (context.state === 'running')
                this.listener.context.suspend();
        } else {
            if (context.state === 'suspended')
                this.listener.context.resume();
        }
    }

    _updateAndRender(timestamp) {
        if (this.stats) {
            this.stats.begin();
        }

        var time = this.clock.elapsedTime;
        var deltaTime = this.clock.getDelta();

        // Prevent big skips of time (e.g. when window was in background)
        if (deltaTime > 1) {
            deltaTime = 0.02;
        }

        // Waiting for landscape mode
        if (this.landscapeCallback) {
            if (window.matchMedia("(orientation: landscape)").matches) {
                this.notice.classList.add('hidden');
                this.landscapeCallback();
                this.landscapeCallback = null;
            }
        }

        this.scene.updateMatrixWorld();

        // Run delayed delayed calls
        for (var i = this.delayedCalls.length - 1; i >= 0; i--) {
            if (this.delayedCalls[i].time <= time) {
                this.delayedCalls[i].fn();
                this.delayedCalls.splice(i, 1);
            }
        }

        // Run tweens
        for (var i = this.tweens.length - 1; i >= 0; i--) {
            var tween = this.tweens[i];
            var pos = Maath.clamp01((this.clock.elapsedTime - tween.start) / tween.duration);
            pos = this.easeInOutQuad(pos);

            for (var name in tween.values) {
                var value = tween.values[name];
                tween.target[name] = value.start + value.diff * pos;
            }

            if (pos >= 1) {
                if (typeof tween.onComplete === 'function') {
                    tween.onComplete();
                }
                this.tweens.splice(i, 1);
            }
        }

        // Run updates
        this.update(time, deltaTime);
        GameObject.update(this.scene, time, deltaTime);
        this.dispatchEvent({ type: 'update', time: time, deltaTime: deltaTime });

        if (this.stats) {
            DebugDraw.render(this.scene);
        }
        
        if (this.enableControls) {
            // Update VR headset position and apply to camera.
            this.controls.update();

            // Allow free movement for roomscale VR
            var display = this.controls.getVRDisplay();
            if (this.config.free !== 'true' || !display || !display.stageParameters) {
                this.camera.position.set(0, this.cameraHeight, 0);
            }
        }
        
        if (this.enterVR && this.enterVR.isPresenting()) {
            // Render scene with WebGL
            this.renderer.render(this.scene, this.camera);
            // Apply WebVR effect
            this.effect.render(this.scene, this.camera);
        } else {
            this.renderer.render(this.scene, this.camera);
        }
        this.vrDisplay.requestAnimationFrame(this._updateAndRenderBound);

        if (this.lightShadowMapViewer) {
            this.lightShadowMapViewer.render(this.manager.renderer);
        }

        if (this.stats) {
            this.stats.end();
        }
    }

    update(time, deltaTime)
    {
        //
    }
}