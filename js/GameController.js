import { GameModel } from './GameModel'
import { GameView, VIEWCONFIG } from './GameView'
import { Coordinates } from './Coordinates'

class GameController extends Coordinates {
    constructor(scenario) {
        super(scenario.mapSize.width, scenario.mapSize.height)
        this.scenario = scenario
        let startCreate, finishCreate

        this.oobTreeData = []

        // Default HTML control states
        $('#switchUnitMovement').prop('checked', false)

        this.model = new GameModel(this, scenario)
        this.view = new GameView(this, this.model, scenario)

        this.view.viewState.isPathfindingAllowed = false

        this.loadTreeViewWithOOB()

        //this.view.centerViewOnHex(this.makeCoordCart(36, 31), false)

        const myThis = this
        // Events for HTML components
        $('#switchUnitMovement').change( function() {
            const isPathfindingAllowed = $(this).prop('checked')
            myThis.view.viewState.isPathfindingAllowed = isPathfindingAllowed
            if (isPathfindingAllowed) {
                myThis.view.updatePathfindingPath()
            } else {
                myThis.view.pathfindingClearPath()
            }
        })


        $('#overlay-none').on('click', (event) => {
            this.view.clearAllOverlays()
        })

        const updateOverlay = (forceType) => {
            this.view.clearAllOverlays()
            startCreate = performance.now()
            const forceOverlayList = this.model.buildAllSidesForceOverlay()
            this.view.drawAllSidesForceOverlay(forceOverlayList, '#00ff00', '#ff0000', forceType)
            finishCreate = performance.now()
            console.log(`Drew force overlay in ${finishCreate - startCreate}ms`)        
        }

        $('#overlay-combined').on('click', (event) => {
            updateOverlay('total')
        })

        $('#overlay-personnel').on('click', (event) => {
            updateOverlay('personnel')
        })

        $('#overlay-tank').on('click', (event) => {
            updateOverlay('tank')
        })

        $('#center-hex').on('click', (event) => {
            this.view.centerViewOnHex(this.makeCoordCart(36, 31), false)
        })

        $('#buttonShowHQ').on('click', (event) => {
            this.view.bringAllHQToTop()
        })
    }

    /** Load the HTML TreeView with all data from the OOB */
    loadTreeViewWithOOB() {
        const o = this.model.oob

        for (const forceId of o.getAllForceIds()) {
            const force = o.getForceById(forceId)
            const forceTotals = o.calcTotalsForForce(forceId)
            const forceDict = {
                text: `${force.name}  |  ${forceTotals.attackAntiPersonnel} - ${forceTotals.attackAntiTank} - ${forceTotals.defense}`,
                forceId: forceId,
                nodes: [],
                selectable: false,
                backColor: 'Black',
                color: 'White'
            }
            for (const formationId of o.getFormationIdsInForceId(forceId)) {
                const formation = o.getFormationById(formationId)
                const formationTotals = o.calcTotalsForFormation(formationId)
                const formationDict = {
                    text: `${formation.name}  |  ${formationTotals.attackAntiPersonnel} - ${formationTotals.attackAntiTank} - ${formationTotals.defense}`,
                    formationId: formationId,
                    backColor: 'Tan',
                    selectable: false,
                    nodes: []
                }
                for (const unitId of o.getUnitIdsInFormationId(formationId)) {
                    const unit = o.getUnitById(unitId)
                    const attackAntiPersonel = unit.values.attackAntiPersonnel || 0
                    const attackAntiTank = unit.values.attackAntiTank || 0
                    const defense = unit.values.defense || 0
                    var unitDict = {
                        text: `${unit.natoIcon} - ${unit.name} | ${attackAntiPersonel} - ${attackAntiTank} - ${defense}`,
                        unitId: unitId,
                        nodes: null,
                        selectable: true
                    }
                    formationDict.nodes.push(unitDict)
                }
                forceDict.nodes.push(formationDict)
            }
            this.oobTreeData.push(forceDict)
        }

        $('#oob_tree')
            .treeview({
                data: this.oobTreeData,
                collapseIcon: "fas fa-chevron-circle-down",
                expandIcon: "fas fa-chevron-circle-right",
                levels: 1,
            })
            .on('nodeSelected', function (event, data) {
                this.oobTreeUnitSelectedEvent(data.unitId)
            }.bind(this))
    }

    /** Event triggered when a unit on the OOB TreeView is clicked, the unitId of clicked unit is passed */
    oobTreeUnitSelectedEvent(unitId) {
        // Lookup the unit
        if (unitId === undefined) return
        const unit = this.model.oob.getUnitById(unitId)
        if (unit === undefined) {
            throw `GameController.oobTreeUnitSelectedEvent() could not find unit ${unitId}`
        }

        // Lookup the hex the unit is in
        const hex = this.model.getHex(unit.hexCoord)
        if (hex === undefined) {
            throw `GameController.oobTreeUnitSelectedEvent() could not find hex ${unit.hexCoord.x}, ${unit.hexCoord.y}`
        }

        // Move the unit to the top of the unit stack
        hex.unitStack.moveUnitIdToTop(unitId)
        this.view.stackUnitCountersInHex(unit.hexCoord)

        // Update the selected unit and hex
        this.view.setSelectedHex(unit.hexCoord)

        this.view.centerViewOnHex(unit.hexCoord, true)
    }







    // /////////////////////////////////////////////////////////////////////////
    // Mouse handlers

    /** View left click handler, sets selected hex and also sets selected unit */
    viewLeftClicked(pixelCoord) {
        const hexCoord = this.view.pixelToHexCoord(pixelCoord)
        const lastSelectedUnitId = this.view.viewState.selectedUnitId
        if (hexCoord === undefined) {
            this.view.setSelectedHex(undefined)
            return
        }
        if (this.isCoordEqual(this.view.viewState.selectedHexCoord, hexCoord)) {
            this.view.stackUnitCountersInHex(hexCoord, true)
        }
        this.view.setSelectedHex(hexCoord)
        
        // If a new unit has been selected in the map, also selected it in the OOB
        this.view.selectUnitInOOBTree(this.view.viewState.selectedUnitId)

    }

    /** View right click handler, move selected unit along pathfinding if allowed */
    viewRightClicked(pixelCoord) {
        if (!this.view.viewState.isPathfindingAllowed || 
            this.view.viewState.pathfindingMovePath === undefined ||
            this.view.viewState.pathfindingMovePath.length < 2) {
            return
        }

        // Get the hex that was clicked on, return if invalid
        const targetHexCoord = this.view.pixelToHexCoord(pixelCoord)
        if (targetHexCoord === undefined) {
            return
        }

        // Check that there is a selected unitId and hexCoord or do nothing
        const selectedUnitId = this.view.viewState.selectedUnitId
        const selectedHexCoord = this.view.viewState.selectedHexCoord
        if (selectedUnitId === undefined || selectedHexCoord === undefined) {
            return
        }

        // Tell the model to move the unit to target hex, if the move fails then abort without animating
        if (!this.model.moveUnitIdToHexCoord(selectedUnitId, targetHexCoord)) {
            return
        }

        // Tell the view to start an animation moving the unit to it's target hex
        this.view.animationMoveUnitOnPath(selectedUnitId, targetHexCoord, this.view.viewState.pathfindingMovePath)
    }

    /** View mouse move handler, update pathfinding path */
    viewMouseMoved(pixelCoord) {       
        const targetHexCoord = this.view.pixelToHexCoord(pixelCoord)
        if (!this.isCoordEqual(this.view.viewState.mouseHoverHexCoord, targetHexCoord)) {
            this.view.viewState.mouseHoverHexCoord = targetHexCoord
            this.view.updatePathfindingPath()
        }
    }

}


export { GameController };
