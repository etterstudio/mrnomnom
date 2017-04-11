import { BufferGeometry, BufferAttribute, Matrix4, SphereBufferGeometry, CircleBufferGeometry } from 'three';

// Taken from this pull request: https://github.com/mrdoob/three.js/pull/9529
/**
 * Join a list of buffer geometries into a new one.
 * The old ones (including this) will be disposed, so they can be garbage collected.
 * @param  {Array.<THREE.Object3D>} geometries  A list of geometries containing geometry to merge
 * @return {THREE.BufferGeometry}       	The merged result.
 */
BufferGeometry.prototype.join = function ( geomOrList ) {

    var isObject = geomOrList != null && typeof geomOrList === 'object';
    if ( ! isObject || ( geomOrList.isBufferGeometry === false && geomOrList.constructor !== Array ) ) {

        console.error( 'THREE.BufferGeometry.join(): geometry not an instance of THREE.BufferGeometry or Array.', geomOrList );
        return this;

    }
    var geometries;
    if ( geomOrList.isBufferGeometry ) {

        geometries = [ geomOrList, this ];

    } else {

        // already an  array
        geometries = geomOrList;
        geometries.push( this );

    }

    var i, m, geom2;

    var geometry = new BufferGeometry();
    var geom1 = this;

    // Split all indexed geometry so we don't need it anymore
    for ( m = 0; m < geometries.length; m ++ ) {

        geom2 = geometries[ m ];
        if ( geom2.index ) {

            geom2 = geom2.toNonIndexed();
            geometries[ m ] = geom2;

        }

    }

    // for each attribute
    for ( var key in geom1.attributes ) {

        if ( geom1.attributes[ key ].array.constructor !== Float32Array ) continue;

        var data = [];
        // for each geometry
        for ( m = 0; m < geometries.length; m ++ ) {

            geom2 = geometries[ m ];
            if ( ! geom2.attributes[ key ] ) {

                console.error( 'Mismatched geometry attributes: ' + key );
                return this;

            }

            var attributeArray2 = geom2.attributes[ key ].array;
            for ( i = 0; i < attributeArray2.length; i ++ ) {

                data.push( attributeArray2[ i ] );

            }

        } // end for each geom
        geometry.addAttribute( key, new BufferAttribute( new Float32Array( data ), geom1.attributes[ key ].itemSize ) );

    } // end for each attr

    for ( m = 0; m < geometries.length; m ++ ) {

        geometries[ m ].dispose();

    }

    return geometry;

};

export default class HemisphereBufferGeometry extends BufferGeometry
{
    constructor(radius, widthSegments, heightSegments, phiStart, phiLength)
    {
        super();
        this.type = 'HemisphereBufferGeometry';
        
        var sphere = new SphereBufferGeometry(radius, widthSegments, heightSegments, 0, 2 * Math.PI, 0, Math.PI / 2);
        var cap = new CircleBufferGeometry(radius, widthSegments);
        cap.applyMatrix(new Matrix4().makeRotationX(Math.PI / 2));
        
        this.copy(sphere.join(cap));
    }
}