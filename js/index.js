import { GameController } from './GameController'
import ScenarioCrusader41 from '../scenarios/ScenarioCrusader41.js'


const wait = (delay = 0) =>
  new Promise(resolve => setTimeout(resolve, delay));

const setVisible = (elementOrSelector, visible) => 
  (typeof elementOrSelector === 'string'
    ? document.querySelector(elementOrSelector)
    : elementOrSelector
  ).style.display = visible ? 'block' : 'none';


// //////////////////////////
// Entry Point
(function(){
    console.log('BWAR starting...')

    setVisible('#page', false);
    setVisible('#loading', true);
    
    document.addEventListener('DOMContentLoaded', () =>
      wait(1000).then(() => {
        setVisible('#page', true);
        setVisible('#loading', false);
      }));
    
    let cont = new GameController(ScenarioCrusader41)
  }());