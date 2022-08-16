import { Coordinates } from './Coordinates';
import { Hex, Unit, TerrainData } from './models';
import { OrderOfBattle } from './OrderOfBattle';
import { NatoUnitIcons, NatoUnitTypes } from './NatoUnitIcons';

class GameModel extends Coordinates {
    constructor(controller, scenario) {
        super(scenario.mapSize.width, scenario.mapSize.height)
        this.controller = controller
        this.scenario = scenario
        this.mapSize = scenario.mapSize


        this.modelState = {
            forceOverlay: {
                movementPerDistance: 3, // For every n movement points, force will project 1 hex
                dropOffPerDistance: 0.60,  // Power is scaled by n every 1 hex distance   
                tankVsInfantryFactor: 1.25, // Tanks have an advantage against infantry
            }
        }

        // Create the hex map
        this.hexMap = new Array(this.mapSize.height)
        for (let y = 0; y < this.mapSize.height; ++y) {
            this.hexMap[y] = new Array(this.mapSize.width)
        }

        // Load scenario hexes onto map
        for (let i = 0; i < scenario.hexes.length; ++i) {
            const hex = new Hex(scenario.hexes[i])
            if (!this.isCoordOnMap(hex.hexCoord)) {
                throw `GameModel constructor error: Scenario has a hex not on the map ${hex.hexCoord}`
            }
            if (!(TerrainData.hasOwnProperty(hex.terrainId))) {
                throw `GameModel constructor error: Scenario has an unknown terrainId ${hex.hexCoord} ${hex.terrainId}`
            }
            hex.moveCost = TerrainData[hex.terrainId].moveCost
            this.hexMap[hex.hexCoord.y][hex.hexCoord.x] = hex
        }

        // Create the OrderOfBattle and load the scenario forces onto it
        this.oob = new OrderOfBattle()
        this.oob.loadOOBData(this.scenario)
    }


    // /////////////////////////////////////////////////////////////////////////
    // Hexes

    /** Returns the requested hex, or undefined if it does not exist */
    getHex(hexCoord) {
        let x, y;
        if (hexCoord.hasOwnProperty('x') && hexCoord.hasOwnProperty('y')) {
            x = hexCoord.x
            y = hexCoord.y
        } else {
            const cart = this.convertToCart(hexCoord)
            x = cart.x
            y = cart.y
        }

        if (x >= 0 && x < this.mapWidth && y >= 0 && y < this.mapHeight) {
            return this.hexMap[y][x]
        } else {
            return undefined
        }
    }


    // /////////////////////////////////////////////////////////////////////////
    // Units

    /** Moves a unit to the target hex in the model only, view is unchanged 
     *  Returns true if move succeeded, false if failed 
    */
    moveUnitIdToHexCoord(unitId, targetHexCoord) {
        // Load the unit and source/target hexes
        const unit = this.oob.getUnitById(unitId)
        if (unit === undefined) { throw `GameModel.moveUnitIdToHexCoord() could not find unit id ${unitId}` }
        const sourceHex = this.getHex(unit.hexCoord)
        if (sourceHex === undefined) { throw `GameModel.moveUnitIdToHexCoord() could not find sourceHex ${sourceHex?.x},${sourceHex?.y}` }
        const targetHex = this.getHex(targetHexCoord)
        if (targetHex === undefined) { throw `GameModel.moveUnitIdToHexCoord() could not find targetHex ${targetHexCoord?.x},${targetHexCoord?.y}` }

        // Test if the target unitstack is friendly or empty, unit cannot move into an enemy unit
        const topUnitId = targetHex.unitStack.getTopUnitId()
        if (topUnitId !== undefined && !this.oob.areUnitsFriendly(unitId, topUnitId)) {
            return false
        }

        // Move the unit from it's source hex to the target hex, and update unit stacks
        sourceHex.unitStack.removeUnitId(unitId)
        unit.hexCoord = targetHexCoord
        targetHex.unitStack.addUnitId(unitId)
        return true
    }





    // /////////////////////////////////////////////////////////////////////////
    // Pathfinding

    /** Uses A* Algorithm to pathfind from startCoord to endCoord, returns a zero length path if no path can be found */
    pathfindBetweenHexes(startCoord, endCoord) {
        if (!this.isCoordOnMap(startCoord) || !this.isCoordOnMap(endCoord)) {
            throw `GameModel.pathfindBetweenHexes() passed offmap coordinate`
        }

        // Frontiner contains neighboring hexes to be explored
        const frontier = new TinyQueue([], function (a, b) { return a.priority - b.priority })
        frontier.push({
            coord: { x: startCoord.x, y: startCoord.y },
            priority: 0,
            distance: 0,
            lastDir: undefined,
        })

        // Dictionaries to track which direction we came from and cost so far, seed with no initial direction and 0 cost
        const dictCameFrom = {}
        const dictCostSoFar = {}
        let curKey = `${startCoord.x},${startCoord.y}`
        dictCameFrom[curKey] = undefined
        dictCostSoFar[curKey] = 0

        // Sanity check for while loop to avoid infinite loop. If sanity less than 0, abort.
        var sanity = 100000   // TODO find best value
        var pathFound = false

        // Loop through the frontier pulling the lowest priority hex
        while (frontier.length) {
            if (--sanity < 0) { throw 'GameModel.pathfindBetweenHexes() Pathfinding failed on sanity < 0 check to avoid infinite loop' }
            // Get the lowest priority frontier hex from the priority queue.
            // If that hex is our target, a path has been found, break now.
            const front = frontier.pop()
            const curCoord = front.coord
            if (curCoord.x == endCoord.x && curCoord.y == endCoord.y) {
                pathFound = true
                break
            }
            curKey = `${curCoord.x},${curCoord.y}`

            // Get a list of neighboring hex coordinates and loop through them
            var neighborList = this.neighborsOf(curCoord)
            for (let i = 0, le = neighborList.length; i < le; ++i) {
                // Get the hex for the current neighbor coordinates
                const neiCoord = neighborList[i]

                let hexNei = this.getHex(neiCoord)
                if (hexNei === undefined) { throw `GameModel.pathfindBetweenHexes() Could not get neighboring hex ${neiCoord.x},${neiCoord.y}` }

                // Hexes with undefined movement costs cannot be entered, ignore
                if (hexNei.moveCost === undefined) { continue }

                // Calculate total cost off traveling from hexStart to hexNei
                const neiKey = `${neiCoord.x},${neiCoord.y}`
                const newCost = dictCostSoFar[curKey] + hexNei.moveCost

                /* Look up the neighbor hex in the cost dictionary and see if it was
                   visited in the past with a cheaper cost than newCost. */
                if (dictCostSoFar.hasOwnProperty(neiKey) && newCost >= dictCostSoFar[neiKey]) {
                    /* The hex was visited in the past with a less expensive path than the path
                       being considered here. Continue and keep the old path. */
                    continue
                }

                /* The hex was either not visited, or the path being considered here
                   has a lower cost. Add/replace the neighbors values in the dictionaries. */
                dictCostSoFar[neiKey] = newCost
                dictCameFrom[neiKey] = curCoord

                /* The neighbor hex will be pushed onto the Priority Queue.
                   The priority is newCost + A* Herustic value * directionExtraCost
                   For the priority value a lower value is higher priority. The lowest
                    priority value will be .pop()ed off the queue.
                  directionExtraCost adds a penalty for moving in the same direction
                    two steps in a row. Without this bias, paths that go left/right on
                    the hex map tend to move up as they travel right, then travel down
                    to reach the target. Or down at first, then up. This creates a U shaped
                    path that does not look straight. If two neighbors have the same herustic,
                    their order will be determined by the order that neighborsOf() returns,
                    which encourages moving in the same direction.
                    By adding a penalty to moving in the same direction twice, the path
                    is encouraged to zig/zag as it travels, making left/right paths look
                    more 'straight'
                  Additional biases can be added to adjust the way paths look on the screen.
                */
                let distance = this.hexDistance(endCoord, neiCoord)
                const neiDirection = this.neighborsWhichDirection(curCoord, neiCoord)
                const directionExtraCost = (neiDirection == front.lastDir) ? 0.1 : 0
                const heuristic = distance * hexNei.moveCost * 3
                const priority = newCost + heuristic + directionExtraCost

                // Push the neighbor onto frontier queue
                frontier.push({
                    coord: neiCoord,
                    priority: priority,
                    distance: distance,
                    lastDir: neiDirection,
                })
            }
        }

        // Frontier walking loop has finished, if we did not find a path return empty array
        if (!pathFound) { return [] }
        sanity = 10000   // TODO adjust value

        // Use dirCameFrom to walk backwards from endCoord to startCoord.
        var pathBack = [endCoord]
        curKey = `${endCoord.x},${endCoord.y}`

        while (dictCameFrom[curKey] !== undefined) {
            if (sanity-- < 0) { throw `GameModel.pathfindBetweenHexes() Sanity value hit in while() loop walking path` }
            const targetCoord = dictCameFrom[curKey]
            pathBack.push(targetCoord)
            curKey = `${targetCoord.x},${targetCoord.y}`
        }

        // Return the reversed path to go from start to end
        return pathBack.reverse()
    }

    // /////////////////////////////////////////////////////////////////////////
    // Overlay Generation

    /** Creates a force overlay showing how much attack and defense values each hex experiences from nearby units.
     *  Units project their combat values to nearby hexes, and their power drops off over distance. The power of all
     *  units on a side is summed, and a list of hexes and their recorded values is returned.
     *  This list is used to draw a colored overlay over the map showing the sides attack and defense values.
     */
    buildForceOverlayForSide(sideId) {
        const unitIds = this.oob.getUnitIdsInSideId(sideId)
        const movementPerDistance = this.modelState.forceOverlay.movementPerDistance
        const dropOffPerDistance = this.modelState.forceOverlay.dropOffPerDistance
        const d = {}

        // Iterate over all the units on a side
        for (let unitId of unitIds) {
            // Get the unit and the unit type
            const unit = this.oob.getUnitById(unitId)
            if (unit === undefined) { throw `GameModel.buildForceDictForSide() could not find unit id ${unitId}` }
            const natoUnitType = NatoUnitIcons.getUnitTypeForNatoIcon(unit.natoIcon)
            if (natoUnitType === undefined) { throw `GameModel.buildForceDictForSide() could not find unit type for nato icon ${unit.natoIcon}` }

            // Only sum power for infantry and tank, ignore air and naval
            if (natoUnitType !== NatoUnitTypes.Infantry && natoUnitType !== NatoUnitTypes.Tank) {
                continue
            }

            /* maxPowerDistance scales based on the movement points of the unit, and determines how far power projects.
                iterate over all nearby hexes and project power into them, scaled by distance from the unit */
            const maxPowerDistance = Math.ceil(unit.values.movement / this.modelState.forceOverlay.movementPerDistance)
            const hexCoords = this.getHexesWithinRange(unit.hexCoord, maxPowerDistance)
            for (let hexCoord of hexCoords) {
                const distance = this.hexDistance(unit.hexCoord, hexCoord)
                const powerScale = dropOffPerDistance ** distance
                const key = `${hexCoord.x},${hexCoord.y}`
                if (!d.hasOwnProperty(key)) {
                    d[key] = {
                        hexCoord: hexCoord,
                        attackAntiPersonnel: 0,
                        attackAntiTank: 0,
                        defensePersonnel: 0,
                        defenseTank: 0,
                        defense: 0,
                    }
                }
                // Standard values
                d[key].attackAntiPersonnel += unit.values.attackAntiPersonnel * powerScale
                d[key].attackAntiTank += unit.values.attackAntiTank * powerScale
                d[key].defense += unit.values.defense * powerScale

                // Defense based on unit type
                switch (natoUnitType) {
                    case NatoUnitTypes.Infantry:
                        d[key].defensePersonnel += unit.values.defense * powerScale
                        break
                    case NatoUnitTypes.Tank:
                        d[key].defenseTank += unit.values.defense * powerScale
                        break
                }
            }

        }
        return Object.values(d)
    }

    buildAllSidesForceOverlay() {

        /** Given two side/value pairs, returns a dictionary of the larger value subtracted from the smaller value, clamped to >0, and the id of the larger value */
        const getResult = (sideA, valueA, sideB, valueB) => {
            if ((valueA <= 0 && valueB <= 0) || valueA === valueB) {
                return { sideId: undefined, value: undefined }
            }
            if (valueA > valueB) {
                return { sideId: sideA.sideId, value: Math.max(0, valueA - valueB) }
            } else {
                return { sideId: sideB.sideId, value: Math.max(0, valueB - valueA) }
            }
        }

        /** Combines two getResult() dictionaries for personnel and tank powers, same sides combine power, opposite sides fight for power */
        const combineResults = (personnel, tank) => {
            const pSide = personnel.sideId
            const pValue = personnel.value || 0
            const tSide = tank.sideId
            const tValue = tank.value || 0
            if (pSide === tSide) {
                return {
                    sideId: pSide,
                    value: pValue + tValue
                }
            } else {
                if (pValue >= tValue) {
                    return { sideId: pSide, value: pValue - tValue }
                } else {
                    return { sideId: tSide, value: tValue - pValue }

                }

            }
        }

        const unitIds = this.oob.getAllUnitIds()
        const movementPerDistance = this.modelState.forceOverlay.movementPerDistance
        const dropOffPerDistance = this.modelState.forceOverlay.dropOffPerDistance
        const d = {}

        // Iterate over all the units on a side
        for (let unitId of unitIds) {
            // Get the unit and the unit type
            const unit = this.oob.getUnitById(unitId)
            const sideId = this.oob.getSideIdForUnitId(unitId)

            if (sideId === undefined) { throw `GameModel.buildAllSidesForceOverlay() could not look up side for unit id ${unitId}` }
            if (unit === undefined) { throw `GameModel.buildAllSidesForceOverlay() could not find unit id ${unitId}` }
            const natoUnitType = NatoUnitIcons.getUnitTypeForNatoIcon(unit.natoIcon)
            if (natoUnitType === undefined) { throw `GameModel.buildAllSidesForceOverlay() could not find unit type for nato icon ${unit.natoIcon}` }

            // Only sum power for infantry and tank, ignore air and naval
            if (natoUnitType !== NatoUnitTypes.Infantry && natoUnitType !== NatoUnitTypes.Tank) {
                continue
            }

            /* maxPowerDistance scales based on the movement points of the unit, and determines how far power projects.
                iterate over all nearby hexes and project power into them, scaled by distance from the unit */
            const maxPowerDistance = Math.ceil(unit.values.movement / this.modelState.forceOverlay.movementPerDistance)
            const hexCoords = this.getHexesWithinRange(unit.hexCoord, maxPowerDistance)
            for (let hexCoord of hexCoords) {
                const distance = this.hexDistance(unit.hexCoord, hexCoord)
                const powerScale = dropOffPerDistance ** distance
                const key = `${hexCoord.x},${hexCoord.y}`
                if (!d.hasOwnProperty(key)) {
                    d[key] = {
                        hexCoord: hexCoord,
                        sides: {},
                        result: undefined
                    }
                }
                if (!d[key].sides.hasOwnProperty(sideId)) {
                    d[key].sides[sideId] = {
                        sideId: sideId,
                        attackAntiPersonnel: 0,
                        attackAntiTank: 0,
                        defensePersonnel: 0,
                        defenseTank: 0,
                        defense: 0,
                    }
                }
                // Standard values
                d[key].sides[sideId].attackAntiPersonnel += unit.values.attackAntiPersonnel * powerScale
                d[key].sides[sideId].attackAntiTank += unit.values.attackAntiTank * powerScale
                d[key].sides[sideId].defense += unit.values.defense * powerScale

                // Defense based on unit type
                switch (natoUnitType) {
                    case NatoUnitTypes.Infantry:
                        d[key].sides[sideId].defensePersonnel += unit.values.defense * powerScale
                        break
                    case NatoUnitTypes.Tank:
                        d[key].sides[sideId].defenseTank += unit.values.defense * powerScale
                        break
                }
            }
        }

        // Now produce the total, for now limit to two sides, figure out 3+ side force calculations later
        for (const value of Object.values(d)) {
            const sidesInHex = Object.keys(value.sides)
            if (sidesInHex.length == 0) { continue }
            if (sidesInHex.length > 2) { throw `GameModel.buildAllSidesForceOverlay() Scenario has more than two sides, not supported by this version of bwar` }
            if (sidesInHex.length == 1) {
                const sideId = parseInt(sidesInHex[0])
                value.result = {
                    personnel: { sideId: sideId, value: value.sides[sideId].attackAntiPersonnel },
                    tank: { sideId: sideId, value: value.sides[sideId].attackAntiTank },
                    total: { sideId: sideId, value: value.sides[sideId].attackAntiPersonnel + value.sides[sideId].attackAntiTank } // TODO adjust this by tankVsInfantryFactor?
                }
            } else if (sidesInHex.length == 2) {
                const sideA = value.sides[sidesInHex[0]]
                const sideB = value.sides[sidesInHex[1]]
                // Positive values = sideA stronger, Negative values = sideB stronger
                const personnelSideA = sideA.attackAntiPersonnel - sideB.defensePersonnel
                const personnelSideB = sideB.attackAntiPersonnel - sideA.defensePersonnel
                const tankSideA = sideA.attackAntiTank - sideB.defenseTank
                const tankSideB = sideB.attackAntiTank - sideA.defenseTank

                const personnelResult = getResult(sideA, personnelSideA, sideB, personnelSideB)
                const tankResult = getResult(sideA, tankSideA, sideB, tankSideB)
                value.result = {
                    personnel: personnelResult,
                    tank: tankResult,
                    total: combineResults(personnelResult, tankResult),
                }
            }
        }


        return Object.values(d)
    }



}


export { GameModel };
