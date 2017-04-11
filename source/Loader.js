import { 
    LoadingManager, 
    ImageLoader, 
    AudioLoader, 
    JSONLoader,
    ObjectLoader, 
    Loader as ThreeLoader, 
    FileLoader
} from 'three';
import OBJLoader from 'three-examples/OBJLoader';

// From: http://stackoverflow.com/a/37134718
// Gets file extension from URL, or return false if there's no extension
function getExtension(url) {
    // Extension starts after the first dot after the last slash
    var extStart = url.indexOf('.',url.lastIndexOf('/')+1);
    if (extStart==-1) return false;
    var ext = url.substr(extStart+1),
        // end of extension must be one of: end-of-string or question-mark or hash-mark
        extEnd = ext.search(/$|[?#]/);
    return ext.substring (0,extEnd);
}

class DataLoader extends ThreeLoader
{
    constructor()
    {
        super();
    }
    
    load(url, onLoad, onProgress, onError)
    {
        var scope = this;

        var loader = new FileLoader(scope.manager);
        loader.load(url, function (text) {
            onLoad(JSON.parse(text));
        }, onProgress, onError);
    }
}

/**
 * THREE.js preloader
 */
class Loader
{
    /**
     * Create new preloader
     * @param {Function} errorHandler - Callback when error occurs 
     */
    constructor(errorHandler)
    {
        this.errorHandler = errorHandler;
        this.assets = {};
        this.sizes = {};

        this.loadingManager = new LoadingManager();
        this.loaders = {
            jpg: ImageLoader,
            json: DataLoader,
            m4a: AudioLoader,
            mp3: AudioLoader,
            mp4: AudioLoader,
            obj: OBJLoader,
            ogg: AudioLoader,
            png: ImageLoader,
            three: ObjectLoader,
            two: JSONLoader,
            wav: AudioLoader
        };
    }

    /**
     * Set the sizes of files so that the loader can better
     * report the overall loading progress. The given hash should
     * have keys with the same url as used in the registered dependencies
     * and objects as values that have a size property measured in bytes.
     * Multiple calls to setFileSizes will not replace the existing sizes.
     * @param {Object} sizes - The sizes hash
     */
    setFileSizes(sizes)
    {
        Object.assign(this.sizes, sizes);
    }

    /**
     * Register a new asset with the preloader.
     * @param {String} name - Name of the asset
     * @param {String[]} [dependencies] - Other assets this asset depends on (name or url)
     * @param {Function} [setup] - Handler called when asset is loaded (optional)
     */
    register(name, dependencies, setup)
    {
        if (!Array.isArray(dependencies)) {
            dependencies = [dependencies];
        }

        this.assets[name] = {
            name: name,
            dependencies: dependencies,
            setup: setup,
            result: null,
            progress: null,
            onLoaded: []
        };
    }

    /**
     * Register a static asset that doesn't have any dependencies
     * and doesn't need to be set up.
     * @param {String} name - Name of the asset
     * @param {Object} result - The asset object
     */
    registerStatic(name, result)
    {
        this.assets[name] = {
            name: name,
            dependencies: [],
            setup: undefined,
            result: result,
            progress: null,
            onLoaded: []
        };
    }

    /**
     * Check if a an asset is loaded.
     * @param {String} name - Name of the asset
     * @returns {Boolean} wether the asset is loaded
     */
    isLoaded(name)
    {
        return this.assets[name] && this.assets[name].result;
    }

    /**
     * Get or start loading an asset and all its dependencies.
     * @param {String|String[]} names - Name of the asset(s), as defined with {@link register}
     * @param {Function} callback - Callback called when asset is loaded
     * @param {Function} [progress] - Callback called with loading progress
     */
    get(names, callback, onProgress = null, context = null)
    {
        if (!Array.isArray(names)) {
            names = [names];
        }

        var toLoad = names.length;
        var results = [];

        var self = this;
        var onLoad = function(i, result) {
            results[i] = result;
            toLoad--;

            if (toLoad == 0) {
                self.deps = names;
                callback.apply(self, results);
                self.deps = null;
            }
        };

        var loadingProgress = context;
        if (onProgress) {
            loadingProgress = [];
            var progress = function() {
                var totalSize = 0;
                var loadedSize = 0;
                for (var arr of loadingProgress) {
                    for (var item of arr) {
                        totalSize += item.total;
                        loadedSize += item.loaded;
                    }
                }
                onProgress(totalSize > 0 ? loadedSize / totalSize : 0);
                if (toLoad > 0) {
                    requestAnimationFrame(progress);
                }
            };
            progress();
        }

        for (let i = 0; i < names.length; i++) {
            var name = names[i];

            if (this.assets[name] === undefined) {
                throw new Error(`Unknown asset with name '${name}'`);
            }

            if (this.isLoaded(name)) {
                onLoad(i, this.assets[name].result);
            } else {
                this._load(name, function(result) {
                    onLoad(i, result);
                }, loadingProgress);
            }
        }
    }

    _getSize(url)
    {
        if (this.sizes[url] === undefined) {
            console.warn(`Size of '${url}' is unknown. Progress reporting will be erratic.`);
            return 0;
        }
        return this.sizes[url].size;
    }

    _load(name, callback, loadingProgress = null)
    {
        var asset = this.assets[name];
        
        if (asset.progress) {
            // Asset is already being loaded, just wait for it to be finished
            if (loadingProgress) {
                loadingProgress.push(asset.progress);
            }
            asset.onLoaded.push(function() {
                callback(asset.result);
            });
            return;
        }
        
        asset.progress = [];
        if (loadingProgress) {
            loadingProgress.push(asset.progress);
        }

        var setup = asset.setup;
        if (setup === undefined) {
            setup = function() {
                if (arguments.length == 1) {
                    return arguments[0];
                } else {
                    return Array.apply(null, arguments);
                }
            };
        }

        var results = [];
        var toLoad = 0;
        var self = this;
        var onLoad = function(i, result) {
            results[i] = result;
            toLoad--;

            if (toLoad <= 0) {
                // Dependencies loaded, call back and clean up
                self.onComplete = function(result) {
                    asset.result = result;
                    callback(asset.result);
                    for (let cb of asset.onLoaded) {
                        cb();
                    }
                    asset.progress = null;
                    asset.onLoaded = null;
                };
                self.deps = asset.dependencies;
                self.context = loadingProgress;
                
                var result = setup.apply(self, results);
                if (result != Loader.DEFER) {
                    self.onComplete(result);
                }
                
                self.deps = null;
                self.onComplete = null;
                self.context = null;
            }
        };

        if (!asset.dependencies || asset.dependencies.length == 0) {
            // Asset has no dependencies (e.g. generator setup method)
            onLoad(0, undefined);
        } else {
            toLoad = asset.dependencies.length;
            for (let i = 0; i < asset.dependencies.length; i++) {
                let dep = asset.dependencies[i];
                if (typeof dep !== 'string') {
                    onLoad(i, dep);
                }
                
                let ext = getExtension(dep);
                if (!ext) {
                    // Dependency is another asset
                    if (this.assets[dep] === undefined) {
                        throw new Error(`Unknown dependency with name '${dep}'`);
                    }
                    if (this.isLoaded(dep)) {
                        onLoad(i, this.assets[dep].result);
                    } else {
                        this._load(dep, function(result) {
                            onLoad(i, result);
                        }, loadingProgress);
                    }
                } else {
                    // Dependency is an URL
                    ext = ext.toLowerCase();
                    if (this.loaders[ext] === undefined) {
                        throw new Error(`No loader for file extension '${ext}'`);
                    }
                    var progress = {
                        total: this._getSize(dep),
                        loaded: 0
                    };
                    asset.progress.push(progress);
                    // TODO: Reuse loaders?
                    var loader = new this.loaders[ext](this.loadingManager);
                    var self = this;
                    loader.load(dep, 
                        function(result) {
                            onLoad(i, result);
                        }, 
                        function(event) {
                            if (event.total > 0) {
                                progress.total = event.total;
                            }
                            progress.loaded = event.loaded;
                        }, 
                        function(error) {
                            var msg = `Error loading '${dep}' from asset '${asset.name}': ${error.target.statusText}`;
                            if (self.errorHandler !== undefined) {
                                self.errorHandler(msg, error);
                            } else {
                                console.error(msg);
                            }
                            onLoad(i, null);
                        }
                    );
                }
            }
        }
    }
}

// Return value to indicate the setup function will defer the result
// to this.onComplete(result) instead of returning it
Loader.DEFER = 'DEFER';

export default Loader;