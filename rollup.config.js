import nodeResolve from 'rollup-plugin-node-resolve';
import includePaths from 'rollup-plugin-includepaths';
import commonjs from 'rollup-plugin-commonjs';
import buble from 'rollup-plugin-buble';
import x2js from 'x2js';

// We're including the three.js packages directly via rollup
// so we need to replicate three's shader packaging
// Source: https://github.com/mrdoob/three.js/blob/master/rollup.config.js
function glsl () {
	return {
		transform ( code, id ) {
			if ( !/\.glsl$/.test( id ) ) return;

			return {
				code: 'export default ' + JSON.stringify(
						code
							.replace( /[ \t]*\/\/.*\n/g, '' )
							.replace( /[ \t]*\/\*[\s\S]*?\*\//g, '' )
							.replace( /\n{2,}/g, '\n' )
					) + ';',
				map: { mappings: '' }
			};
		}
	};
}

// Allows to use XML data directly as native JSON objects,
// also converts "x,x,x" attributes to an array of floats.
// We use XML for character definition since it's easier to
// express nested objects in XML than in JSON.
function xml2json() {
	return {
		transform(code, id) {
			if (!/\.xml$/.test(id)) return;
			var converter = new x2js({
				attributeConverters: [
					{
						test: function(name, value) { 
							return value.split(',').length == 3;
						},
						convert: function(name, value) {
							var parts = value.split(',');
							return [
								parseFloat(parts[0]),
								parseFloat(parts[1]),
								parseFloat(parts[2])
							];
						}
					}
				]
			});
			var js = converter.xml2js(code);
			return {
				code: 'export default ' + JSON.stringify(js) + ';',
				map: { mappings: '' }
			};
		}
	}
}

export default {
	entry: 'source/main.js',
	dest: 'dist/main.js',
	moduleName: 'donut',
	format: 'iife',
	plugins: [
		glsl(),
		xml2json(),
		includePaths({
			paths: [ 'source', 'vendor' ],
			include: {
				'three': 'node_modules/three/src/Three',
				'dat.gui': 'node_modules/dat.gui/build/dat.gui'
			}
		}),
		nodeResolve({
			jsnext: true, 
			main: true 
		}),
		commonjs({
			namedExports: {
				// left-hand side can be an absolute path, a path
				// relative to the current directory, or the name
				// of a module in node_modules
				'vendor/webvr-ui/build/webvr-ui.js': [ 'EnterVRButton', 'State', 'WebVRManager' ]
			}
		}),
		buble({
			transforms: {
				dangerousForOf: true
			}
		})
	],
	sourceMap: true,
  	sourceMapFile: 'source/main.js.map',
	// Currently required due to error in webvr-polyfill
	// See: https://github.com/borismus/webvr-polyfill/issues/87
	useStrict: false
};