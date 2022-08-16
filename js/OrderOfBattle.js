import { Unit } from './models';

const arrayStringToInt = (arr) => {
    for (let i = 0; i < arr.length; ++i) {
        arr[i] = parseInt(arr[i])
    }
    return arr
}

class OrderOfBattle {
    constructor() {
        // Contains all sides, forces, formations, and units with key = id
        this.reset()
    }

    /** Resets this.oob to default values */
    reset() {
        this.oob = {
            idCounters: {
                // Shows the next free ID for each type
                sides: 0,
                forces: 0,
                formations: 0,
                units: 0,
            },
            sides: {},
            forces: {},
            formations: {},
            units: {},
        }
    }

    /** Loads scenario.forces onto this.oob */
    loadOOBData(scenario) {
        if (!(scenario.hasOwnProperty('name') && scenario.hasOwnProperty('mapSize') &&
            scenario.hasOwnProperty('colors') && scenario.hasOwnProperty('hexes') &&
            scenario.hasOwnProperty('forces'))) {
            throw 'OrderOfBattle.loadOOBData() data has missing fields'
        }

        for (let [scenarioForceID, forceData] of Object.entries(scenario.forces)) {
            const sideId = this.createSide(forceData.name)
            const forceId = this.createForce(sideId, forceData.name)
            for (let [scenarioFormationId, formationData] of Object.entries(forceData.formations)) {
                const formationId = this.createFormation(forceId, formationData.name)
                for (let [scenarioUnitId, unitData] of Object.entries(formationData.units)) {
                    if (unitData.goingtox) { continue }
                    this.createUnit(
                        forceId,
                        formationId,
                        unitData.name,
                        undefined,
                        unitData.natoIcon,
                        unitData.unitSize,
                        unitData.color,
                        unitData.hexCoord,
                        unitData.values
                    )
                }
            }
        }
    }


    // ////////////////////////////////////////////////
    // Adding and removing

    setForceSide(forceId, sideId) {
        // The force and sides must exist
        if (!this.oob.sides.hasOwnProperty(sideId)) { throw `OrderOfBattle.setForceside() side ${sideId} does not exist` }
        if (!this.oob.forces.hasOwnProperty(forceId)) { throw `OrderOfBattle.setForceside() force ${forceId} does not exist` }

        // Delete the force from all existing sides
        const sides = Object.values(this.oob.sides)
        for (let i = 0; i < sides.length; ++i) {
            sides[i].forces.delete(forceId)
        }
        // Add the force to the passed side
        this.oob.sides[sideId].forces.add(forceId)
        // Set the force to the given side
        this.oob.forces[forceId].sideId = sideId
    }

    createSide(sideName) {
        const side = {
            sideId: this.oob.idCounters.sides++,
            name: sideName,
            forces: new Set(),
        }
        this.oob.sides[side.sideId] = side
        return side.sideId
    }

    // Creates a new force named forceName, gives it a new id, sets it to sideId, and returns forceId
    createForce(sideId, forceName) {
        if (!this.oob.sides.hasOwnProperty(sideId)) { throw `OrderOfBattle.createForce() unknown side ${sideId}` }
        const force = {
            sideId: sideId,
            forceId: this.oob.idCounters.forces++,
            name: forceName,
            formations: new Set(),
        }
        this.oob.forces[force.forceId] = force
        this.setForceSide(force.forceId, sideId)
        return force.forceId
    }

    // Creates a new formation named formationName, gives it a new id, and returns formationId
    createFormation(forceId, formationName) {
        if (!this.oob.forces.hasOwnProperty(forceId)) { throw `OrderOfBattle.createFormation() unknown force ${forceId}` }
        const formation = {
            forceId: forceId,
            formationId: this.oob.idCounters.formations++,
            name: formationName,
            units: new Set(),
        }
        this.oob.formations[formation.formationId] = formation
        this.oob.forces[forceId].formations.add(formation.formationId)
        return formation.formationId
    }

    // Creates a new unit named unitName, gives it a new id, and returns unitId
    createUnit(forceId, formationId, unitName, unitType, natoIcon, unitSize, color, hexCoord, values) {
        if (!this.oob.forces.hasOwnProperty(forceId)) { throw `OrderOfBattle.createUnit() unknown force ${forceId} for unit ${unitName}` }
        if (!this.oob.formations.hasOwnProperty(formationId)) { throw `OrderOfBattle.createUnit() unknown formation ${formationId} for unit ${unitName}` }
        const unit = new Unit({
            unitId: this.oob.idCounters.units++,
            forceId: forceId,
            formationId: formationId,
            name: unitName,
            unitType: unitType,
            natoIcon: natoIcon,
            unitSize: unitSize,
            color: color,
            hexCoord: { ...hexCoord },
            values: { ...values }

        })
        this.oob.units[unit.unitId] = unit
        this.oob.formations[formationId].units.add(unit.unitId)
        return unit.unitId
    }



    // ///////////////////////////////////////////////////////////////////////
    // Lookup Object by Id

    /** Lookup a sideId and return the side, or undefined if does not exist */
    getSideById(sideId) {
        if (!this.oob.units.hasOwnProperty(sideId)) { return undefined }
        return this.oob.sides[sideId]
    }

    /** Lookup a forceId and return the force, or undefined if does not exist */
    getForceById(forceId) {
        if (!this.oob.units.hasOwnProperty(forceId)) { return undefined }
        return this.oob.forces[forceId]
    }

    /** Lookup a formationId and return the formation, or undefined if does not exist */
    getFormationById(formationId) {
        if (!this.oob.units.hasOwnProperty(formationId)) { return undefined }
        return this.oob.formations[formationId]
    }

    /** Lookup a unitId and return the unit, or undefined if does not exist */
    getUnitById(unitId) {
        if (!this.oob.units.hasOwnProperty(unitId)) { return undefined }
        return this.oob.units[unitId]
    }


    

    // ///////////////////////////////////////////////////////////////////////
    // Lookup Children Ids

    /** Returns the unitIds of all units, even those that may not be on the map */
    getAllUnitIds() {
        return arrayStringToInt(Object.keys(this.oob.units))
    }

    /** Returns all formationIds of all formations */
    getAllFormationIds() {
        return arrayStringToInt(Object.keys(this.oob.formations))
    }

    /** Returns all formationIds of all formations */
    getAllForceIds() {
        return arrayStringToInt(Object.keys(this.oob.forces))
    }

    /** Returns unitIds of all units on a side, or empty list if the side does not exist */
    getUnitIdsInSideId(sideId) {
        let unitIds = []
        const forcesInSide = this.getForcesIdInSideId(sideId)
        for (const forceId of forcesInSide) {
            const formationsInForce = this.getFormationIdsInForceId(forceId)
            for (const formationId of formationsInForce) {
                const unitsInFormation = this.getUnitIdsInFormationId(formationId)
                for (const unitId of unitsInFormation) {
                    unitIds.push(unitId)
                }
            }
        }
        return unitIds
    }

    /** Returns unitIds of all units in a force, or empty list if the force does not exist */
    getUnitIdsInForceId(forceId) {
        let unitIds = []
        const formationsInForce = this.getFormationIdsInForceId(forceId)
        for (const formationId of formationsInForce) {
            const unitsInFormation = this.getUnitIdsInFormationId(formationId)
            for (const unitId of unitsInFormation) {
                unitIds.push(unitId)
            }
        }
        return unitIds
    }

    /** Returns forceIds of all forces in a side, or empty list if the side does not exist */
    getForcesIdInSideId(sideId) {
        const side = this.getSideById(sideId)
        if (side === undefined) { return [] }
        return Array.from(side.forces)
    }

    /** Returns formationIds of all formations in a force, or empty list if the force does not exist */
    getFormationIdsInForceId(forceId) {
        const force = this.getForceById(forceId)
        if (force === undefined) { return [] }
        return Array.from(force.formations)
    }

    /** Returns unitIds of all units in a formation, or empty list if the formation does not exist */
    getUnitIdsInFormationId(formationId) {
        const formation = this.getFormationById(formationId)
        if (formation === undefined) { return [] }
        return Array.from(formation.units)
    }




    // ///////////////////////////////////////////////////////////////////////
    // Lookup Parent Id

    getSideIdForForceId(forceId) {
        if (!this.oob.forces.hasOwnProperty(forceId)) { return undefined }
        return this.oob.forces[forceId].sideId
    }

    getForceIdForFormationId(formationId) {
        if (!this.oob.formations.hasOwnProperty(formationId)) { return undefined }
        return this.oob.formations[formationId].forceId
    }

    getFormationIdForUnitId(unitId) {
        if (!this.oob.units.hasOwnProperty(unitId)) { return undefined }
        return this.oob.units[unitId].formationId
    }

    getForceIdForUnitId(unitId) {
        const formationId = this.getFormationIdForUnitId(unitId)
        return this.getForceIdForFormationId(formationId)
    }

    getSideIdForUnitId(unitId) {
        const forceId = this.getForceIdForUnitId(unitId)
        return this.getSideIdForForceId(forceId)
    }

    getSideIdForFormationId(formationId) {
        const forceId = this.getForceIdForFormationId(formationId)
        return this.getSideIdForForceId(forceId)
    }


    // ///////////////////////////////////////////////////////////////////////
    // Misc Lookups
    
    /** Returns true if unitId1 and unitId2 are on the same side, false if not */
    areUnitsFriendly(unitId1, unitId2) {
        return this.getSideIdForUnitId(unitId1) === this.getSideIdForUnitId(unitId2)
    }

    // ///////////////////////////////////////////////////////////////////////
    // Lookup Total Values    

    _totalValuesForUnitIds(unitIds) {
        const totals = {
            attackAntiPersonnel: 0,
            attackAntiTank: 0,
            attackAntiAir: 0,
            defense: 0
        }
        for (const unitId of unitIds) {
            const unit = this.getUnitById(unitId)
            totals.attackAntiPersonnel += unit.values.attackAntiPersonnel || 0
            totals.attackAntiTank += unit.values.attackAntiTank || 0
            totals.attackAntiAir += unit.values.attackAntiAir || 0
            totals.defense += unit.values.defense || 0
        }

        return totals
    }

    calcTotalsForForce(forceId) {
        return this._totalValuesForUnitIds(this.getUnitIdsInForceId(forceId))
    }

    calcTotalsForFormation(formationId) {
        return this._totalValuesForUnitIds(this.getUnitIdsInFormationId(formationId))
    }
};


export { OrderOfBattle };
