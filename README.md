
# [Mr Nom Nom](https://mrnmnm.com)

## A small WebVR game about a donut and his hungry friends.

![mrnomnom](https://github.com/etterstudio/mrnomnom/raw/master/dist/img/mrnomnom.png)

Mr Nom Nom was created by the desire to build something simple, for everyone to have fun with. A silly game, that works across as many platforms as possible, from Cardboard to the latest high-end device. 

It has its own simplified physics simulation using basic geometric shapes connected by spring joints. From this a procedurally walk animation is created, without munching up too much performance. This allows to quickly build a variety of characters and without having to worry about animating them – the simulation takes care of all their movements procedurally.

Continuing to prioritise accessibility we created a game mechanic that works without additional controllers other than the player's head. Players direct Mr Nom Nom to circle the other characters to trap them with the red scarf. Get close but not too close or risk losing. A mix between Snake and Pac Man – embodied by a donut with a red scarf – perfect game mechanic stuff.
To further lower the hardware requirements we created a system that measures the user's device framerate on the fly and switches graphical elements on or off depending on the current performance of the device. This way we could ensure that the experience was fluid, even on low specification devices.

In March 2017 the game Mr Nom Nom was released alongside other WebVR experiments by some other fantastic people as part of Google's WebVR Experiments platform. **The code is open source and available under the MIT license, this does not include game concept, characters, visual and audio elements.**

### Development Frameworks
- [rollup](http://rollupjs.org)
- [audiosprite](https://github.com/tonistiigi/audiosprite)

### Runtime Frameworks
- [three.js](http://threejs.org)
- [fast-simplex-noise](https://github.com/joshforisha/fast-simplex-noise-js)

### Conceptual
- Procedural walk animation
- Spring-based physics simulation
- Audio- and Texture-Sprites
- Simple circular collision detection
- Dynamic graphics quality depending on framerate
- Shader-based line extrusion
- Encircle detection of dynamically drawn poly-line
- Dependency-based asset loading

### And the obvious
- [dat.gui](https://github.com/dataarts/dat.gui)
- [stats.js](https://github.com/mrdoob/stats.js/)

### Contributors
- [Adrian Stutz](https://github.com/sttz)
- [Eugene Krivoruchko](https://github.com/crookookoo)
- [Sascha Haus](https://github.com/saschahaus)
- [Ilmari Heikkinen](https://github.com/kig)
