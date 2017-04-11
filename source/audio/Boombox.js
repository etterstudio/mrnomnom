import Loader from 'Loader';
import Cassette from 'audio/Cassette';

/**
 * Sound manager.
 * Loads and configures sounds and allows to play them
 * globally or get an instance to play multiple sounds
 * concurrently.
 */
export default class Boombox
{
    constructor(listener)
    {
        this.extension = this.chooseAudioFormat();
        this.listener = listener;
        this.config = null;
    }
    
    chooseAudioFormat()
    {
        var elem = document.createElement('audio');
        if (typeof elem.canPlayType != 'function')
            return false;
        
        if (elem.canPlayType('audio/mp4'))
            return 'm4a';
        
        if (elem.canPlayType('audio/ogg'))
            return 'ogg';

        console.warn("Browser doesn't support either M4A nor OGG audio.");
        return false;
    }

    loadConfig(config, loader = null, loaderContext = null, onReady = null)
    {
        if (!this.extension)
            return;

        this.config = config;
        
        loader = loader || Loader.main;
        if (!loader) {
            console.error('Boombox: No loader given and Loader.main is not set.');
            return;
        }
        
        // Load files defined in config
        var loading = 0;
        var onLoaded = ()=> {
            loading--;
            if (loading <= 0 && onReady) {
                onReady.call(this);
            }
        };
        
        for (var name in config) {
            if (name === 'default')
                continue;
            
            var sound = config[name];
            sound.name = name;
            
            this._processFiles(sound, (group, files)=> {
                loading++;
                this._load(loader, loaderContext, sound, files, group, onLoaded);
            });
        }

        if (loading == 0) {
            console.warn("Boombox: Config doesn't define any files to load.");
            if (onReady) {
                onReady.call(this);
            }
        }
    }
    
    loadSprite(config, loader = null, loaderContext = null, onReady = null)
    {
        if (!this.extension)
            return;

        var url = '';
        for (var candidate of config.urls) {
            if (candidate.endsWith(this.extension)) {
                url = candidate;
                break;
            }
        }

        if (url.length == 0) {
            log.warn("Sprite doesn't have needed " + this.extension + " version");
            return;
        }

        var loaderName = 'boombox.audiosprite.' + url;
        loader.register(loaderName, url);
        loader.get(loaderName, (buffer)=> {
            for (var name in this.config) {
                if (name === 'default')
                    continue;
                
                var sound = this.config[name];
                this._processFiles(sound, (group, files)=> {
                    for (var i = 0; i < files.length; i++) {
                        if (!this._isSpriteReference(files[i]))
                            continue;
                        
                        var name = files[i].substr(1);
                        var sprite = config.sprite[name];
                        if (sprite === undefined)
                            continue;
                        
                        var info = {
                            buffer: buffer, 
                            start: sprite[0] / 1000, 
                            duration: sprite[1] / 1000
                        };
                        
                        if (group === null) {
                            if (!sound.buffers)
                                sound.buffers = [];
                            sound.buffers[i] = info;
                        } else {
                            if (!sound.buffers)
                                sound.buffers = {};
                            if (!sound.buffers[group])
                                sound.buffers[group] = [];
                            sound.buffers[group][i] = info;
                        }
                    }
                });
            }
            
            if (onReady) {
                onReady.call(this);
            }
        }, null, loaderContext);
    }
    
    _processFiles(sound, callback)
    {
        if (!sound.files)
            return;
        
        if (typeof sound.files === 'string') {
            callback(null, [sound.files]);
        } else if (Array.isArray(sound.files)) {
            callback(null, sound.files);
        } else if (typeof sound.files === 'object') {
            for (var groupName in sound.files) {
                var group = sound.files[groupName];
                if (typeof group === 'string') {
                    callback(groupName, [group]);
                } else if (Array.isArray(group)) {
                    callback(groupName, group);
                } else {
                    console.error(`Boombox: Sound ${sound.name}, group {$groupName}: groups must be string or object.`);
                }
            }
        } else {
            console.error(`Boombox: Sound ${sound.name}: 'files' must be string, array or object.`);
        }
    }
    
    _fillBuffers(target, source)
    {
        for (var i = 0; i < source.length; i++) {
            if (source[i]) {
                target[i] = source[i];
            }
        }
    }
    
    _isSpriteReference(file)
    {
        return file.startsWith('#');
    }
    
    _load(loader, loaderContext, sound, files, group = null, onLoaded = null)
    {
        files = files.filter((e) => !this._isSpriteReference(e));
        files = files.map((e) => e + '.' + this.extension);

        if (files.length == 0) {
            if (onLoaded) {
                onLoaded();
            }
            return;
        }
        
        var loaderName = 'boombox.' + group + '.' + sound.name;
        loader.register(loaderName, files);
        loader.get(loaderName, (buffers)=> {
            if (!Array.isArray(buffers)) {
                buffers = [buffers];
            }
            
            if (group === null) {
                if (!sound.buffers)
                    sound.buffers = [];
                this._fillBuffers(sound.buffers, buffers);
            } else {
                if (!sound.buffers)
                    sound.buffers = {};
                if (!sound.buffers[group])
                    sound.buffers[group] = [];
                this._fillBuffers(sound.buffers[group], buffers);
            }
            
            if (onLoaded) {
                onLoaded();
            }
        }, null, loaderContext);
    }
    
    _createCassette(name, group = null)
    {
        var sound = this.config[name];
        if (sound === undefined) {
            console.error(`No sound named '${name}' defined.`);
            return;
        }
        
        if (group && sound.files[group] === undefined) {
            console.error(`Sound '${name}' has no group named '${group}'.`);
            return;
        }
        
        return new Cassette(this.listener, this.config.default, sound, group);
    }
    
    /**
     * Get available groups of the given sound.
     * @returns {Array} Array of group names or null if the sound doesn't have groups
     */
    getGroups(name)
    {
        var sound = this.config[name];
        if (sound === undefined) {
            console.error(`No sound named '${name}' defined.`);
            return null;
        }
        
        if (Array.isArray(sound.buffers)) {
            return null;
        } else {
            return Object.keys(sound.buffers);
        }
    }
    
    /**
     * Play a shared cassette.
     * @param {String} name - Name of sound to play
     * @param {String} [group] - Name of the group to play, if the sound has groups
     * @param {Vector3} [position] - World position to play sound at (positional sounds only)
     * @param {Boolean} [loop] - Wether to loop the cassette
     * @returns {Cassette} Instance of playing sound  
     */
    play(name, group = null, position = null, loop = false)
    {
        var shared = this.getSharedCassette(name, group);
        if (!shared) return null;
        
        shared.play(position, loop);
        return shared;
    }
    
    /**
     * Get a shared instance of a cassette.
     * @param {String} name - Name of sound to get Cassette for
     * @param {String} [group] - Name of the group to play, if the sound has groups
     * @returns {Cassette} Shared Cassette instance
     */
    getSharedCassette(name, group = null)
    {
        var sound = this.config[name];
        if (sound === undefined) {
            console.error(`No sound named '${name}' defined.`);
            return null;
        }
        
        if (!sound.shared) {
            sound.shared = this._createCassette(name, group);
        }
        
        return sound.shared;
    }
    
    /**
     * Get a new instance of a cassette.
     * @param {String} name - Name of sound to play
     * @param {String} [group] - Name of the group to play, if the sound has groups
     * @returns {Cassette} New Cassette that can be used to play the sound
     */
    getCassette(name, group = null)
    {
        return this._createCassette(name, group);
    }
}