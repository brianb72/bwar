import { Coordinates } from './Coordinates'
import { TerrainData, UnitSize } from './models'
import { NatoUnitIcons } from './NatoUnitIcons'

const HEXPIXELRADIUS = 57

/** Constants used by the view */
const VIEWCONFIG = {
    targetDivId: 'divmainmap',
    svgId: 'mainsvg',
    hexPixelRadius: HEXPIXELRADIUS,
    hexPixelWidth: HEXPIXELRADIUS * 2,
    hexPixelHeight: HEXPIXELRADIUS * Math.sqrt(3),
    showCoordinates: true,
    viewBox: { width: 1750, height: 900 },
    unitCounters: {
        size: { width: 64, height: 56 },
        iconScale: { width: 0.62, height: 0.45 },
        rounding: 6,
        topSidePercent: 0.16,
        botSidePercent: 0.88,
        leftSidePercent: 0.17,
        rightSidePercent: 0.83,
    },
    selectedHexStrokeWidth: 15,
}



class GameView extends Coordinates {
    constructor(controller, model, scenario) {
        super(scenario.mapSize.width, scenario.mapSize.height)
        this.controller = controller
        this.model = model
        this.scenario = scenario

        // State info about the view
        this.viewState = {
            isPathfindingAllowed: false,
            isAnimationRunning: false,
            mouseHoverHexCoord: undefined,
            selectedHexCoord: undefined,
            selectedUnitId: undefined,
            pathfindingMovePath: undefined,
        }

        // SVG object and all of its subgroups
        this.svgGroups = {
            mainSVG: undefined,     // The main SVG() object attached to the DOM
            transform: undefined,   // Subgroup of main, receives D3 transform.
            // All other layers are under transform
            hexesBase: undefined,   // Hex outlines, terrain colors
            overlays: undefined,    // Standard overlays
            hexesCoords: undefined, // Text coordinates for each hex
            hexesLabels: undefined, // Labels
            hexesPoints: undefined, // Victory Points
            units: undefined,       // All unit counters
            pathfindingHover: undefined,  // Pathfinding path and movement cost
        }

        // Data used by D3
        this.d3Handlers = {
            zoomed: undefined,
            zoom: undefined,
            mouseMoveHandler: undefined,
        }

        this.hexCornerList = this.hexPixelCorners()

        // Create the main SVG, all subgroups, and load all hexes
        let startCreate = performance.now()
        this.createSVG()
        let finishCreate = performance.now()
        console.log(`Created SVG Map in ${finishCreate - startCreate}ms`)

        this.addD3Handlers()

    }


    /** Create the main SVG, all hexes, and all unit counters */
    createSVG() {
        const gr = this.svgGroups
        const vc = VIEWCONFIG
        const sc = this.scenario
        const mapHexWidth = this.scenario.mapSize.width
        const mapHexHeight = this.scenario.mapSize.height
        const hexPixelRadius = vc.hexPixelRadius
        const idDiv = vc.targetDivId
        const idSvg = vc.svgId
        const baseHexPixelCenter = this.hexPixelCenter()

        // Clear the <div> that will hold othe svg, in case a previous map was loaded
        $(`#${idDiv}`).empty()

        // Create the main SVG() and set attributes
        gr.mainSVG = SVG()
            .size(hexPixelRadius * 2 * mapHexWidth * 1.1,
                hexPixelRadius * 2 * mapHexHeight * 1.1)
        gr.mainSVG.attr('id', idSvg).attr('width', '100%').attr('height', '100%')

        // Create the transform group, which will hold all other groups
        gr.transform = gr.mainSVG.group().attr('id', 'transform')

        // Create all subgroups, last created object has highest Z order
        gr.hexesBase = gr.transform.group().attr('id', 'hexesBase')
        gr.overlays = gr.transform.group().attr('id', 'overlays')
        gr.hexesCoords = gr.transform.group().attr('id', 'hexesCoords')
        gr.hexesLabels = gr.transform.group().attr('id', 'hexesLabels')
        gr.hexesPoints = gr.transform.group().attr('id', 'hexesPoints')
        gr.units = gr.transform.group().attr('id', 'units')
        gr.pathfindingHover = gr.transform.group().attr('id', 'pathfindingHover')

        // Iterate hexMap, get each hex, and draw it's polygon on hexesBase
        for (let y = 0; y < mapHexHeight; ++y) {
            for (let x = 0; x < mapHexWidth; ++x) {
                const hexCoord = this.makeCoordCart(x, y)
                const hex = this.model.getHex(hexCoord)
                if (hex === undefined) { throw `GameView.createSVG() could not get hex [${hexCoord.x},${hexCoord.y}]` }

                // Get pixel coordinates for the hex
                const originPosition = this.hexCoordToPixel(hexCoord)
                const baseHexPixelCenter = this.hexPixelCenter()
                const centerPosition = { x: baseHexPixelCenter.x + originPosition.x, y: baseHexPixelCenter.y + originPosition.y }

                // Use the terrainId to determine what color to fill the hex with
                if (!TerrainData.hasOwnProperty(hex.terrainId)) {
                    throw `GameView.createSVG() invalid terrainId in scenario [${hexCoord.x},${hexCoord.y},${hex.terrainId}]`
                }
                const fillColor = TerrainData[hex.terrainId].color

                // Draw the polygon for the hex and save the handle
                hex.svgHex = gr.hexesBase.polygon(this.hexCornerList)
                    .fill(fillColor)
                    .stroke({ width: 1, color: 'Black' })
                    .translate(originPosition.x, originPosition.y)

                // If enabled, draw hex coordinates
                if (vc.showCoordinates) {
                    gr.hexesCoords.text(`${x},${y}`)
                        .font({ family: 'Verdana', size: 15, fill: 'Black', weight: 'bold', leading: 1.4, anchor: 'middle' })
                        .translate(centerPosition.x, centerPosition.y - hexPixelRadius * 0.63)
                }

                // Draw a label if it exists
                if (hex.label !== undefined && hex.label.length > 0) {
                    gr.hexesLabels.text(`${hex.label}`)
                        .font({ family: 'Verdana', size: 15, fill: 'Black', weight: 'bold', leading: 1.4, anchor: 'middle' })
                        .translate(centerPosition.x, centerPosition.y + hexPixelRadius * 0.75)
                }

                // Draw victory points
                if (hex.victoryPoints !== undefined && hex.victoryPoints > 0) {
                    gr.hexesPoints.text(`${hex.victoryPoints}`)
                        .font({ family: 'Verdana', size: 15, fill: 'Black', weight: 'bold', leading: 1.4, anchor: 'middle' })
                        .translate(centerPosition.x + hexPixelRadius * 0.75, centerPosition.y)
                }

                /* 
                const cx = x
                const cy = y

                hex.svgTopEvent.on('mouseover', () => {
                    if (!this.viewState.selectedHexCoords) { return }
                    if (this.viewState.isPathfinding) {
                    console.log('Pathfinding already, ignoring mouse over')
                    return
                    }
                    const hoverHexCoords = makeCoordCart(cx,cy)
                    this.viewState.mouseHoverOverCoords = hoverHexCoords
                    this.controller.handleEventFromView({
                    message: "MOUSEHOVER",
                    hoverHexCoords: hoverHexCoords,
                    selectedHexCoords: this.viewState.selectedHexCoords,
                    })
                })
                */
            }
        }

        // Before adding the SVG to the DOM, add the units
        this.createSVGForAllUnits()

        // After the SVG object is complete, add it to the DOM
        // Don't add it beforehand or each update will force a redraw
        gr.mainSVG.addTo(`#${vc.targetDivId}`)
    }




    // /////////////////////////////////////////////////////////////////////////
    // Units

    /** Iterate over all unitIds on the oob and create a counter for each */
    createSVGForAllUnits() {
        this.svgGroups.units.hide()
        for (const unitId of this.model.oob.getAllUnitIds()) {
            const unit = this.model.oob.getUnitById(unitId)
            if (unit === undefined) { throw `GameView.createSVGForAllUnits() could not lookup unit ${unitId}` }
            this.createCounterForUnit(unit)
        }
        this.stackAllUnitCounters()
        this.svgGroups.units.show()
    }

    /** Create an SVG counter for the unit and place it on the map in unit.hexCoord */
    createCounterForUnit(unit) {
        if (!unit.hasOwnProperty('hexCoord')) {
            throw `GameView.createCounterForUnit() unit ${unit?.unitId} has no hexCoord value`
        }
        if (!this.scenario.colors.hasOwnProperty(unit?.color)) {
            throw `GameView.createCounterForUnit) unit ${unit?.unitId} has invalid color ${unit?.color}`
        }
        if (unit.hexCoord?.x === undefined || unit.hexCoord?.y === undefined
            || unit?.goingtox !== undefined || unit?.goingtoy !== undefined) {
            return
        }

        // Get some convinence variables, the target hex, and put the unit in the hex
        const uc = VIEWCONFIG.unitCounters
        const colors = this.scenario.colors[unit.color]
        const colorTileFore = colors.tile_fore
        const colorTileBack = colors.tile_back
        const colorIconFore = colors.symbol_fore
        const colorIconBack = colors.symbol_back
        const hex = this.model.getHex(unit.hexCoord)

        if (hex === undefined) {
            throw `GameView.createCounterForUnit() unit has undefined hex ${unit.hexCoord}`
        }

        hex.unitStack.addUnitId(unit.unitId)

        // Calculate the hex position, and the position of the counter in the hex
        const originPosition = this.hexCoordToPixel(unit.hexCoord)
        const baseHexPixelCenter = this.hexPixelCenter()
        const centerPosition = {
            x: baseHexPixelCenter.x + originPosition.x - (uc.size.width / 2),
            y: baseHexPixelCenter.y + originPosition.y - (uc.size.height / 2)
        }

        // Create a new SVG group to hold this unit, store it in the unit
        const unitGroup = this.svgGroups.units.group().attr('id', `unit${unit.unitId}`)
        unit.svgLayers.base = unitGroup

        // Draw the main shape of the counter as a rectangle
        unitGroup.rect(uc.size.width, uc.size.height)
            .radius(uc.rounding)
            .stroke({ color: 'Black', opacity: 1.0, width: 1 })
            .fill(colorTileBack)

        // Create a new group for the NATO icon
        const iconWidth = uc.size.width * uc.iconScale.width
        const iconHeight = uc.size.height * uc.iconScale.height
        const iconGroup = unitGroup.group()
        unit.svgLayers.icon = iconGroup
        iconGroup.rect(iconWidth, iconHeight)
            .radius(uc.rounding)
            .stroke({ color: colorIconFore, opacity: 1.0, width: 1 })
            .fill(colorIconBack)

        // Draw the NATO icon onto the iconGroup and move it into position
        NatoUnitIcons.drawIcon(iconGroup, unit.natoIcon, colorIconFore, iconWidth, iconHeight, uc.rounding)
        iconGroup.move((uc.size.width / 2) - (iconWidth / 2),
            (uc.size.height / 2) - (iconHeight / 2))

        // Draw unit size on top position
        if (!(unit.unitSize !== undefined && UnitSize.hasOwnProperty(unit.unitSize))) {
            throw `GameView.createCounterForUnit() unit has unknown size ${unit.unitId}`
        }
        let unitSizeSymbol = UnitSize[unit.unitSize].symbol

        unit.svgLayers.stats.top = unitGroup.text(unitSizeSymbol)
            .font({ family: 'Verdana', size: 11, fill: 'Black', weight: 'bold' })
            .center(uc.size.width / 2, uc.size.height * uc.topSidePercent)

        // Draw all the combat values
        //  aAA  UnitSize  mov
        //  aAP    aAT     def
        if (!unit.hasOwnProperty('values')) { throw `GameView.createCounterForUnit() unit has no values ${unit.unitId}` }

        const valAttackAntiPersonnel = unit.values.attackAntiPersonnel || '-'
        const valAttackAntiTank = unit.values.attackAntiTank || '-'
        const valAttackAntiAir = unit.values.attackAntiAir || '-'
        const valDefense = unit.values.defense || '-'
        const valMovement = unit.values.movement || '-'

        unit.svgLayers.stats.ul = unitGroup.text(`${valAttackAntiAir}`)
            .font({ family: 'Verdana', size: 12, fill: 'Black', weight: 'bold' })
            .center(uc.size.width * uc.leftSidePercent, uc.size.height * uc.topSidePercent)

        unit.svgLayers.stats.ur = unitGroup.text(`${valMovement}`)
            .font({ family: 'Verdana', size: 12, fill: 'Black', weight: 'bold' })
            .center(uc.size.width * uc.rightSidePercent, uc.size.height * uc.topSidePercent)

        unit.svgLayers.stats.ll = unitGroup.text(`${valAttackAntiPersonnel}`)
            .font({ family: 'Verdana', size: 12, fill: 'Black', weight: 'bold' })
            .center(uc.size.width * uc.leftSidePercent, uc.size.height * uc.botSidePercent)

        unit.svgLayers.stats.bot = unitGroup.text(`${valAttackAntiTank}`)
            .font({ family: 'Verdana', size: 12, fill: 'Black', weight: 'bold' })
            .center(uc.size.width / 2, uc.size.height * uc.botSidePercent)

        unit.svgLayers.stats.lr = unitGroup.text(`${valDefense}`)
            .font({ family: 'Verdana', size: 12, fill: 'Black', weight: 'bold' })
            .center(uc.size.width * uc.rightSidePercent, uc.size.height * uc.botSidePercent)

        // Drawing done, move into position
        unitGroup.transform({ position: [centerPosition.x, centerPosition.y], origin: 'top left' })
            .front()

    }



    /** Adjust the positioning of all unit counters to visually stack them in their hex */
    stackAllUnitCounters() {
        const hexCoordUpdated = new Set()
        const unitIds = this.model.oob.getAllUnitIds()
        for (let i = 0; i < unitIds.length; ++i) {
            const unit = this.model.oob.getUnitById(unitIds[i])
            if (!this.isCoordOnMap(unit.hexCoord)) { continue }
            if (hexCoordUpdated.has(unit.hexCoord)) { continue }
            hexCoordUpdated.add(unit.hexCoord)
            this.stackUnitCountersInHex(unit.hexCoord, false)
        }
    }

    /** Adjust the positioning of unit counters in a hex to visually stack them up */
    stackUnitCountersInHex(hexCoord, cycleUnits) {
        const hex = this.model.getHex(hexCoord)
        if (hex === undefined) { throw `GameView.stackUnitCountersInHex() could not get hex [${hexCoord.x},${hexCoord.y}]` }

        if (cycleUnits) {
            hex.unitStack.cycleUnits()
        }

        const us = VIEWCONFIG.unitCounters.size
        const stackLength = hex.unitStack.getUnitCountInStack()
        if (stackLength == 0) { return }
        const pixelPosition = this.hexCoordToPixel(hexCoord)
        const pixelCenter = this.hexPixelCenter()
        const pixelX = pixelPosition.x + pixelCenter.x
        const pixelY = pixelPosition.y + pixelCenter.y

        /* Each counter is slightly offset up and left from the counter beneath it
           This creates the apperance of a stack of counters.
           The offset between counters decreases as the number of counters goes up.
        */
        const deltaOffset = 0.05 * Math.pow(0.9, stackLength)
        const maxOffset = ((stackLength - 1) * deltaOffset)

        /* Walk through each unit, adjust it's position, and move it to the front. This will sort the 
           units correctly and cause the last unit in the stack to be displayed on top.
        */
        for (let i = 0; i < stackLength; ++i) {
            let offset = maxOffset - (deltaOffset * (stackLength - 1 - i))
            const x = pixelX + (maxOffset * stackLength * 4) - (us.width * (0.5 + offset))
            const y = pixelY + (maxOffset * stackLength * 4) - (us.height * (0.5 + offset))
            const unitId = hex.unitStack.getUnitIdAtIndex(i)
            const unit = this.model.oob.getUnitById(unitId)
            unit.svgLayers.base.transform({ position: [x, y], origin: 'top left' })
            unit.svgLayers.base.front()
        }
    }


    // /////////////////////////////////////////////////////////////////////////
    // Overlays

    /** Removes all overlay svgs from the view */
    clearAllOverlays() {
        this.svgGroups.overlays.clear()
    }

    /** Draws an overlay svg on top of hexCoord with color ('#rrggbb') and opacity (0.0 to 1.0) */
    drawOverlayHex(hexCoord, color, opacity) {
        const hexPixelOrigin = this.hexCoordToPixel(hexCoord)
        this.svgGroups.overlays.polygon(this.hexPixelCorners())
            .fill({ color: color, opacity: opacity })
            .translate(hexPixelOrigin.x, hexPixelOrigin.y)
    }


    drawOverlayText(hexCoord, text, color, offsetX, offsetY) {
        const hexPixelOrigin = this.hexCoordToPixel(hexCoord)
        const baseHexPixelCenter = this.hexPixelCenter()
        const hexPixelCenter = {
            x: baseHexPixelCenter.x + hexPixelOrigin.x + offsetX,
            y: baseHexPixelCenter.y + hexPixelOrigin.y + offsetY
        }
        this.svgGroups.overlays.text(`${text}`)
            .font({ family: 'Verdana', size: 15, fill: color, weight: 'bold', leading: 1.4, anchor: 'middle' })
            .translate(hexPixelCenter.x, hexPixelCenter.y)
    }

    /** Draws an overlay on the view from data in forceOverlayData
     * forceOverlayData: Returned from model.buildForceOverlayForSide()
     * valueToUse: 'attackAntiPersonnel', 'attackAntiTank', 'defensePersonnel', 'defenseTank', 'defense' 
     * color: '#rrggbb'
     */
     drawForceOverlayForSide(forceOverlayData, valueToUse, color) {
        // Find the average value
        let totalValue = 0
        for (const o of forceOverlayData) { totalValue += o[valueToUse] }
        const avgValue = totalValue / forceOverlayData.length

        // Extract the requested value
        const preValues = []
        const values = []
        const hexes = []
        for (let i = 0; i < forceOverlayData.length; ++i) {
            if (forceOverlayData[i][valueToUse] >= avgValue) {
            preValues.push(forceOverlayData[i][valueToUse])
            values.push(forceOverlayData[i][valueToUse])
            hexes.push(forceOverlayData[i].hexCoord)
            }
        }

        // Normalize the values
        //const maxValue = Math.max.apply(Math, values)
        const maxValue = avgValue * 2.0
        const minValue = Math.min.apply(Math, values)

        if (minValue < 0) { throw `GameView.drawForceOverlay() forceOverlayData contains negative value(s), values must be positive` }
        if ((maxValue - minValue) == 0) {
            for (let i = 0; i < values.length; ++i) {
                values[i].value = 1.0
            }
        } else {
            for (let i = 0; i < values.length; ++i) {
                values[i] = (Math.min(maxValue, values[i]) - minValue) / (maxValue - minValue)
            }
        }

        // Iterate the hexes and draw an overlay on each hex
        for (let i = 0; i < values.length; ++i) {
            this.drawOverlayHex(
                hexes[i],
                color,
                values[i] * 0.75
            )
            this.drawOverlayText(
                hexes[i],
                Math.round(preValues[i]),
                'Black',
                -1 * VIEWCONFIG.hexPixelRadius * 0.8,
                0
            )
        }
    }

    /** forceType is 'total', 'personnel', or 'tank' */
    drawAllSidesForceOverlay(forceOverlayData, colorA, colorB, forceType) {
        if (forceType !== 'total' && forceType !== 'personnel' && forceType !== 'tank') {
            throw `GameView.drawAllSidesForceOverlay() unrecognized forceType: ${forceType}`
        }
        let totalValue = 0;
        let minValue = Number.POSITIVE_INFINITY
        let maxValue = Number.NEGATIVE_INFINITY
        for (let i = 0, fol = forceOverlayData.length; i < fol; ++i) {
            let value = forceOverlayData[i].result[forceType].value
            if (value === undefined) { continue }
            totalValue += value
            minValue = (value < minValue) ? value : minValue
            maxValue = (value > maxValue) ? value : maxValue

        }

        const avgValue = totalValue / forceOverlayData.length
        maxValue = avgValue * 2
        const normalizedValues = []

        if (minValue < 0) { throw `GameView.drawAllSidesForceOverlay() forceOverlayData containes negative value(s), values must be positive`}
        if ((maxValue - minValue) == 0) {
            for (let i = 0, fol = forceOverlayData.length; i < fol; ++i) {   
                normalizedValues = 1.0
            }
        } else {
            for (let i = 0, fol = forceOverlayData.length; i < fol; ++i) {
                normalizedValues.push((Math.min(maxValue, forceOverlayData[i].result[forceType].value) - minValue) / (maxValue - minValue))
            }
        }

        // Iterate the hexes and draw an overlay on each hex
        this.svgGroups.overlays.hide()
        for (let i = 0, fol = forceOverlayData.length; i < fol; ++i) {
            const color = (forceOverlayData[i].result[forceType].sideId === 0) ? colorA : colorB

            this.drawOverlayHex(
                forceOverlayData[i].hexCoord,
                color,
                normalizedValues[i] * 0.75
            )
            this.drawOverlayText(
                forceOverlayData[i].hexCoord,
                Math.round(forceOverlayData[i].result[forceType].value),
                'Black',
                -1 * VIEWCONFIG.hexPixelRadius * 0.8,
                0
            )
        }
        this.svgGroups.overlays.show()

    }


    // /////////////////////////////////////////////////////////////////////////
    // Pathfinding 

    /** Clears the old path, recalculates a new path, and draws it */
    updatePathfindingPath() {
        // Clear the previous path
        this.pathfindingClearPath()

        // Do nothing if pathfinding is not allowed
        if (!this.viewState.isPathfindingAllowed) {
            return
        }

        // In order to pathfind a hex and a unit must be selected, return if not selected
        if (this.viewState.selectedHexCoord === undefined || this.viewState.selectedUnitId === undefined) {
            return
        }

        // Look up the movement points of the selected units
        const unit = this.model.oob.getUnitById(this.viewState.selectedUnitId)
        if (unit === undefined) { throw `GameView.updatePathfindingPath() could not lookup unit ${this.viewState.selectedUnitId}` }

        // Find the path between the hexes and save it in our viewState
        this.viewState.pathfindingMovePath = this.model.pathfindBetweenHexes(
            this.viewState.selectedHexCoord, this.viewState.mouseHoverHexCoord
        )

        this.drawExistingPathfindingHover(this.viewState.pathfindingMovePath, unit.values?.movement)
    }

    /** Clears the pathfinding arrows drawn over the map and resets the path to undefined */
    pathfindingClearPath() {
        this.viewState.pathfindingMovePath = undefined
        this.svgGroups.pathfindingHover.clear()
    }

    /** Draws the existing pathfinding path onto the map as a series of circles with movement point costs */
    drawExistingPathfindingHover(movePath, maxMoveCost) {
        const vc = VIEWCONFIG
        var totalCostSoFar = 0

        this.viewState.pathfindingMovePath = movePath

        for (let i = 1; i < movePath.length; ++i) {
            const hex = this.model.getHex(movePath[i])
            if (hex === undefined) { throw `GameView.drawPathfindingHover() Could not get hex ${movePath[i].x},${movePath[i].y}` }
            totalCostSoFar += hex.moveCost

            // Get the center position of the hex
            const circleRadius = vc.hexPixelRadius * 0.6
            const pixelPosition = this.hexCoordToPixel(hex.hexCoord)
            const pixelCenter = this.hexPixelCenter()
            const movePoint = {
                x: pixelPosition.x + pixelCenter.x - (circleRadius / 2),
                y: pixelPosition.y + pixelCenter.y - (circleRadius / 2)
            }

            // Draw the circle, red if maxMoveCost is exceeded
            const fillColor = (maxMoveCost === undefined || totalCostSoFar <= maxMoveCost) ? 'Green' : 'Red'
            this.svgGroups.pathfindingHover.circle(circleRadius)
                .stroke({ color: 'White', opacity: 1.0, width: 5 })
                .fill(fillColor)
                .translate(movePoint.x, movePoint.y)
            // Draw the text
            this.svgGroups.pathfindingHover.text(`${totalCostSoFar}`)
                .font({ family: 'Verdana', size: 15, fill: 'Black', weight: 'bold', leading: 1.4, anchor: 'middle' })
                .center(pixelPosition.x + pixelCenter.x, pixelPosition.y + pixelCenter.y)
        }
    }

    // /////////////////////////////////////////////////////////////////////////
    // D3 Handlers

    addD3Handlers() {
        const gr = this.svgGroups
        const vc = VIEWCONFIG
        const sc = this.scenario


        this.d3Handlers.zoomed = function () {
            gr.transform.attr("transform", d3.event.transform);
        }

        this.d3Handlers.zoom = d3.zoom()
            .extent([[0, 0], [vc.viewBox.width, vc.viewBox.height]])
            .scaleExtent([1 / 2, 2])
            .on("zoom", this.d3Handlers.zoomed)

        this.d3Handlers.leftClickHandler = () => {
            let [px, py] = d3.mouse(gr.transform.node)
            this.controller.viewLeftClicked(this.makeCoordCart(px, py))
        }

        this.d3Handlers.rightClickHandler = () => {
            d3.event.preventDefault()
            let [px, py] = d3.mouse(gr.transform.node)
            this.controller.viewRightClicked(this.makeCoordCart(px, py))
        }

        this.d3Handlers.mouseMoveHandler = () => {
            let [px, py] = d3.mouse(gr.transform.node)
            this.controller.viewMouseMoved(this.makeCoordCart(px, py))
        }

        d3.select(`#${vc.svgId}`)
            .call(this.d3Handlers.zoom)
            .on('click', this.d3Handlers.leftClickHandler)
            .on('dblclick.zoom', null)      // Disable double click zooming
            .on('contextmenu', this.d3Handlers.rightClickHandler)
            .on('mousemove', this.d3Handlers.mouseMoveHandler)
    }


    // /////////////////////////////////////////////////////////////////////////
    // Selecting Actions


    selectUnitInOOBTree(unitId) {
        const treeView = $('#oob_tree').data('treeview')
        if (unitId === undefined) {
            const nodesSelected = treeView.getSelected()
            for (const nodeSelected of nodesSelected) {
                treeView.unselectNode(nodeSelected)
            }
            return
        }
        const nodesExpanded = treeView.getExpanded()
        const nodesCollapsed = treeView.getCollapsed()
        const nodesAll = nodesExpanded.concat(nodesCollapsed)
        for (let i = 0; i < nodesAll.length; ++i) {
            if (nodesAll[i].unitId === unitId) {
                const nodeId = nodesAll[i].nodeId
                treeView.selectNode(nodeId, { silent: true })
                treeView.revealNode(nodeId, { silent: true })
                const nodeHandle = $(`.node-oob_tree[data-nodeid=${nodeId}]`)
                if (nodeHandle === undefined || nodeHandle.length !== 1) {
                    console.log(`GameView.selectUnitInOOBTree() could not find node for unitId ${unitId}`)
                    return
                }
                nodeHandle[0].scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                  })
                break 
            }
        }


    }

    /** Sets the selected hex, marking it with a thicker outline  */
    setSelectedHex(hexCoord) {
        const vs = this.viewState

        this.pathfindingClearPath()

        // If a hex was previously selected, unselect it
        if (vs.selectedHexCoord !== undefined) {
            const lastHex = this.model.getHex(vs.selectedHexCoord)
            if (lastHex === undefined) { throw `GameView.setSelectedHex() could not find last selected hex ${selectedHexCoord.x},${selectedHexCoord.y}` }
            lastHex.svgHex.attr('stroke-width', 1).back()
        }

        // If hexCoord is undefined, return now after clearing last hex and last unit
        if (hexCoord === undefined) {
            vs.selectedHexCoord = undefined
            this.updateInfoBoxHex(undefined)
            vs.selectedUnitId = undefined
            this.updateInfoBoxUnit(undefined)
            return
        }

        // If there is a new hex to select, update viewState and increase the thickness of the outline of the new selected hex
        vs.selectedHexCoord = hexCoord
        const newHex = this.model.getHex(hexCoord)
        if (newHex === undefined) { throw `GameView.setSelectedHex() could not find new selected hex ${hexCoord.x},${hexCoord.y}` }
        newHex.svgHex.attr('stroke-width', VIEWCONFIG.selectedHexStrokeWidth).back()
        this.updateInfoBoxHex(hexCoord)

        // The selected unit is now whatever unit is on top of the unitStack, or undefined if none
        const unitId = newHex.unitStack.getTopUnitId()
        vs.selectedUnitId = unitId
        this.updateInfoBoxUnit(unitId)
    }

    /** Bring all Headquarters units to the top of their stack, if there are multiple HQ in a hex, assume the one moved to the top is random */
    bringAllHQToTop() {
        this.svgGroups.units.hide()
        for (const unitId of this.model.oob.getAllUnitIds()) {
            const unit = this.model.oob.getUnitById(unitId)
            if (unit === undefined) { throw `GameView.bringAllHQToTop() could not find unit ${unitId}` }
            if (unit.natoIcon === "Headquarters") {
                const hex = this.model.getHex(unit.hexCoord)
                if (hex === undefined) { throw `GameView.bringAllHQToTop() could not find hex ${unit.hexCoord.x},${unit.hexCoord.y} for unit ${unitId}` }
                hex.unitStack.moveUnitIdToTop(unitId)
                this.stackUnitCountersInHex(hex.hexCoord, false)
            }
        }
        this.svgGroups.units.show()
    }

    // /////////////////////////////////////////////////////////////////////////
    // Hex info box and Unit info box update

    /** Updates the Unit Info Box on the HTML side pane with information about a unit */
    updateInfoBoxUnit(unitId) {
        const blank = '---'
        // clear old SVG counter if it exists
        $("#sel_counter").empty()

        // If passed undefined, set all boxes to blank
        if (unitId === undefined) {
            $("#sel_force_name").text(blank)
            $("#sel_formation_name").text(blank)
            $("#sel_unit_name").text(blank)
            $("#sel_misc_text").text(blank)
            $("#sel_symbol_name").text(blank)
            $("#sel_counter").text(blank)
            return
        }

        // Lookup the unit
        const unit = this.model.oob.getUnitById(unitId)
        if (unit === undefined) { throw `GameView.updateInfoBoxUnit coudl not find unitId ${unitId}` }

        // Make a new SVG and clone the unit to display
        const newSvg = SVG().addTo("#sel_counter")
        const newGroup = newSvg.group()
        unit.svgLayers.base.clone().addTo(newGroup)
        newGroup.move(0, 0)
        newSvg.css({ 'margin-top': '15px', 'margin-bottom': '15px' })

        // Resize new_svg to exactly fit it's content
        const bbox = newSvg.bbox();
        newSvg.attr("width", bbox.x + bbox.width + bbox.x);
        newSvg.attr("height", bbox.y + bbox.height + bbox.y);

        // Get needed strings
        const forceName = this.model.oob.getForceById(unit.forceId).name;
        const formationName = this.model.oob.getFormationById(unit.formationId).name;
        const unitName = this.model.oob.getUnitById(unit.unitId).name;
        const symbolType = this.model.oob.getUnitById(unit.unitId).natoIcon;
        const attackAntiPersonel = unit.values.attackAntiPersonnel || 0
        const attackAntiTank = unit.values.attackAntiTank || 0
        const defense = unit.values.defense || 0
        const numberString = `${attackAntiPersonel} - ${attackAntiTank} - ${defense}`

        // Put strings in divs
        $("#sel_force_name").text(forceName)
        $("#sel_formation_name").text(formationName)
        $("#sel_unit_name").text(unitName)
        $("#sel_misc_text").text(numberString)
        $("#sel_symbol_name").text(symbolType)
    }

    /** Updates the Hex Info Box on the HTML side pane with information about a hex */
    updateInfoBoxHex(hexCoord) {
        const blank = '---'

        // First update the counter and symbol name
        $("#sel_tile").empty()   // clear old SVG counter if it exists

        // If passed an undefined hex, just clear the box and return
        if (hexCoord === undefined) {
            $("#sel_tile_name").text(blank)
            return
        }

        // Make a new SVG and clone the hex to display
        const hex = this.model.getHex(hexCoord)
        if (hex === undefined) { throw `GameView.updateInfoHexBox() could not find hex ${hexCoord.x},${hexCoord.y}` }
        let newSvg = SVG().addTo("#sel_tile")
        let newGroup = newSvg.group()
        hex.svgHex.clone().attr('stroke-width', 1).addTo(newGroup)
        newGroup.move(0, 0)
        newSvg.css({ 'margin-top': '15px', 'margin-bottom': '15px' })

        // Resize new_svg to exactly fit it's content
        let div_width = $('#sel_tile').width()
        let div_height = $('#sel_tile').height()
        let bbox = newSvg.bbox();
        newSvg.viewbox(bbox.x, bbox.y, bbox.width + 3, bbox.height + 3)
        newSvg.css({ 'width': '66%', 'height': '60%' })

        // Get needed strings
        let tileName = TerrainData[hex.terrainId].name

        // Put strings in divs
        $("#sel_tile_name").text(tileName)
    }


    // /////////////////////////////////////////////////////////////////////////
    // Moving the map and focusing on hexes or units

    centerViewOnHex(hexCoord, animation) {
        // Ignore off map hexes
        if (!this.isCoordOnMap(hexCoord)) { return }

        // Get the center position for the target hex
        const pixelPosition = this.hexCoordToPixel(hexCoord)
        const pixelCenter = this.hexPixelCenter()

        // Get jQuery handle to map and calculate the coordinate to put target hex in center
        const jSVG = $(`#${VIEWCONFIG.svgId}`)
        const targetX = jSVG.width() / 2 - pixelPosition.x - (pixelCenter.x / 2)
        const targetY = jSVG.height() / 2 - pixelPosition.y - (pixelCenter.y / 2)

        // Get D3 handle to map and trigger the transition to targetPixel
        const dSVG = d3.select(`#${VIEWCONFIG.svgId}`)

        if (!animation) {
            dSVG.call(this.d3Handlers.zoom.transform,
                d3.zoomIdentity.translate(targetX, targetY))
        } else {
            dSVG.transition()
                .duration(1000)
                .call(this.d3Handlers.zoom.transform,
                    d3.zoomIdentity.translate(targetX, targetY))
        }
    }



    // /////////////////////////////////////////////////////////////////////////
    // Hex to Pixel to Hex

    /** Returns the center pixel of a hex */
    hexPixelCenter() {
        return this.makeCoordCart(VIEWCONFIG.hexPixelWidth / 2, VIEWCONFIG.hexPixelHeight / 2)
    }


    /** Returns an array listing the pixel coordinates of all 6 corners on a hex */
    hexPixelCorners() {
        const width = VIEWCONFIG.hexPixelWidth
        const height = VIEWCONFIG.hexPixelHeight
        return [
            [width, height * 0.5],
            [width * 0.75, height],
            [width * 0.25, height],
            [0, height * 0.5],
            [width * 0.25, 0],
            [width * 0.75, 0]
        ]
    }


    /** Converts a cartesian pixel to a cartesian hex coordinate, undefined if off map */
    pixelToHexCoord(pixel) {
        // TODO silently fail like hexCoordToPixel? or throw?
        if (!this.isCoordCart(pixel)) { throw "GameView.pixelToHexCord() passed non cartesian coordinate" }
        const hexPixelRadius = VIEWCONFIG.hexPixelRadius
        const hexPixelCenter = this.hexPixelCenter()
        const sX = pixel.x - hexPixelCenter.x
        const sY = pixel.y - hexPixelCenter.y

        let q = (2 / 3) * (sX / hexPixelRadius)
        let r = (Math.sqrt(3) * sY) / (3 * hexPixelRadius) - sX / (3 * hexPixelRadius)

        const hexCoord = this.convertToCart(this.roundCube(this.makeCoordCube(q, r, -q - r)))

        if (!this.isCoordOnMap(hexCoord)) {
            return undefined
        } else {
            return hexCoord
        }
    }

    /** Converts a cartesian hex cordinate to a cartesian pixel coordinate, undefined if off map */
    hexCoordToPixel(hexCoord) {
        if (!this.isCoordOnMap(hexCoord)) { return undefined }
        const cube = this.convertToCube(hexCoord)
        const hexPixelRadius = VIEWCONFIG.hexPixelRadius

        let px = ((hexPixelRadius * 3) / 2) * cube.q
        let py = hexPixelRadius * Math.sqrt(3) * (cube.r + cube.q / 2)

        return this.makeCoordCart(px, py)
    }


    // /////////////////////////////////////////////////////////////////////////
    // Animations

    animationMoveUnitOnPath(unitId, targetHexCoord, movePath) {
        if (movePath.length < 2) { throw `GameView.animationMoveUnitOnPath() movePath must have at least 2 steps` }
        const uc = VIEWCONFIG.unitCounters
        this.viewState.isAnimationRunning = true

        // Deselect the current hex
        this.setSelectedHex(undefined)

        // Get the unit and a reference to it's base SVG group
        const unit = this.model.oob.getUnitById(unitId)
        if (unit === undefined) { throw `GameView.animationMoveUnitOnPath() could not find unit ${unitId}` }
        const unitSvg = unit.svgLayers.base
        const sourceHexCoord = unit.hexCoord

        // If an animation timeline exists for the unit, finish it
        // If the timeline does not exist, this will create it
        unitSvg.timeline().finish()

        // Walk the move path and process each move, start from step 1 to skip start
        for (let i = 1; i < movePath.length; ++i) {
            // Get pixel coordinates for the hex
            const hexCoord = movePath[i]
            const hexPixelOrigin = this.hexCoordToPixel(hexCoord)
            const hexPixelCenter = this.hexPixelCenter()
            const targetPixel = {
                x: hexPixelOrigin.x + hexPixelCenter.x - (uc.size.width * 0.5),
                y: hexPixelOrigin.y + hexPixelCenter.y - (uc.size.height * 0.5)
            }
            // Add an animation step to the timeline that will walk the unit one step along the path
            unitSvg.animate({ duration: 100, swing: true, wait: 5, delay: 0 })
                .transform({ position: [targetPixel.x, targetPixel.y], origin: 'top left' })
        }

        /* TODO: 
            There is an issue here where if the duration or delay is too small, when 
            stackCountersInHex() is called the SVG tries to update with the correct coordinates,
            but they are not applied to the units and the units remain unstacked.
            This may be a timing issue with the animation timeline, perhaps the dom or transform
            attribute is locked during the animation.
            When duration and delay are set to 10-50 it seems to work.
            Look into this further, probably something about the SVG timeline that I'm not understanding.
        */
        // Add a small delay as the last step, then finalize the move        
        unitSvg.animate({ duration: 15, delay: 15, wait: 0, }).after(() => {

            // Adjust viewState variables
            this.viewState.selectedUnitId = unitId
            this.viewState.isAnimationRunning = false
            // Set the selected hex to the end hex
            this.setSelectedHex(targetHexCoord)
            // Restack the start and end hex to put counters in correct positions
            this.stackUnitCountersInHex(sourceHexCoord)
            this.stackUnitCountersInHex(targetHexCoord)
        })
    }

}


export { GameView, VIEWCONFIG };
