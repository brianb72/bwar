/**
 * Unitstack.js
 *      Tracks a stack of unit counters in a hex.
 *      The top unit is located at the end of unitArray.
 */

class UnitStack {
    constructor() {
        this.unitArray = []
        this.unitSet = new Set()
    }

    /** Returns the number of units in the stack */
    getUnitCountInStack() {
        return this.unitArray.length
    }

    /** Returns a unitId at the index */
    getUnitIdAtIndex(index) {
        if (index < 0 || index >= this.unitArray.length) {
            throw `UnitStack.getUnitIdAtIndex() passed invalid index ${index}`
        }
        return this.unitArray[index]
    }


    /** Adds a unit by id to the unit stack, the new unit will be the top counter */
    addUnitId(unitId) {
        if (this.unitSet.has(unitId)) { return }
        this.unitArray.push(unitId)
        this.unitSet.add(unitId)
    }

    /** Removes a unit by id from the unit stack, silently ignore if unit does not exist */
    removeUnitId(unitId) {
        if (!(this.unitSet.has(unitId))) { return false }
        let idx = this.unitArray.indexOf(unitId)
        this.unitArray.splice(idx, 1)
        this.unitSet.delete(unitId)
    }

    /** Sends the top unit to the bottom of the stack each time this is called */
    cycleUnits() {
        if (this.unitArray.length < 2) { return }
        const unitId = this.unitArray.pop()
        this.unitArray.unshift(unitId)
    }

    /** Moves the unitId to the top of the stack */
    moveUnitIdToTop(unitId) {
        if (!(this.unitSet.has(unitId))) {
            throw `UnitStack.moveUnitToTop() unit does not exist in unitSet ${unitId}`
        }
        let idx = this.unitArray.indexOf(unitId)
        this.unitArray.splice(idx, 1)
        this.unitArray.push(unitId)
    }

    /** Returns the top unit on the stack, or undefined if empty */
    getTopUnitId() {
        if (this.unitArray.length == 0) { return undefined }
        return this.unitArray[this.unitArray.length - 1]
    }

    /** Returns true if unitId is in the stack */
    isUnitIdInStack(unitId) {
        return this.unitSet.has(unitId)
    }
}


export { UnitStack }