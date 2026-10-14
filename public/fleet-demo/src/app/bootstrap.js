import {mountFleetDemo} from './index.js';
const controller=mountFleetDemo({root:document.querySelector('.app-shell')});
controller.ready.catch(error=>console.error('Fleet demo bootstrap failed',error));
