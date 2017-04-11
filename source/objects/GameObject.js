import { Object3D, Vector3, Quaternion } from 'three';
import Loader from 'Loader';

export default class GameObject extends Object3D
{
    static update(scene, time, deltaTime)
    {
        if (scene != null && scene.gameObjects != null) {
            for (var go of scene.gameObjects) {
                if (go._enabled === true && go.assets != null) {
                    if (!go._started) {
                        go._started = true;
                        go.dispatchEvent({ type: 'start' });
                        go.onStart(time);
                    }
                    go.update(time, deltaTime);
                }
            }
        }
    }
    
    constructor(dependencies = null)
    {
        super();
        this.type = 'GameObject';
        
        this._enabled = true;
        this._scene = null;
        this._started = false;
        
        this.addEventListener('added', this.onAdded);
        this.addEventListener('removed', this.onRemoved);

        this.boundAddedToScene = this._addedToScene.bind(this);
        this.highestParent = null;
        
        this.assets = null;
        if (dependencies != null) {
            // Load assets and fill this.assets
            Loader.main.get(
                dependencies, 
                function(...values) {
                    this.assets = {};
                    for (var i = 0; i < values.length; i++) {
                        this.assets[dependencies[i]] = values[i];
                    }
                    this.onAssetsLoaded();
                }.bind(this)
            );
        } else {
            this.assets = {};
        }
    }
    
    onAssetsLoaded()
    {
        if (this._scene != null && this._enabled) {
            this.onEnable();
        }
    }
    
    onAdded(event)
    {
        this._addedToScene(event);
    }
    
    _addedToScene(event)
    {
        if (this.highestParent !== null) {
            this.highestParent.removeEventListener('added', this.boundAddedToScene);
            this.highestParent = null;
        }

        this._scene = this.parent;
        while (this._scene.parent != null) {
            this._scene = this._scene.parent;
        }
        
        if (this._scene.type !== 'Scene') {
            // Parent not yet added to scene, wait for it to being added
            this.highestParent = this._scene;
            this.highestParent.addEventListener('added', this.boundAddedToScene);
            this._scene = null;
            return;
        }

        if (!(this._scene.gameObjects != null)) {
            this._scene.gameObjects = [];
        }
        
        this._scene.gameObjects.push(this);
        
        if (this._enabled && this.assets != null) {
            this.onEnable();
        }
    }

    onRemoved(event)
    {
        if (this.highestParent !== null) {
            this.highestParent.removeEventListener('added', this.boundAddedToScene);
            this.highestParent = null;
        }

        if (this._scene.gameObjects != null) {
            var index = this._scene.gameObjects.indexOf(this);
            if (index >= 0) {
                this._scene.gameObjects.splice(index, 1);
            }
        }
        
        if (this._enabled && this.assets != null) {
            this.onDisable();
        }
        
        this._scene = null;
    }
    
    set enabled(enabled)
    {
        if (this._enabled === enabled) {
            return;
        }
        
        this._enabled = enabled;
        
        if (this._scene != null && this.assets != null) {
            if (this._enabled) {
                this.onEnable();
            } else {
                this.onDisable();
            }
        }
    }
    
    // ------ Events ------

    get enabled()
    {
        return this._enabled;
    }
    
    onEnable()
    {
        //
    }
    
    onDisable()
    {
        //
    }
    
    onStart()
    {
        //
    }
    
    update(time, deltaTime)
    {
        //
    }

    // ------ Helpers ------

    _updateMatrixWorldNonRecursive(target)
    {
        if ( target.matrixAutoUpdate === true ) target.updateMatrix();

        if ( target.matrixWorldNeedsUpdate === true || force === true ) {
            if ( target.parent === null ) {
                target.matrixWorld.copy( target.matrix );
            } else {
                target.matrixWorld.multiplyMatrices( target.parent.matrixWorld, target.matrix );
            }
            target.matrixWorldNeedsUpdate = false;
        }
    }

    _getWorldQuaternionWithoutMatrixUpdate(target, optionalTarget)
    {
        var position = new Vector3();
        var scale = new Vector3();
        var result = optionalTarget || new Quaternion();
        target.matrixWorld.decompose( position, result, scale );
        return result;
    }
}