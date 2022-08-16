import { UnitStack } from './UnitStack.js'

/** List of terrain ids used by hexes. */
const TerrainData = {
    0: { name: 'Undefined', color: 'Magenta', moveCost: undefined },
    1: { name: 'OutOfBounds', color: 'Black', moveCost: undefined },
    2: { name: 'Mountain', color: 'SaddleBrown', moveCost: 25},
    3: { name: 'Hill', color: 'SandyBrown', moveCost: 15 },
    4: { name: 'Marsh', color: 'DarkOliveGreen', moveCost: 10 },
    5: { name: 'Shallow Water', color: 'Blue', moveCost: 10 },
    6: { name: 'Deep Water', color: 'DarkBlue', moveCost: 25 },
    7: { name: 'Forest', color: 'DarkGreen', moveCost: 15 },
    8: { name: 'Open', color: 'Green', moveCost: 5 },
    9: { name: 'Snow', color: 'Snow', moveCost: 5 },
    10: { name: 'City', color: 'Gold', moveCost: 1 },
    11: { name: 'Woods', color: 'ForestGreen', moveCost: 5 },    
    12: { name: 'Road', color: 'DarkGray', moveCost: 1 },
    13: { name: 'River', color: 'Blue', moveCost: 20 },
    14: { name: 'Sand', color: 'LightGoldenRodYellow', moveCost: 3 },
    15: { name: 'Rough', color: 'Tan', moveCost: 5 },
    101: { name: 'Red', color: 'Red', moveCost: 1},
    102: { name: 'Orange', color: 'Orange', moveCost: 1},
    103: { name: 'Yellow', color: 'Yellow', moveCost: 1},
    104: { name: 'Green', color: 'Green', moveCost: 1},
    105: { name: 'Blue', color: 'Blue', moveCost: 1},
    106: { name: 'Indigo', color: 'Indigo', moveCost: 1},
    107: { name: 'Violet', color: 'Violet', moveCost: 1},
}

/** List of unit sizes used by units */
const UnitSize = {
    'Unknown': { symbol: '???', sizeRating: undefined },
    'Fireteam': { symbol: '0', sizeRating: 3 },
    'Squad': { symbol: '*', sizeRating: 9 },
    'Section': { symbol: '**', sizeRating: 18 },
    'Platoon': { symbol: '***', sizeRating: 50 },
    'Company': { symbol: 'I', sizeRating: 150 },
    'Battalion': { symbol: 'II', sizeRating: 575 },
    'Regiment': { symbol: 'III', sizeRating: 1500 },
    'Brigade': { symbol: 'X', sizeRating: 4000 },
    'Division': { symbol: 'XX', sizeRating: 12000 },
    'Corps': { symbol: 'XXX', sizeRating: 30000 },
    'Army': { symbol: 'XXXX', sizeRating: 100000 },
    'Army Group': { symbol: 'XXXXX', sizeRating: 300000 },
}



/** A single hex, stored in the GameModel hex map */
function Hex(_hex) {
    this.hexCoord = _hex.coord || _hex.co;
    this.label = _hex.label || _hex.la;
    this.victoryPoints = _hex.victoryPoints || _hex.vp
    this.terrainId = _hex.terrainId || _hex.ti
    this.svgHex = undefined
    this.svgTopEvent = undefined
    this.unitStack = new UnitStack()
}

  
/** A single unit, stored in the OrderOfBattle container */
function Unit(_unit) {
    this.unitId = _unit.unitId;
    this.forceId = _unit.forceId;
    this.formationId = _unit.formationId;
    this.name = _unit.name;
    this.natoIcon = _unit.natoIcon;
    this.unitSize = _unit.unitSize;
    this.color = _unit.color;
    this.hexCoord = _unit.hexCoord;
    this.quality = 1.0   // 0.0 = destroyed   1.0 full health. values scale with quality
    this.values = _unit.values || {}      // Current values
    this.svgLayers = {
      base: undefined, // Base SVG() containing entire unit counter
      icon: undefined, // NATO icon
      stats: {   // Upper left, right, lower left, right, top and bottom numbers
        ul: undefined,
        ur: undefined,
        lr: undefined,
        ll: undefined,
        bot: undefined,
        top: undefined,
      }
    }
}


export { TerrainData, Hex, Unit, UnitSize }