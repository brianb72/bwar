
const NatoUnitTypes = {
    None: 0,
    Infantry: 1,
    Tank: 2,
    Air: 3,
    Naval: 4
}
Object.freeze(NatoUnitTypes)

class NatoUnitIcons {
    /** Contains a recipe and type for every unit.
     *  NOTE: Mechanized and Mechanized Infantry are both used in scenarios are refer to the same type of unit.
     *        Should Mechanized Infantry be considered Infantry or Tank? Right now assume Tank.
     */
    static iconTypes = {
        'None': { recipe: [], unitType: NatoUnitTypes.Infantry },
        'Anti Aircraft': { recipe: ['Anti Aircraft'], unitType: NatoUnitTypes.Infantry },
        'Antitank': { recipe: ['Antitank'], unitType: NatoUnitTypes.Infantry },
        'Artillery': { recipe: ['Artillery'], unitType: NatoUnitTypes.Infantry },
        'Armored Artillery': { recipe: ['Artillery', 'Tank'], unitType: NatoUnitTypes.Tank },
        'Armored Antitank': { recipe: ['Antitank', 'Tank', 'Artillery'], unitType: NatoUnitTypes.Tank },
        'Armored Cavalry': { recipe: ['Tank', 'Calvary'], unitType: NatoUnitTypes.Tank },
        'Headquarters': { recipe: ['Headquarters'], unitType: NatoUnitTypes.Tank },
        'Coastal Artillery': { recipe: ['Coastal Artillery'], unitType: NatoUnitTypes.Infantry },
        'Engineer': { recipe: ['Engineer'], unitType: NatoUnitTypes.Infantry },
        'Fighter': { recipe: ['Fighter'], unitType: NatoUnitTypes.Air },
        'Fighter Bomber': { recipe: ['Fighter Bomber'], unitType: NatoUnitTypes.Air },
        'Infantry': { recipe: ['Infantry'], unitType: NatoUnitTypes.Infantry },
        'Hvy Artillery': { recipe: ['Hvy Artillery'], unitType: NatoUnitTypes.Infantry },
        'Kampfgruppe': { recipe: ['Kampfgruppe'], unitType: NatoUnitTypes.Infantry },
        'Light Bomber': { recipe: ['Light Bomber'], unitType: NatoUnitTypes.Air },
        'Machine Gun': { recipe: ['Infantry', 'Machine Gun'], unitType: NatoUnitTypes.Infantry },
        'Mechanized Infantry': { recipe: ['Infantry', 'Tank'], unitType: NatoUnitTypes.Tank },
        'Mechanized': { recipe: ['Infantry', 'Tank'], unitType: NatoUnitTypes.Tank },  
        'Mountain Infantry': { recipe: ['Infantry', 'Mountain'], unitType: NatoUnitTypes.Infantry },
        'Motor Artillery': { recipe: ['Artillery', 'Motorized'], unitType: NatoUnitTypes.Infantry },
        'Motor Antitank': { recipe: ['Antitank', 'Motorized'], unitType: NatoUnitTypes.Infantry },
        'Motor Anti Air': { recipe: ['Anti Aircraft', 'Motorized'], unitType: NatoUnitTypes.Infantry },
        'Motor Cavalry': { recipe: ['Motorized', 'Calvary'], unitType: NatoUnitTypes.Infantry },
        'Motor Hvy Wpns': { recipe: ['Infantry', 'Motorized', 'Hvy Wpns'], unitType: NatoUnitTypes.Infantry },
        'Motor Infantry': { recipe: ['Infantry', 'Motorized'], unitType: NatoUnitTypes.Infantry },
        'Tank': { recipe: ['Tank'], unitType: NatoUnitTypes.Tank },

        /* Substitude Icons - These icons need to have their own custom recipe added, for now reuse an existing recipe */
        'Hvy Mortar': { recipe: ['Hvy Artillery'], unitType: NatoUnitTypes.Infantry },
        'Hvy Antitank': { recipe: ['Antitank', 'HVy Wpns'], unitType: NatoUnitTypes.Infantry },
        'Motor Engineer': { recipe: ['Engineer', 'Motorized'], unitType: NatoUnitTypes.Infantry },
        
        
    }


    static getUnitTypeForNatoIcon(natoIcon) {
        if (!NatoUnitIcons.iconTypes.hasOwnProperty(natoIcon)) {
            console.log(`NatoUnitIcons.getUnitTypeForNatoIcon() passed unknown natoIcon ${natoIcon}`)
            return 
        }
        return NatoUnitIcons.iconTypes[natoIcon].unitType
    }

    /** Draws a NATO Icon into the svgGroupHandle */
    static drawIcon(svgGroupHandle, natoIcon, drawColor, svgWidth, svgHeight, cornerRounding) {

        // Lookup the recipe, or silently ignore if not found without drawing anything
        if (!NatoUnitIcons.iconTypes.hasOwnProperty(natoIcon)) {
            console.log(`NatoUnitIcons.drawIcon() passed unknown natoIcon ${natoIcon}`)
            return 
        }
        const recipe = NatoUnitIcons.iconTypes[natoIcon].recipe

        // Convinence variables
        const w = svgWidth
        const h = svgHeight
        const ra = cornerRounding * 0.25
        let dotr, mora, s_per_x, s_per_y, w_off, h_off, bw, rw, rh

        // Draw each recipe item onto the SVG group
        for (let i = 0; i < recipe.length; ++i) {
            switch (recipe[i]) {
                case 'Calvary':
                    svgGroupHandle.line(0 + ra, h - ra, w - ra, 0 + ra)
                        .stroke({ color: drawColor, opacity: 1.0, width: 1 })
                    break
                case 'Infantry':
                    svgGroupHandle.line(0 + ra, 0 + ra, w - ra, h - ra)
                        .stroke({ color: drawColor, opacity: 1.0, width: 1 })
                    svgGroupHandle.line(0 + ra, h - ra, w - ra, 0 + ra)
                        .stroke({ color: drawColor, opacity: 1.0, width: 1 })
                    break
                case 'Antitank':
                    svgGroupHandle.line(0 + ra, h - ra, w / 2, 0)
                        .stroke({ color: drawColor, opacity: 1.0, width: 1 })
                    svgGroupHandle.line(w / 2, 0, w - ra, h - ra)
                        .stroke({ color: drawColor, opacity: 1.0, width: 1 })
                    break
                case 'Motorized':
                    dotr = w * 0.18;
                    mora = ra * 0.75   // Slightly less adjustment for the dots so they hit the edges
                    svgGroupHandle.circle(dotr)
                        .stroke({ color: drawColor, opacity: 1.0, width: 1 })
                        .move(0 + mora, (h - dotr) - mora)
                        .fill(drawColor)
                    svgGroupHandle.circle(dotr)
                        .stroke({ color: drawColor, opacity: 1.0, width: 1 })
                        .move((w - dotr) - mora, (h - dotr) - mora)
                        .fill(drawColor)
                    break
                case 'Tank':
                    s_per_x = 0.1;
                    s_per_y = 0.2
                    svgGroupHandle.ellipse(
                        w * (1 - (s_per_x * 2)),
                        h * (1 - (s_per_y * 2))
                    )
                        .stroke({ color: drawColor, opacity: 1.0, width: 1 })
                        .move(w * s_per_x, h * s_per_y)
                        .fill('none')
                    break

                case 'Kampfgruppe':
                    svgGroupHandle.text('KG')
                        .font({ family: 'Helvetica', size: 15, fill: drawColor, weight: 'normal' })
                        .center(w / 2, h / 2 + h * 0.1);
                    break

                case 'Headquarters':
                    svgGroupHandle.text('HQ')
                        .font({ family: 'Helvetica', size: 15, fill: drawColor, weight: 'normal' })
                        .center(w / 2, h / 2 + h * 0.1);
                    break
                case 'Artillery':
                    dotr = w * 0.15
                    svgGroupHandle.circle(dotr)
                        .stroke({ color: drawColor, opacity: 1.0, width: 1 })
                        .move(w / 2 - dotr / 2, h / 2 - dotr / 2)
                        .fill(drawColor)
                    break
                case 'Anti Aircraft':
                    mora = ra * 1.1;
                    svgGroupHandle.path(`M${0 + mora} ${h - mora} C${0 + mora} ${(h * 0.4) - mora} ${w - mora} ${(h * 0.4) - mora} ${w - mora} ${h - mora}`)
                        .stroke({ color: drawColor, opacity: 1.0, width: 1 })
                        .fill('none')
                    break
                case 'Machine Gun':
                    dotr = w * 0.10
                    svgGroupHandle.circle(dotr)
                        .stroke({ color: drawColor, opacity: 1.0, width: 1 })
                        .move(w / 2 - dotr / 2, h * 0.25 - dotr / 2)
                        .fill(drawColor)
                    svgGroupHandle.line(w / 2, h * 0.25, w / 2, h * 0.75)
                        .stroke({ color: drawColor, opacity: 1.0, width: 1 })
                    break
                case 'Hvy Wpns':
                    svgGroupHandle.rect(w * 0.13, h)
                        .fill(drawColor)
                    break;
                case 'Coastal Artillery':
                    svgGroupHandle.path(`M${w * 0.2} ${h * 0.7} C${w * 0.2} ${h * 0.30} ${w * 0.8} ${h * 0.30} ${w * 0.8} ${h * 0.7} Z`)
                        .stroke({ color: drawColor, opacity: 1.0, width: 1 })
                        .fill(drawColor)
                    svgGroupHandle.line(w * 0.6, h * 0.5, w * 0.8, h * 0.25)
                        .stroke({ color: drawColor, opacity: 1.0, width: 1 * 2.5 })
                    break
                case 'Engineer':
                    w_off = w * 0.2
                    h_off = h * 0.25
                    svgGroupHandle.path(`M${w_off} ${h - h_off} V${h_off} H${w - w_off} V${h - h_off} M${w / 2} ${h_off} V${h - h_off}`)
                        .stroke({ color: drawColor, opacity: 1.0, width: 1 * 2.0 })
                        .fill('none')
                    break
                case 'Fighter':
                    bw = 0.01   // vertical body line width
                    svgGroupHandle.path(`M${w * 0.25} ${h * 0.33} H${w - w * 0.25} L${w / 2} ${h / 2} Z ` +   // Wings
                        `M${w / 2 - w * bw} ${h * 0.2} H${w / 2 + w * bw} V${h * 0.8} H${w / 2 - w * bw} Z ` + // Body
                        `M${w / 2 - w * bw * 7} ${h * 0.8} H${w / 2 + w * bw * 7} L${w / 2} ${h * 0.7} Z` + // Tail
                        `M${w * 0.4} ${h * 0.33} V${h * 0.26} M${w * 0.6} ${h * 0.33} V${h * 0.26}` // engines
                    )
                        .stroke({ color: drawColor, opacity: 1.0, width: 1 })
                        .fill(drawColor)
                    break
                case 'Fighter Bomber':
                    bw = 0.01   // vertical body line width
                    svgGroupHandle.path(`M${w * 0.25} ${h * 0.33} H${w - w * 0.25} L${w / 2} ${h / 2} Z ` +   // Wings
                        `M${w / 2 - w * bw} ${h * 0.2} H${w / 2 + w * bw} V${h * 0.8} H${w / 2 - w * bw} Z ` + // Body
                        `M${w / 2 - w * bw * 7} ${h * 0.77} H${w / 2 + w * bw * 7} L${w / 2} ${h * 0.67} Z` + // Tail
                        `M${w * 0.4} ${h * 0.33} V${h * 0.20} H${w * 0.4 - w * bw * 2} V${h * 0.33} Z ` +
                        `M${w * 0.6} ${h * 0.33} V${h * 0.20} H${w * 0.6 + w * bw * 2} V${h * 0.33} Z ` // engines
                    )
                        .stroke({ color: drawColor, opacity: 1.0, width: 1 })
                        .fill(drawColor)
                    break
                case 'Light Bomber':
                    bw = 0.01   // vertical body line width
                    svgGroupHandle.path(`M${w * 0.15} ${h * 0.20} H${w - w * 0.15} L${w / 2} ${h * 0.5} Z ` +   // Wings
                        `M${w / 2 - w * bw} ${h * 0.1} H${w / 2 + w * bw} V${h * 0.9} H${w / 2 - w * bw} Z ` + // Body
                        `M${w / 2 - w * bw * 9} ${h * 0.78} H${w / 2 + w * bw * 9} L${w / 2} ${h * 0.87} Z` + // Tail
                        `M${w * 0.4} ${h * 0.21} V${h * 0.1} H${w * 0.4 - w * bw * 2} V${h * 0.21} Z ` +
                        `M${w * 0.6} ${h * 0.21} V${h * 0.1} H${w * 0.6 + w * bw * 2} V${h * 0.21} Z ` // engines
                    )
                        .stroke({ color: drawColor, opacity: 1.0, width: 1 })
                        .fill(drawColor)
                    break
                case 'Mountain':
                    svgGroupHandle.path(`M${w * 0.35} ${h} L${w / 2} ${h * 0.7} L${w * 0.65} ${h} Z`)
                        .stroke({ color: drawColor, opacity: 1.0, width: 1 })
                        .fill(drawColor)
                    break
                case 'Hvy Artillery':
                    rw = w * 0.57
                    rh = h * 0.40
                    svgGroupHandle.rect(rw, rh).move(w / 2 - rw / 2, h / 2 - rh / 2)
                        .fill(drawColor)
                    break
                default:
                    console.log(`NatoUnitIcons.drawIcon() unknown recipe item ${recipe[i]} for icon ${natoIcon}`)
                    break
            }
        }

    }

}

export { NatoUnitIcons, NatoUnitTypes };
