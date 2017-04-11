import { Vector3, Audio, PositionalAudio } from 'three';

var zero = new Vector3();

export default class Cassette
{
    constructor(listener, defaults, sound, group = null)
    {
        this.defaults = defaults;
        this.sound = sound;
        this.group = group;
        
        this.removeAfterPlay = false;
        this._boundOnEnded = null;
        this.isSprite = false;
        this.buffers = [];
        this.currentBuffer = -1;
        this.lastBuffer = null;
        this.stopTimeout = null;
        
        if (this.group && sound.buffers[group] !== undefined) {
            this.buffers = sound.buffers[group];
        } else if (!this.group && Array.isArray(sound.buffers)) {
            this.buffers = sound.buffers;
        } else {
            console.error(`Sound '${sound.name}' got group '${group}' but sound.buffers is ${typeof sound.buffers}.`);
        }
        
        this.playback = this.getProperty('playback', 'random');
        
        if (this.getProperty('spatiality') === '2D') {
            this.audio = new Audio(listener);
        } else {
            this.audio = new PositionalAudio(listener);
            this.audio.panner.panningModel = this.getProperty('panningModel', 'HRTF');
            this.audio.panner.distanceModel = this.getProperty('distanceModel', 'inverse');
            this.audio.panner.refDistance = this.getProperty('refDistance', 1);
            this.audio.panner.maxDistance = this.getProperty('maxDistance', 10000);
            this.audio.panner.rolloffFactor = this.getProperty('rolloffFactor', 1);
        }
    }
    
    getProperty(name, defaultValue = undefined)
    {
        if (name in this.sound) {
            return this.sound[name];
        } else if (name in this.defaults) {
            return this.defaults[name];
        } else {
            return defaultValue;
        }
    }

    getNextBuffer()
    {
        if (this.buffers.length == 0) {
            this.currentBuffer = -1;
            return null;
        
        } else if (this.buffers.length == 1) {
            this.currentBuffer = 0;
        
        } else if (this.playback === 'random') {
            this.currentBuffer = Math.floor(Math.random() * this.buffers.length);
            
        } else if (this.playback === 'sequential') {
            this.currentBuffer = (this.currentBuffer + 1) % this.buffers.length;
            
        } else if (this.playback === 'ascending') {
            this.currentBuffer = Math.min(this.currentBuffer + 1, this.buffers.length - 1);

        } else {
            console.error(`Unknown playback mode '${this.playback}' in sound '${this.sound.name}'.`);
            return null;
        }
        
        return this.buffers[this.currentBuffer];
    }
    
    resetPlaybackMode()
    {
        this.currentBuffer = -1;
    }

    setPlaybackModeIndex(index)
    {
        this.currentBuffer = Math.min(index, this.buffers.length - 1) - 1;
    }

    get isPlaying()
    {
        return this.audio.isPlaying;
    }
    
    play(position = null, loop = false)
    {
        if (this.isPlaying)
            this.stop();
        
        this._clearStopTimeout();
        
        var buffer = this.getNextBuffer();
        if (!buffer)
            return this;
        
        this.isSprite = false;
        var startTime = 0;
        var duration = undefined;
        if (buffer.buffer) {
            this.isSprite = true;
            startTime = buffer.start;
            duration = buffer.duration;
            buffer = buffer.buffer;
        }
        
        this.audio.position.copy(position || zero);
        this.audio.setBuffer(buffer);
        this.audio.play(0, startTime, loop ? undefined : duration);
        this.loop(loop);
        
        var volume = this.getProperty('volume', 1);
        if (this.sound.fadeIn > 0) {
            var currentTime = this.audio.source.context.currentTime;
            var endTime = currentTime + this.sound.fadeIn;
            this.audio.gain.gain.setValueAtTime(0, currentTime);
            this.audio.gain.gain.linearRampToValueAtTime(volume, endTime);
        } else {
            this.audio.setVolume(volume);
        }
        
        if (this.removeAfterPlay) {
            if (!this._boundOnEnded) {
                this._boundOnEnded = this._onEnded.bind(this);
            }
            this.audio.source.addEventListener('ended', this._boundOnEnded);
        }
        
        return this;
    }
    
    loop(enable = true)
    {
        var buffer = this.buffers[this.currentBuffer];
        if (!buffer)
            throw new Error('Cannot set loop, no buffer selected.');
        
        this.audio.setLoop(enable);
        if (this.isSprite && enable) {
            this.audio.source.loopStart = buffer.start;
            this.audio.source.loopEnd = buffer.start + buffer.duration;
        } else {
            this.audio.source.loopStart = 0;
            this.audio.source.loopEnd = 0;
        }
    }
    
    stop(immediate = false)
    {
        this._clearStopTimeout();
        
        if (!immediate && this.sound.fadeOut > 0) {
            var currentTime = this.audio.source.context.currentTime;
            var endTime = currentTime + this.sound.fadeOut;
            this.audio.gain.gain.setValueAtTime(this.audio.getVolume(), currentTime);
            this.audio.gain.gain.linearRampToValueAtTime(0, endTime);
            
            this.stopTimeout = setTimeout(()=> {
                this.stopTimeout = null;
                this.audio.stop()
            }, this.sound.fadeOut * 1000 + 250);
        } else {
            this.audio.stop();
        }
    }
    
    _clearStopTimeout()
    {
        if (this.stopTimeout !== null) {
            clearTimeout(this.stopTimeout);
            this.stopTimeout = null;
        }
    }
    
    _onEnded(event)
    {
        event.target.removeEventListener('ended', this._boundOnEnded);
        if (this.audio.parent) {
            this.audio.parent.remove(this.audio);
        }
    }
}