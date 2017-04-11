import { 
    Math as TMath, 
    Quaternion, 
    Euler, 
    Matrix4, 
    Group, 
    Vector2, 
    Vector3,
    BasicShadowMap,
    PCFShadowMap,
    PCFSoftShadowMap 
} from 'three';

import Game from 'Game';
import Loader from 'Loader';
import Rounds from 'config/Rounds';
import Text from 'config/Text';

import Sun from 'objects/Sun';
import Figure from 'objects/Figure';
import Block from 'objects/Block';
import Coin from 'objects/Coin';
import Maath from 'math/Maath';
import Polar2 from 'math/Polar2';
import { SpringQuaternion } from 'math/Spring';
import Scarf from 'objects/Scarf';
import GameOver from 'objects/GameOver';

import Characters from 'config/Characters.xml';

const StateIntro = 'StateIntro';

const StateCountdown = 'StateCountdown';
const StateStarting = 'StateStarting';
const StateRoundRunning = 'StateRoundRunning';
const StateRoundEnded = 'StateRoundEnded';

export default class MrNomNom extends Game
{
    constructor(config)
    {
        super(config);

        this.countdownDuration = 10;
        this.startDelay = 0.5;
        this.introCameraOffset = new Vector3(0, -2, 0);

        this.isSetUp = false;
        this.assets = {};
        
        this.state = StateIntro;
        this.currentRound = 0;
        this.round = Rounds[0];
        this.figurePool = [];
        this.figures = new Group();
        this.coins = new Group();
        this.onNomBound = this.onNom.bind(this);
        this.gazeTarget = new Vector3();
        this.countdownLastNumber = '';
        this.countdownStartTime = 0;

        this.cameraSpring = new SpringQuaternion(8, 1);
        this.lookAtMatrix = new Matrix4();

        this.initialQualityLevel = 2;
        this.qualityCheckInterval = 3;
        this.qualityTargetFps = { min: 30, max: 50 };

        this.lastQualityCheck = 0;
        this.qualityCheckFrames = 0;
        this.qualityLevel = 0;
    }

    load(progress, complete)
    {
        // Required assets, will be available in the
        // this.assets hash when this.setup() is called
        var dependencies = [
            'config',
            'boombox',
            'landscape',
            'models',
            'textures',
            'bee',
            'faces'
        ];

        // Load assets and fill this.assets
        var assets = this.assets;
        Loader.main.get(
            dependencies, 
            (...values)=> {
                for (var i = 0; i < values.length; i++) {
                    assets[dependencies[i]] = values[i];
                }
                this.isReady = true;
                if (complete) {
                    complete();
                }
            },
            progress
        );
    }

    start(hideTitle, showTitle)
    {
        if (!this.isReady) {
            throw new Error('Game cannot be started, load() has not yet completed.');
        }
        if (this.isSetUp) {
            throw new Error('setup() has already been called.');
        }
        this.isSetUp = true;

        this.hideTitle = hideTitle;
        this.showTitle = showTitle;

        this.sun = new Sun();		
        this.scene.add(this.sun);

        // Add assets to scene
        this.scene.add(this.assets.landscape);

        this.assets.boombox.play('athmo').loop();

        this.scene.add(this.figures);
        this.scene.add(this.coins);

        this.assets.bee.idleTargetPos = this.gazeTarget;
        this.scene.add(this.assets.bee);

        this.gameOverDome = new GameOver();
        this.scene.add(this.gameOverDome);

        // Make models and textures avialable to character xml
        Block.models = this.assets.models;
        Block.textures = this.assets.textures;

        // Donut character for intro
        var char = Characters.characters.character.find((char)=> char._id === 'donut');
        this.mrdonut = new Figure(char);
        this.mrdonut.position.set(-8, 0, -20);
        this.scene.add(this.mrdonut);

        this.scarf = new Scarf();
        this.scarf.addEventListener('capture', this.onCapture.bind(this));
        this.scene.add(this.scarf);

        this.mrdonut.addEventListener('start', ()=> {
            var ref = this.mrdonut.findBlockByName('donutMesh');
            if (ref.visuals) ref = ref.visuals;
            this.scarf.reference = ref;
        });

        // Skip intro when round is selected
        if (parseInt(this.assets.config.round) > 0) {
            this.currentRound = parseInt(this.assets.config.round) - 1 || 0;
            this.startGame()
        }

        // Setup up events
        if (this.assets.config.debug === 'true') {
            document.addEventListener('keydown', (event)=> {
                if (event.keyCode == 32) { // Space
                    if (this.state == StateIntro) {
                        this.startCountdown();
                    } else if (this.state == StateCountdown) {
                        this.endCountdown();
                    } else {
                        this.showIntro();
                    }
                } else if (event.keyCode == 83) { // S
                    this.endRound();
                } else if (event.keyCode == 71) { // G
                    this.onNom();
                }
            });
        }
        
        // Start title melody
        this.titleMelody = this.assets.boombox.play('title_melody');

        this.setQualityLevel(this.initialQualityLevel);
        this.showIntro();
    }

    update(time, deltaTime)
    {
        if (!this.isSetUp)
            return;

        this.updateQuality();

        if (this.state === StateIntro) {
            var target = this.mrdonut.position.clone().add(this.introCameraOffset);
            this.lookAtMatrix.lookAt(this.camera.position, target, this.camera.up);
            this.cameraSpring.target.setFromRotationMatrix(this.lookAtMatrix);
            this.cameraSpring.step(deltaTime);
            this.camera.quaternion.copy(this.cameraSpring.position);
        
        } else if (this.state == StateCountdown) {
            var remaining = this.countdownDuration - (time - this.countdownStartTime);
            if (remaining <= 0) {
                this.endCountdown();
            } else {
                var number = Math.round(remaining).toString();
                if (this.countdownLastNumber != number) {
                    this.countdownLastNumber = number;
                    this.assets.bee.say(this.getText('countdown').replace('{0}', number));
                    this.assets.boombox.play('countdown');
                }
            }
        }
        
        // Update gaze target
        var pos = this.camera.getWorldPosition();
        var dir = this.camera.getWorldDirection();
        
        var f = -pos.y / dir.y;
        var radius = this.round.radius.max || 35;
        if (isFinite(f) && f > 0) {
            this.gazeTarget.copy(pos).addScaledVector(dir, f);
            var length = this.gazeTarget.length();
            if (length > radius) {
                this.gazeTarget.multiplyScalar(radius / length);
            }
        } else {
            var angle = Math.atan2(dir.z, dir.x);
            this.gazeTarget.set(
                Math.cos(angle) * radius,
                0,
                Math.sin(angle) * radius
            );
        }
    }
    
    updateQuality()
    {
        var time = this.clock.elapsedTime;
        var elapsed = time - this.lastQualityCheck;
        if (elapsed < this.qualityCheckInterval) {
            this.qualityCheckFrames++;
            return;
        }
        this.lastQualityCheck = time;
        
        var fps = this.qualityCheckFrames / elapsed;
        this.qualityCheckFrames = 0;
        
        var newLevel = this.qualityLevel;
        if (fps < this.qualityTargetFps.min) {
            newLevel--;
        } else if (fps > this.qualityTargetFps.max) {
            newLevel++;
        }
        newLevel = Maath.clamp(newLevel, 0, 3);

        if (this.qualityLevel == newLevel)
            return;
        
        this.setQualityLevel(newLevel);
    }

    setQualityLevel(level)
    {
        console.log('Changing quality level to ' + level);
        this.qualityLevel = level;

        this.renderer.shadowMap.enabled = (this.qualityLevel > 0);

        if (this.sun.light.shadow.map) {
            this.renderer.clearTarget(this.sun.light.shadow.map);
            this.sun.light.shadow.map.dispose();
            this.sun.light.shadow.map = null;
        }

        if (this.qualityLevel == 0) {
            this.mrdonut.footprintDuration = 4;
        } else if (this.qualityLevel == 1) {
            this.renderer.shadowMap.type = BasicShadowMap;
            this.sun.light.shadow.mapSize = new Vector2(256, 256);
            this.mrdonut.footprintDuration = 8;
        } else if (this.qualityLevel == 2) {
            this.renderer.shadowMap.type = PCFShadowMap;
            this.sun.light.shadow.mapSize = new Vector2(512, 512);
            this.mrdonut.footprintDuration = 12;
        } else if (this.qualityLevel == 3) {
            this.renderer.shadowMap.type = PCFShadowMap;
            this.sun.light.shadow.mapSize = new Vector2(1024, 1024);
            this.mrdonut.footprintDuration = 16;
        }

        var ground = this.assets.landscape.getObjectByName('ground');
        if (ground) {
            ground.material.needsUpdate = true;
        }
    }

    hideVRUI()
    {
        super.hideVRUI();

        if (this.titleMelody) {
            this.titleMelody.stop();
        }
        
        if (this.hideTitle) {
            this.hideTitle();
        }
    }

    showVRUI()
    {
        super.showVRUI();

        if (this.titleMelody) {
            this.titleMelody.play();
        }

        if (this.showTitle) {
            this.showTitle();
        }
    }

    onEnterVR()
    {
        super.onEnterVR();

        if (this.state == StateIntro) {
            this.startCountdown();
        }
    }

    onExitVR()
    {
        super.onExitVR();
        this.assets.bee.shutUp();
        this.showIntro();
    }

    showIntro()
    {
        this.state = StateIntro;

        this.removeCoins();
        this.assets.bee.hide();

        for (var i = this.figures.children.length - 1; i >= 1; i--) {
            var figure = this.figures.children[i];
            this.figures.remove(figure);
            this.figurePool.push(figure);
        }

        var figure;
        if (this.figures.children.length == 0) {
            figure = new Figure();
            figure.addEventListener('nom', this.onNomBound);
            this.figures.add(figure);
        } else {
            figure = this.figures.children[0];
        }
        figure.position.set(0, 0, -20);
        figure.stop();
        figure.legs.reset();

        this.camera.position.set(0, 10, -5);
        this.camera.lookAt(this.mrdonut.position.clone().add(this.introCameraOffset));
        this.cameraSpring.position.copy(this.camera.quaternion);
        this.mrdonut.runCircles(new Vector3(0, 0, -20), 8);

        this.scarf.reset();
        this.scarf.cleanUp();
        this.scarf.grow(4);

        this.showVRUI();
    }

    updateCameraHeight()
    {
        if (this.config.cameraHeight != '' || !this.round) {
            super.updateCameraHeight();
        } else {
            this.animate(this, {
                cameraHeight: this.round.cameraHeight
            }, 1.0);
        }
    }

    startCountdown()
    {
        this.state = StateCountdown;
        this.hideVRUI();
        this.countdownLastNumber = '';
        this.countdownStartTime = this.clock.elapsedTime;
    }

    endCountdown()
    {
        if (this.state != StateCountdown)
            return;

        this.assets.bee.shutUp();
        this.startGame();
    }

    startGame()
    {
        this.state = StateStarting;
        this.hideVRUI();
        this.startNextRound();
    }
    
    removeCoins()
    {
        for (var i = this.coins.children.length - 1; i >= 0; i--) {
            if (!this.coins.children[i].pickedUp) {
                this.coins.remove(this.coins.children[i]);
            }
        }
    }

    coinEaten()
    {
        this.scarf.grow();
    }
    
    startNextRound()
    {
        this.state = StateStarting;

        this.round = Object.assign({}, Rounds[0], Rounds[++this.currentRound]);
        this.updateCameraHeight();

        var numFigures = parseInt(this.assets.config.figures) || this.round.numFigures || 5;
        for (var i = this.figures.children.length - 1; i >= numFigures; i--) {
            var figure = this.figures.children[i];
            this.figures.remove(figure);
            this.figurePool.push(figure);
        }
        
        var tempPool = [];
        for (var i = this.figures.children.length; i < numFigures; i++) {
            var figure;
            if (this.figurePool.length > 0) {
                figure = this.figurePool.pop();
            } else {
                figure = new Figure();
            }
            figure.addEventListener('nom', this.onNomBound);
            tempPool.push(figure);
        }
        
        var radius = this.round.radius.max || 35;
        
        var halfFovRad = TMath.degToRad(this.camera.fov) / 2;
        var visibleAngle = 2 * Math.atan(Math.tan(halfFovRad) * this.camera.aspect);
        var viewDir = this.camera.getWorldDirection();
        var viewAngle = Math.atan2(viewDir.z, viewDir.x);
        
        var spacing = (2 * Math.PI - visibleAngle) / (tempPool.length + 1);
        var pos = new Polar2(radius, viewAngle + visibleAngle / 2 + spacing);
        var euler = new Euler();
        for (var figure of tempPool) {
            figure.position.copy(pos.toVector3XZ());
            figure.rotation.set(0, 3/2 * Math.PI - pos.angle, 0);
            this.figures.add(figure);
            pos.angle += spacing;
        }

        this.sun.sunPosition = 1 - (this.currentRound - 1) / (Rounds.length - 2); 
        this.scarf.reset();
        this.scarf.cleanUp();
        
        var coinCount = this.round.coins || 8;
        var coinPos = new Polar2();
        for (var i = 0; i < coinCount; i++) {
            var coin = new Coin();
            coinPos.angle = Math.random() * Math.PI * 2;
            coinPos.radius = Maath.randomInRange(this.round.radius);
            coin.position.copy(coinPos.toVector3XZ());
            coin.position.y = 2;
            this.coins.add(coin);
        }

        var text = this.getText('round_start').replace('{0}', this.currentRound);
        this.assets.bee.say(text);
        this.assets.boombox.play('round_announce');

        this.delay(this._beginRound.bind(this), 1000);
    }
    
    _beginRound()
    {
        if (this.state != StateStarting)
            return;

        this.state = StateRoundRunning;
        
        this.assets.boombox.play('round_start');
        this.assets.bee.shutUp();
        
        var spacing = 2 * Math.PI / this.figures.children.length;
        var angle = Math.PI * Math.random();
        for (var figure of this.figures.children) {
            angle += spacing;
            
            figure.startRound(this.round);
            figure.follow(this.mrdonut.position, angle, this.round.disperseTime || 5);
        }
        
        this.mrdonut.run(this.gazeTarget);
        this.assets.bee.invincibleFor(this.round.invincibility || 0);
    }
    
    endRound(eatenBy = null)
    {
        this.state = StateRoundEnded;

        for (var figure of this.figures.children) {
            figure.shutUp();
            figure.roundOver();
        }

        this.scarf.reset();
        this.removeCoins();

        if (eatenBy) {
            this.currentRound--;
            this.mrdonut.stop();
            this.assets.boombox.play('game_over');
            this.gameOverDome.show(eatenBy);
            this.delay(()=> {
                this.gameOverDome.hide();
                if (this.state == StateRoundEnded) {
                    this.startNextRound()
                }
            }, 3000);
        } else if (this.currentRound + 1 >= Rounds.length) {
            this.assets.boombox.play('game_won');
            this.assets.bee.say(this.getText('game_won'), 3, ()=> {
                if (this.state == StateRoundEnded) {
                    this.startNextRound()
                }
            });
        } else {
            this.delay(()=> {
                if (this.state == StateRoundEnded) {
                    this.startNextRound()
                }
            }, 3000);
        }
    }
    
    onCapture(event)
    {
        if (this.state != StateRoundRunning)
            return;

        var captured = [];
        var remaining = [];
        for (var figure of this.figures.children) {
            if (figure.isCaptured)
                continue;
            
            if (event.target.isCaptured(figure.position)) {
                figure.capture();
                event.target.cut();
                captured.push(figure);
            } else {
                remaining.push(figure);
            }
        }

        if (captured.length > 0) {
            this.assets.boombox.play('ribbon_capture');
            
            if (remaining.length > 0) {
                var coinsPerCapture = this.round.coinsPerCapture || 4;
                var spawnCoins = Maath.randomInRange(coinsPerCapture) * captured.length;
                var dropRadius = this.round.coinsDropRadius || 4;
                var increment = 2 * Math.PI / spawnCoins;
                var pos = new Polar2(0, 0);
                for (var figure of captured) {
                    pos.angle = Math.PI * 2 * Math.random();
                    var figurePos = figure.getWorldPosition().setY(2);
                    for (var i = 0; i < spawnCoins; i++) {
                        pos.angle += increment;
                        pos.radius = Maath.randomInRange(dropRadius);

                        var dropPos = pos.toVector3XZ().add(figurePos).setY(2);
                        if (dropPos.length() > this.round.radius.max)
                            continue;

                        var coin = new Coin();
                        coin.position.copy(figurePos);
                        coin.dropTo(dropPos);
                        this.coins.add(coin);
                    }
                }
            }
        }

        if (remaining.length === 0) {
            this.delay(()=> {
                if (this.state == StateRoundRunning) {
                    this.assets.boombox.play('round_over');
                    this.assets.bee.say(this.getText('round_over'), 3);
                    this.endRound();
                }
            }, 0);
        }
    }

    onNom(event)
    {
        if (this.state !== StateRoundRunning || this.assets.bee.isInvincible)
            return;
        
        this.endRound(event.target);
    }
    
    getText(key)
    {
        var value = Text['en'][key];
        if (typeof value !== 'string') {
            var subKey = 'pc';
            value = value[subKey];
        }
        return value;
    }
}
