/**
 *  Coordinates.js
 *    Implements flat, cartesian, and cubic coordinates. 
 *    Coordinates are stored as an dict with the keys indicating the coordinate type.
 */


const cubeNeighborDirections = [{ q: 0, r: -1, s: 1 }, { q: 1, r: -1, s: 0 },
{ q: 1, r: 0, s: -1 }, { q: 0, r: 1, s: -1 },
{ q: -1, r: 1, s: 0 }, { q: -1, r: 0, s: 1 }]

const Directions = { N: 0, NE: 1, SE: 2, S: 3, SW: 4, NW: 5 }

/** Random shuffle an array in place */
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * i)
    const temp = array[i]
    array[i] = array[j]
    array[j] = temp
  }
}


class Coordinates {
  constructor(mapWidth, mapHeight) {
    this.mapWidth = mapWidth
    this.mapHeight = mapHeight
  }


  // /////////////////////////////////////////////////////////////////////////
  // Creating and Testing Coordinates 
  makeCoordFlat(flat) { return { f: flat } }
  makeCoordCart(x, y) { return { x: x, y: y } }
  makeCoordCube(q, r, s) { return { q: q, r: r, s: s } }

  isCoordFlat(coord) { return coord.hasOwnProperty('f') }
  isCoordCart(coord) { return (coord.hasOwnProperty('x') && coord.hasOwnProperty('y')) }
  isCoordCube(coord) { return (coord.hasOwnProperty('q') && coord.hasOwnProperty('r') && coord.hasOwnProperty('s')) }


  /** Tests if a coordinate is on the map */
  isCoordOnMap(coord) {
    const { x, y } = this.convertToCart(coord)
    if (x >= 0 && x < this.mapWidth && y >= 0 && y < this.mapHeight) { return true }
    else { return false }
  }

  /** Tests if two coordinates of the same type are equal, not equal if different types or either undefined */
  isCoordEqual(a, b) {
    if (a === undefined || b === undefined) { return false } // If either undefined, not equal
    if (this.isCoordFlat(a) && this.isCoordFlat(b)) {
      return (a.f === b.f)
    } else if (this.isCoordCart(a) && this.isCoordCart(b)) {
      return (a.x === b.x && a.y === b.y)
    } else if (this.isCoordCube(a) && this.isCoordCube(b)) {
      return (a.q === b.q && a.r === b.r & a.s === b.s)
    }
    return false
  }

  /** Utility function to map coordinate types to int */
  whatCoordType(coord) {
    if (this.isCoordCart(coord)) { return 2 }
    if (this.isCoordCube(coord)) { return 3 }
    if (this.isCoordFlat(coord)) { return 1 }
    return 0
  }


  // /////////////////////////////////////////////////////////////////////////
  // Converting 

  /** Convert any coordinate to a flat coordinate, throw on error */
  convertToFlat(coord) {
    const coordType = this.whatCoordType(coord)
    switch (coordType) {
      case 1: return coord
      case 2: return this.cartToFlat(coord)
      case 3: return this.cubeToFlat(coord)
    }
    throw "Coordinates.convertToFlat() invalid coordinate"
  }

  /** Convert any coordinate to a cart coordinate, throw on error */
  convertToCart(coord) {
    const coordType = this.whatCoordType(coord)
    switch (coordType) {
      case 1: return this.flatToCart(coord)
      case 2: return coord
      case 3: return this.cubeToCart(coord)
    }
    throw "Coordinates.convertToCart() invalid coordinate"

  }

  /** Convert any coordinate to a cart coordinate, throw on error */
  convertToCube(coord) {
    const coordType = this.whatCoordType(coord)
    switch (coordType) {
      case 1: return this.flatToCube(coord)
      case 2: return this.cartToCube(coord)
      case 3: return coord
    }
    throw "Coordinates.convertToCube() invalid coordinate"
  }


  /** Converts a cart coordinate to a flat */
  cartToFlat(cart) {
    return this.makeCoordFlat((this.mapWidth * cart.y) + cart.x)
  }

  /** Converts a flat coordinate to a cart */
  flatToCart(flat) {
    return this.makeCoordCart(flat.f % this.mapWidth,
      Math.trunc(flat.f / this.mapWidth))
  }

  /** Converts a cube coordinate to a flat */
  cubeToFlat(cube) {
    const cart = this.cubeToCart(cube)
    return this.cartToFlat(cart)
  }

  /** Converts a flat coordinate to a cube */
  flatToCube(flat) {
    const cart = this.flatToCart(flat)
    return this.cartToCube(cart)
  }

  /** Converts a cube coordinate to a cart */
  cubeToCart(cube) {
    var x, y
    x = cube.q
    y = cube.r + ((cube.q + (cube.q & 1)) >> 1)
    return this.makeCoordCart(x, y)
  }

  /** Converts a cart coordinate to a cube */
  cartToCube(cart) {
    var q, r
    q = cart.x
    r = cart.y - ((cart.x + (cart.x & 1)) >> 1)
    return this.makeCoordCube(q, r, -q - r)
  }


  // /////////////////////////////////////////////////////////////////////////
  // Adjusting and Moving 

  /** Rounds a cubic coordinate's values to integers */
  roundCube(cube) {
    if (!this.isCoordCube(cube)) { throw "Coordinates.roundCube() passed noncubic coordinate" }
    const q = cube.q, r = cube.r, s = cube.s
    let rQ = Math.round(q)
    let rR = Math.round(r)
    let rS = Math.round(s)
    const diffQ = Math.abs(q - rQ)
    const diffR = Math.abs(r - rR)
    const diffS = Math.abs(s - rS)
    if (diffQ > diffR && diffQ > diffS) { rQ = -rR - rS }
    else if (diffR > diffS) { rR = -rQ - rS }
    else { rS = -rQ - rR }
    return this.makeCoordCube(rQ, rR, rS)
  }

  /** Performs a linear interpolation of cube1 to cube2 */
  lerpCube(cube1, cube2, step) {
    if (!this.isCoordCube(cube1) || !this.isCoordCube(cube2)) { throw "Coordinates.lerpCube() passed noncubic coordinate" }
    const q = cube1.q + (cube2.q - cube1.q) * step
    const r = cube1.r + (cube2.r - cube1.r) * step
    const s = cube1.s + (cube2.s - cube1.s) * step
    return this.makeCoordCube(q, r, s)
  }

  /** Performs a slight nudge on a cubic coordinate to make linear interpolation look better */
  nudgeCube(cube) {
    if (!this.isCoordCube(cube)) { throw "Coordinates.nudgeCube() passed noncubic coordinate" }
    return this.makeCoordCube(cube.q + EPSILON.q, cube.r + EPSILON.r, cube.s + EPSILON.s)
  }

  /** Shifts a coordinate distance steps in direction. Direction is an integer 0-5 */
  shiftCoord(startCart, direction, distance) {
    if (direction < 0 || direction >= 6) {
      throw `Coordinates.shiftCoord() passed invalid direction ${direction}`
    }
    const startCube = this.convertToCube(startCart)
    const dirCube = cubeNeighborDirections[direction]
    const targetCube = {
      q: startCube.q + (dirCube.q * (distance || 1)),
      r: startCube.r + (dirCube.r * (distance || 1)),
      s: startCube.s + (dirCube.s * (distance || 1)),
    }
    return this.convertToCart(targetCube)
  }



  // /////////////////////////////////////////////////////////////////////////
  // Neighbors 

  /** Returns a list of coordinates that are neighbors of coord and on map */
  neighborsOf(coord, shuffle) {
    const cube = this.convertToCube(coord)
    let neighbors = []
    for (let direction = 0; direction < 6; ++direction) {
      const d = cubeNeighborDirections[direction]
      const nei = { q: cube.q + d.q, r: cube.r + d.r, s: cube.s + d.s }
      if (this.isCoordOnMap(nei)) {
        neighbors.push(this.convertToCart(nei))
      }
    }
    // If shuffle then return a randomized array, otherwise just return hexes
    if (shuffle) { shuffleArray(neighbors) }
    return neighbors
  }


  /** Returns the direction of travel to move from start to target, undefined if not neighbors */
  neighborsWhichDirection(startCoord, targetCoord) {
    const sourceCube = this.convertToCube(startCoord)
    const targetCube = this.convertToCube(targetCoord)
    // Step through every direction
    for (let dir = 0; dir < cubeNeighborDirections.length; ++dir) {
      const cubeAdjust = cubeNeighborDirections[dir]
      // Find the coordinate of the neighbor in direction dir
      const neiCoord = {
        q: sourceCube.q + cubeAdjust.q,
        r: sourceCube.r + cubeAdjust.r,
        s: sourceCube.s + cubeAdjust.s,
      }
      // If the neighbor equals target then return the current direction
      if (targetCube.q == neiCoord.q && targetCube.r == neiCoord.r && targetCube.s == neiCoord.s) {
        return dir
      }
    }
    // Direction not found, hexes are not neighbors
    return undefined
  }




  // /////////////////////////////////////////////////////////////////////////
  // Utilities 

  /** Returns the distance between two coordinates, does not check if on map */
  hexDistance(coord1, coord2) {
    const a = this.convertToCube(coord1)
    const b = this.convertToCube(coord2)
    return [Math.max(Math.abs(a.q - b.q), Math.abs(a.r - b.r), Math.abs(a.s - b.s))]
  }


  // Returns all hexes within range of hex
  // hexCenter is included in the results
  getHexesWithinRange(hexCoord, range) {
    const hexes = []
    const hexCube = this.convertToCube(hexCoord)
    for (let x = -range; x <= range; ++x) {
      const yMin = Math.max(-range, -x - range)
      const yMax = Math.min(range, -x + range)
      for (let y = yMin; y <= yMax; ++y) {
        const z = -x - y
        const neiCube = { q: hexCube.q + x, r: hexCube.r + y, s: hexCube.s + z }
        const neiCart = this.convertToCart(neiCube)
        if (this.isCoordOnMap(neiCart)) {
          hexes.push(neiCart)
        }
      }
    }
    return hexes
  }



}



/** Small constant value used for nudging in linear interpolation */
const EPSILON = { q: 1e-6, r: 1e-6, s: -2e-6 }





export { Coordinates }
