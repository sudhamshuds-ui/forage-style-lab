import type { DishIdea } from '../catalog';
import { composePlan, readPart, type ComposedPlan } from './layout';
import { composeLayoutPlan } from './layoutPlan';
import { layoutById } from './layouts';
import { tracedPlan, type Trace } from './trace';

/**
 * The references, traced (docs/dishes/refs/{id}.jpg; how to read one: trace.ts). Each traced dish
 * is built from its trace; the others still from the composer's own plan until they are traced.
 */
export const TRACES: Record<string, Trace> = {
  'salmon-citrus-crudo': {
    edge: [5, 340, 60, 282],
    base: ['pool:citrus-oil', 175, 175, 9],
    layers: [
      [
        ['salmon:slice', 'b', 120, 140, 7, 20], ['salmon:slice', 'b', 175, 130, 7, 0], ['salmon:slice', 'b', 228, 140, 7, -20],
        ['salmon:slice', 'b', 105, 190, 7, 60], ['salmon:slice', 'b', 160, 180, 7, 10], ['salmon:slice', 'b', 215, 185, 7, -30],
        ['salmon:slice', 'b', 258, 200, 7, 40], ['salmon:slice', 'b', 190, 225, 7, 80],
      ],
      [['orange:wheel', 'm', 130, 108, 5.4, 0], ['orange:wheel', 'm', 275, 172, 5.4, 0], ['orange:wheel', 'm', 172, 226, 5.4, 0]],
      [['lime:wheel', 's', 232, 112, 3.8, 0], ['lime:wheel', 's', 95, 204, 3.8, 0]],
    ],
    herbs: [12, 175, 165, 6],
  },
  'steak-frites-garlic': {
    edge: [15, 345, 68, 293],
    base: ['pool:brown-butter', 180, 195, 9],
    layers: [
      [['steak:steak', 'b', 150, 185, 14, 5]],
      // A big bunch of thick-cut fries beside the steak, piled in two layers for volume (the user,
      // 2026-11-25: "add a lot of them in a bunch to create volume").
      [['potato:fries', 'm', 240, 130, 7, 70, 14, 3.6], ['potato:fries', 'm', 282, 170, 7, 110, 10, 3]],
      [['potato:fries', 'm', 258, 150, 7, 95, 9, 2.6]],
      [['garlic:chip', 's', 195, 200, 1.6, 0, 8, 4]],
    ],
    herbs: [10, 170, 200, 7],
  },
  'charred-cabbage-lemon': {
    edge: [15, 330, 70, 293],
    base: ['pool:brown-butter', 170, 205, 9],
    layers: [[['cabbage:wedge', 'b', 168, 180, 15, 30]], [['butter:cube', 's', 230, 165, 2.2, 20]]],
    herbs: [6, 170, 190, 6],
  },
  'rosti-salmon-onion': {
    edge: [15, 340, 65, 300],
    layers: [
      [['potato:mash', 'b', 175, 192, 17, 0]],
      [['salmon:slice', 'm', 165, 152, 6, 30], ['salmon:slice', 'm', 197, 142, 6, -40], ['salmon:slice', 'm', 150, 182, 6, 80], ['salmon:slice', 'm', 192, 178, 6, -10], ['salmon:slice', 'm', 178, 122, 5.5, 60]],
      [['onion:wheel', 's', 132, 142, 5, 0], ['onion:wheel', 's', 165, 112, 5, 0], ['onion:wheel', 's', 205, 117, 5, 0], ['onion:wheel', 's', 215, 165, 5.5, 0], ['onion:wheel', 's', 152, 165, 4.5, 0]],
    ],
    herbs: [6, 175, 140, 4],
  },
  'pear-cheese-garlic': {
    edge: [10, 330, 65, 295],
    base: ['pool:honey', 170, 200, 7],
    layers: [
      [['pear:half', 'b', 140, 175, 9, 95], ['pear:half', 'b', 215, 205, 9, 80], ['garlic:chip', 's', 212, 112, 1.6, 0, 5, 2.2], ['garlic:chip', 's', 85, 182, 1.6, 0, 5, 1.5], ['garlic:chip', 's', 120, 222, 1.6, 40, 5, 1.5]],
      [['cheese:crumble', 'm', 140, 165, 2.5, 0, 4, 1.5], ['cheese:crumble', 'm', 215, 192, 2.5, 0, 4, 1.5]],
    ],
    herbs: [10, 170, 190, 8],
  },
  'hot-chicken-lime-avocado': {
    edge: [20, 345, 75, 290],
    base: ['pool:chili', 225, 180, 6],
    layers: [
      [['avocado:slice', 'm', 120, 188, 8, 60], ['avocado:slice', 'm', 150, 208, 8, 80], ['avocado:slice', 'm', 190, 222, 8, 100], ['avocado:slice', 'm', 162, 160, 8, 40], ['avocado:slice', 'm', 205, 198, 8, 70]],
      [['chicken:drumstick', 'b', 205, 150, 13, 60], ['chicken:drumstick', 'b', 248, 178, 13, 85]],
      [['lime:wedge', 's', 112, 210, 5, 0], ['lime:wedge', 's', 272, 112, 5, 30]],
    ],
    herbs: [14, 190, 170, 9],
  },
  'baked-eggs-tomato-pepper': {
    edge: [10, 335, 60, 330],
    base: ['pool:tomato-sauce', 170, 195, 8.5],
    layers: [
      [['pepper:slice', 'm', 170, 200, 4, 0, 8, 5], ['tomato:wedge', 's', 170, 200, 2.5, 0, 6, 5]],
      [['eggs:egg', 'b', 125, 172, 7, 0], ['eggs:egg', 'b', 210, 178, 7, 0], ['eggs:egg', 'b', 172, 145, 5.5, 0]],
    ],
    herbs: [14, 170, 185, 7],
  },
  'apple-cheddar-toastie': {
    edge: [20, 345, 120, 340],
    layers: [
      [['baguette:toast', 'b', 210, 200, 16, 0]],
      [['apple:slice', 'm', 210, 190, 6, 0, 6, 4], ['cheese:slice', 'm', 210, 190, 5, 0, 3, 3]],
      [['baguette:toast', 'b', 205, 185, 16, 5]],
    ],
  },
  'spinach-mushroom-omelette': {
    edge: [5, 335, 65, 290],
    layers: [
      [['eggs:omelette', 'b', 165, 185, 20, 15]],
      [['mushroom:slice', 'm', 185, 205, 3, 0, 6, 5], ['spinach:leaf', 's', 185, 205, 4, 0, 5, 5]],
    ],
    herbs: [10, 170, 170, 8],
  },
  'watermelon-lime-chili': {
    edge: [20, 345, 75, 290],
    base: ['pool:chili', 185, 205, 8],
    layers: [
      [['watermelon:cube', 'b', 185, 185, 3.5, 0, 8, 6]],
      [['watermelon:cube', 'b', 185, 170, 3.5, 0, 5, 3.5]],
      [['lime:wedge', 'm', 165, 140, 4.5, 20], ['lime:wedge', 'm', 152, 210, 5, -30], ['lime:wedge', 'm', 265, 152, 4.5, 60]],
    ],
    herbs: [12, 185, 185, 7],
  },
  'salmon-avocado-rice': {
    edge: [30, 320, 50, 237],
    layers: [
      [
        ['salmon:cube', 'b', 150, 170, 2, 0, 10, 3.2],
        ['avocado:slice', 'm', 240, 132, 6, 60], ['avocado:slice', 'm', 250, 147, 6, 75], ['avocado:slice', 'm', 258, 163, 6, 85],
        ['avocado:slice', 'm', 262, 180, 6, 95], ['avocado:slice', 'm', 260, 198, 6, 105], ['avocado:slice', 'm', 252, 214, 6, 120],
      ],
      [['lime:wedge', 's', 222, 100, 4, 20], ['lime:wedge', 's', 250, 95, 4, -20]],
    ],
    herbs: [14, 160, 170, 3],
  },
  'strawberry-milk-pudding': {
    edge: [20, 345, 75, 295],
    base: ['pool:berry-sauce', 205, 195, 5.5],
    layers: [
      [['milk:mash', 'b', 210, 182, 8, 0]],
      [['strawberry:half', 'm', 205, 188, 3, 0, 10, 4.5]],
      [['strawberry:half', 's', 200, 132, 3, 0, 4, 1.5]],
    ],
  },
  'broccoli-lemon-garlic': {
    edge: [10, 335, 70, 290],
    base: ['pool:herb-oil', 160, 215, 7],
    layers: [
      [['broccoli:whole', 'b', 170, 170, 7, 0, 5, 4], ['garlic:chip', 's', 100, 192, 1.6, 0, 5, 2.0], ['garlic:chip', 's', 135, 218, 1.6, 30, 5, 2.0], ['garlic:chip', 's', 75, 182, 1.6, 60, 5, 1.5], ['lemon:half', 's', 275, 122, 6, 0]],
    ],
    herbs: [6, 170, 190, 7],
  },
  'peach-tomato-onion': {
    edge: [20, 345, 75, 290],
    base: ['pool:herb-oil', 190, 200, 7],
    layers: [
      [['tomato:wedge', 'b', 185, 185, 5, 0, 6, 5], ['peach:wedge', 'm', 195, 195, 5, 0, 6, 5]],
      [['onion:wheel', 's', 190, 180, 4, 0, 6, 5]],
    ],
    herbs: [12, 190, 185, 7],
  },
  'chicken-grape-skewer': {
    edge: [0, 350, 85, 340],
    layers: [[['chicken:skewer', 'b', 180, 148, 22, 10], ['chicken:skewer', 'b', 190, 195, 22, 12]]],
    herbs: [8, 160, 210, 8],
  },
  'blueberry-pancakes': {
    edge: [20, 340, 85, 295],
    layers: [
      [['milk:pancake', 'b', 210, 192, 13, 0], ['blueberries:berry', 'm', 200, 205, 1.6, 0, 7, 7]],
      [['milk:pancake', 'b', 210, 182, 12.5, 40]],
      [['milk:pancake', 'b', 210, 172, 12, 80]],
      [['butter:cube', 's', 208, 140, 3, 20], ['blueberries:berry', 'm', 210, 150, 1.5, 0, 9, 3.5]],
    ],
  },
  'orange-salmon-cabbage': {
    edge: [5, 340, 60, 290],
    layers: [[['cabbage:leaf', 'm', 180, 205, 7, 0, 8, 5]], [['salmon:fillet', 'b', 180, 172, 15, 15]]],
    herbs: [8, 180, 180, 6],
  },
  'stuffed-peppers': {
    edge: [20, 345, 75, 290],
    layers: [
      [['pepper:half', 'b', 168, 212, 13, 10], ['pepper:half', 'b', 238, 158, 11, -20]],
      [['cheese:crumble', 'm', 168, 205, 2.2, 0, 6, 2.5], ['cheese:crumble', 'm', 238, 150, 2.2, 0, 5, 2.2]],
    ],
    herbs: [10, 200, 190, 8],
  },
  'potato-onion-soup': {
    edge: [10, 335, 75, 320],
    base: ['soup:potato', 165, 185, 8.5],
    layers: [[['onion:wheel', 's', 165, 172, 2.5, 0, 3, 1.5]]],
    herbs: [14, 165, 180, 6],
  },
  'caesar-romaine-egg': {
    edge: [10, 340, 60, 290],
    base: ['leaves:romaine', 180, 180, 9],
    layers: [
      [['eggs:half', 'm', 95, 152, 4, 0], ['eggs:half', 'm', 175, 212, 4.5, 30], ['eggs:half', 'm', 205, 122, 4, -20], ['baguette:cube', 'm', 185, 180, 2.2, 0, 8, 7]],
      [['cheese:slice', 's', 190, 172, 3, 0, 6, 6]],
    ],
  },
  'pear-grape-cheese-board': {
    edge: [20, 315, 95, 300],
    ware: 'round',
    layers: [
      [['cheese:wedge', 'b', 200, 145, 10, 0], ['pear:slice', 'm', 92, 188, 8, 30], ['pear:slice', 'm', 112, 208, 8, 30], ['pear:slice', 'm', 132, 232, 8, 25], ['grapes:berry', 'm', 262, 188, 2, 0, 14, 4], ['pear:whole', 's', 110, 150, 7, 0]],
    ],
  },
  'steak-mushroom-pepper': {
    edge: [20, 345, 90, 320],
    ware: 'round',
    layers: [[['steak:skewer', 'b', 205, 152, 20, -20], ['steak:skewer', 'b', 210, 188, 21, -25], ['steak:skewer', 'b', 215, 235, 19, -22]]],
    herbs: [8, 200, 200, 9],
  },
  'lemon-chicken-spinach': {
    edge: [5, 345, 75, 330],
    base: ['pool:brown-butter', 175, 215, 8],
    layers: [
      [['spinach:leaf', 'm', 165, 205, 5, 0, 10, 6]],
      [['chicken:drumstick', 'b', 172, 165, 14, 100], ['chicken:drumstick', 'b', 218, 178, 12, 80]],
    ],
    herbs: [10, 175, 190, 7],
  },
  'apple-tart': {
    edge: [20, 345, 80, 315],
    layers: [
      [['butter:pastry', 'b', 205, 190, 16, 0]],
      [['apple:slice', 'm', 205, 182, 5, 0, 12, 3.5]],
      [['milk:mash', 's', 205, 130, 4, 0]],
    ],
  },
  'avocado-toast-tomato': {
    edge: [0, 345, 75, 335],
    layers: [
      [['baguette:toast', 'b', 180, 185, 20, -10]],
      [['avocado:slice', 'm', 180, 172, 7, 0, 6, 4]],
      [['tomato:wedge', 'm', 180, 152, 3.5, 0, 7, 4], ['lime:wedge', 's', 182, 100, 4, 20]],
    ],
    herbs: [10, 180, 160, 6],
  },
  'egg-fried-rice-broccoli': {
    edge: [20, 345, 52, 245],
    layers: [[['broccoli:whole', 'm', 190, 185, 3.5, 0, 6, 4]], [['eggs:egg', 'b', 200, 130, 6, 0]]],
    herbs: [12, 190, 180, 4],
  },
  'garlic-mushroom-toast': {
    edge: [0, 345, 95, 340],
    layers: [
      [['baguette:toast', 'b', 170, 175, 18, -5]],
      [['mushroom:half', 'm', 165, 155, 3.5, 0, 12, 5]],
      [['garlic:chip', 's', 165, 150, 1.6, 0, 9, 3.0]],
    ],
    herbs: [14, 165, 155, 6],
  },
  'citrus-berry-salad': {
    edge: [20, 340, 80, 290],
    base: ['pool:honey', 205, 190, 6],
    layers: [
      [['orange:wheel', 'b', 205, 182, 5, 0, 6, 4]],
      [['strawberry:half', 'm', 205, 180, 3.5, 0, 6, 4], ['blueberries:berry', 's', 205, 185, 1.5, 0, 14, 5]],
    ],
  },
  'salmon-spinach-lemon': {
    edge: [5, 340, 70, 290],
    base: ['pool:cream', 170, 215, 8],
    layers: [[['spinach:leaf', 'm', 150, 202, 5, 0, 10, 4]], [['salmon:fillet', 'b', 185, 162, 15, 20]]],
    herbs: [10, 175, 180, 6],
  },
  'cabbage-apple-slaw': {
    edge: [20, 340, 75, 295],
    layers: [
      [['cabbage:leaf', 's', 195, 178, 4, 0, 14, 5]],
      [['apple:slice', 'm', 195, 170, 4, 0, 6, 4], ['lime:wedge', 's', 265, 155, 4, 30]],
    ],
    herbs: [14, 195, 175, 5],
  },
  'hasselback-cheese-onion': {
    edge: [10, 340, 70, 300],
    layers: [[['potato:whole', 'b', 175, 172, 15, 0]], [['cheese:crumble', 'm', 175, 160, 2, 0, 4, 3]]],
    herbs: [6, 175, 170, 5],
  },
  'peach-melba': {
    edge: [20, 345, 75, 295],
    base: ['pool:berry-sauce', 210, 182, 6],
    layers: [
      [['peach:half', 'b', 190, 188, 6, 0], ['peach:half', 'b', 235, 162, 6, 0]],
      [['milk:mash', 'm', 200, 142, 5, 0], ['blueberries:berry', 's', 210, 188, 1.4, 0, 10, 5], ['strawberry:half', 's', 215, 192, 2, 0, 5, 5]],
    ],
  },
  'steak-romaine-tomato': {
    edge: [10, 335, 60, 290],
    base: ['leaves:romaine', 165, 172, 10],
    layers: [[['steak:steak', 'b', 175, 170, 12, 70], ['tomato:wedge', 'm', 165, 182, 4, 0, 6, 6]]],
  },
  'chicken-rice-chili': {
    edge: [25, 345, 48, 250],
    layers: [[['cabbage:leaf', 'm', 250, 152, 5, 0, 5, 3], ['chicken:cube', 'b', 175, 165, 2.8, 0, 6, 3]]],
    herbs: [8, 200, 150, 3],
  },
  'pepper-peach-cheese': {
    edge: [15, 335, 75, 300],
    layers: [
      [['pepper:half', 'b', 120, 162, 7, 40], ['pepper:half', 'b', 190, 212, 7, 10], ['pepper:half', 'b', 232, 132, 6, -30], ['peach:wedge', 'm', 175, 178, 6, 0, 6, 6]],
      [['cheese:crumble', 's', 170, 182, 1.2, 0, 12, 7]],
    ],
    herbs: [10, 170, 180, 7],
  },
  'mushroom-risotto': {
    edge: [10, 345, 75, 305],
    base: ['mash:risotto', 205, 190, 7],
    layers: [[['mushroom:half', 'm', 205, 178, 3.5, 0, 6, 3.5]], [['butter:cube', 's', 205, 162, 2.5, 20]]],
    herbs: [14, 205, 185, 6],
  },
  'blueberry-lemon-cheesecake': {
    edge: [10, 330, 90, 290],
    layers: [
      [['cheese:cake', 'b', 170, 162, 13, 0], ['blueberries:berry', 'm', 190, 215, 1.6, 0, 4, 2]],
      [['blueberries:berry', 'm', 165, 122, 1.5, 0, 10, 2.5], ['lemon:wheel', 's', 205, 88, 4, 0]],
    ],
  },
  'tomato-melon-gazpacho': {
    edge: [20, 345, 75, 295],
    base: ['soup:tomato', 205, 195, 7],
    layers: [[['watermelon:cube', 'm', 210, 180, 1.6, 0, 8, 2.2], ['pepper:slice', 's', 210, 185, 1.2, 0, 3, 2]]],
    herbs: [8, 210, 180, 3],
  },
  'pear-spinach-orange': {
    edge: [10, 335, 70, 300],
    layers: [
      [['spinach:leaf', 'm', 170, 192, 6, 0, 14, 7]],
      [
        ['orange:wheel', 'b', 115, 132, 6, 0], ['orange:wheel', 'b', 222, 152, 6, 0], ['orange:wheel', 'b', 180, 207, 7, 0],
        ['pear:slice', 'b', 100, 182, 8, -40], ['pear:slice', 'b', 155, 192, 8, -60], ['pear:slice', 'b', 235, 192, 8, 60], ['pear:slice', 'b', 190, 115, 7, 80],
      ],
    ],
  },
  'roast-chicken-potato-garlic': {
    edge: [10, 340, 70, 300],
    layers: [
      [['potato:wedge', 'm', 185, 182, 5, 0, 10, 6]],
      [['chicken:drumstick', 'b', 175, 142, 12, 60], ['chicken:drumstick', 'b', 230, 152, 12, 110], ['chicken:drumstick', 'b', 150, 192, 11, 20], ['garlic:chip', 's', 262, 232, 1.6, 0, 5, 1.5], ['garlic:chip', 's', 200, 242, 1.6, 40, 5, 1.5], ['garlic:chip', 's', 285, 197, 1.6, 80, 5, 1.5]],
    ],
    herbs: [12, 190, 180, 7],
  },
  'broccoli-cheese-bake': {
    edge: [10, 340, 85, 300],
    base: ['pool:cheese-sauce', 175, 178, 7],
    layers: [[['broccoli:whole', 'b', 175, 172, 3.5, 0, 8, 5]], [['cheese:crumble', 's', 175, 170, 1.5, 0, 10, 5]]],
  },
  'salmon-avocado-crisp-rice': {
    edge: [20, 345, 55, 290],
    layers: [
      [['rice:cube', 'b', 140, 198, 9, 0], ['rice:cube', 'b', 215, 148, 9, 20]],
      [['avocado:slice', 'm', 140, 188, 4, 0, 3, 1.5], ['avocado:slice', 'm', 215, 138, 4, 0, 3, 1.5]],
      [['salmon:slice', 'm', 140, 178, 4, 0, 3, 1.5], ['salmon:slice', 'm', 215, 130, 4, 0, 3, 1.5]],
    ],
    herbs: [10, 180, 150, 5],
  },
  'steak-apple-onion': {
    edge: [5, 340, 70, 300],
    base: ['pool:jus', 170, 202, 8],
    layers: [[['steak:steak', 'b', 170, 192, 14, 0]], [['apple:wedge', 'm', 180, 152, 5, 0, 7, 4], ['onion:wheel', 's', 175, 167, 3.5, 0, 6, 4]]],
  },
  'strawberry-grape-tart': {
    edge: [20, 340, 90, 300],
    layers: [
      [['butter:pastry', 'b', 210, 182, 14, 0]],
      [['strawberry:half', 'm', 210, 166, 3, 0, 9, 4], ['grapes:berry', 'm', 210, 168, 2, 0, 10, 4]],
    ],
  },
  'shakshuka-spinach': {
    edge: [5, 335, 85, 285],
    base: ['pool:tomato-sauce', 155, 200, 7.5],
    layers: [
      [['spinach:leaf', 's', 160, 196, 4, 0, 8, 5], ['eggs:egg', 'b', 115, 172, 5.5, 0], ['eggs:egg', 'b', 195, 207, 5.5, 0]],
      [['baguette:toast', 'm', 255, 132, 9, 70], ['baguette:toast', 'm', 290, 167, 9, 80]],
    ],
  },
  'lemon-garlic-salmon': {
    edge: [10, 340, 70, 290],
    base: ['pool:brown-butter', 180, 202, 8],
    layers: [
      [['salmon:fillet', 'b', 160, 172, 15, 15], ['lemon:wheel', 'm', 285, 182, 5, 0], ['lemon:wheel', 'm', 195, 242, 5, 0], ['garlic:chip', 's', 270, 212, 1.6, 0, 5, 3.0], ['garlic:chip', 's', 115, 177, 1.6, 0, 5, 1.5]],
      [['lemon:wheel', 's', 165, 120, 4.5, 0]],
    ],
    herbs: [12, 190, 180, 8],
  },
  'tomato-cheese-caprese': {
    edge: [5, 340, 75, 295],
    layers: [
      [['tomato:wheel', 'b', 115, 167, 6, 0], ['tomato:wheel', 'b', 200, 202, 7, 0], ['tomato:wheel', 'b', 235, 157, 6, 0], ['tomato:wheel', 'b', 212, 117, 6, 0]],
      [['cheese:slice', 'm', 92, 187, 5, 20], ['cheese:slice', 'm', 157, 217, 5.5, -10], ['cheese:slice', 'm', 238, 122, 5, 30], ['cheese:slice', 'm', 165, 137, 5, 0]],
      [['spinach:leaf', 's', 170, 162, 4, 0, 8, 5]],
    ],
  },
  'mushroom-steak-garlic': {
    edge: [20, 345, 85, 320],
    layers: [[['steak:steak', 'b', 160, 202, 13, 60]], [['mushroom:half', 'm', 210, 172, 3.5, 0, 9, 5], ['garlic:chip', 's', 272, 137, 1.6, 0, 5, 3.0], ['garlic:chip', 's', 277, 187, 1.6, 30, 5, 1.5]]],
  },
  'avocado-egg-rice': {
    edge: [25, 320, 55, 250],
    layers: [
      [
        ['avocado:slice', 'm', 238, 120, 6, 60], ['avocado:slice', 'm', 250, 136, 6, 75], ['avocado:slice', 'm', 258, 153, 6, 85],
        ['avocado:slice', 'm', 262, 171, 6, 95], ['avocado:slice', 'm', 258, 189, 6, 105], ['avocado:slice', 'm', 248, 206, 6, 120],
        ['eggs:egg', 'b', 180, 177, 5.5, 0],
      ],
    ],
    herbs: [14, 160, 160, 3],
  },
  'pepper-onion-skillet': {
    edge: [20, 340, 70, 290],
    base: ['pool:tomato-sauce', 195, 187, 6],
    layers: [[['pepper:slice', 'b', 195, 182, 4.5, 0, 14, 5], ['onion:wheel', 'm', 195, 180, 3.5, 0, 6, 5]]],
    herbs: [8, 195, 180, 5],
  },
  'grape-chicken-salad': {
    edge: [5, 340, 75, 300],
    base: ['leaves:romaine', 170, 182, 10],
    layers: [[['chicken:cube', 'b', 175, 182, 3, 0, 7, 6], ['grapes:berry', 'm', 170, 177, 2, 0, 10, 7]]],
  },
  'pear-blue-cheese-toast': {
    edge: [10, 340, 95, 340],
    layers: [
      [['baguette:toast', 'b', 110, 152, 9, -10], ['baguette:toast', 'b', 230, 137, 9, 0], ['baguette:toast', 'b', 230, 207, 10, 0]],
      [['cheese:slice', 'm', 110, 145, 4, 0], ['cheese:slice', 'm', 230, 130, 4, 0], ['cheese:slice', 'm', 230, 200, 4, 0]],
      [['pear:slice', 'm', 110, 142, 5, 0, 3, 1.5], ['pear:slice', 'm', 230, 127, 5, 0, 3, 1.5], ['pear:slice', 'm', 230, 197, 5, 0, 3, 1.5]],
    ],
    herbs: [10, 190, 165, 6],
  },
  'watermelon-feta-mint': {
    edge: [10, 330, 75, 295],
    layers: [
      [['watermelon:cube', 'b', 170, 182, 3.5, 0, 10, 5]],
      [['watermelon:cube', 'b', 170, 167, 3.5, 0, 4, 3]],
      [['cheese:crumble', 'm', 165, 182, 1.5, 0, 12, 6], ['spinach:leaf', 's', 170, 162, 3, 0, 6, 6]],
    ],
  },
  'peach-salmon-skewers': {
    edge: [20, 345, 85, 320],
    ware: 'round',
    layers: [[['salmon:skewer', 'b', 190, 142, 20, 20], ['salmon:skewer', 'b', 205, 197, 20, 25]], [['lime:wedge', 's', 265, 117, 5, 20], ['lime:wedge', 's', 285, 207, 5, -20]]],
    herbs: [12, 200, 180, 8],
  },
  'potato-egg-salad': {
    edge: [10, 330, 75, 300],
    layers: [
      [['potato:cube', 'b', 180, 182, 2.8, 0, 12, 5]],
      [['eggs:half', 'm', 120, 167, 3.5, 0], ['eggs:half', 'm', 230, 172, 3.5, 30], ['eggs:half', 'm', 175, 222, 3.5, -20], ['eggs:half', 'm', 205, 130, 3.5, 60], ['onion:wheel', 's', 180, 172, 3, 0, 6, 5]],
    ],
    herbs: [16, 175, 175, 6],
  },
  'cabbage-steak-rolls': {
    edge: [20, 345, 75, 300],
    base: ['pool:tomato-sauce', 210, 187, 8],
    layers: [[['cabbage:roll', 'b', 175, 182, 8, 80], ['cabbage:roll', 'b', 248, 137, 8, 80], ['steak:cube', 'm', 210, 187, 2, 0, 6, 6]]],
    herbs: [8, 210, 170, 6],
  },
  'apple-pear-crumble': {
    edge: [0, 345, 65, 300],
    layers: [
      [['apple:cube', 'b', 165, 197, 2.5, 0, 8, 4], ['pear:cube', 'b', 168, 197, 2.5, 0, 6, 4]],
      [['butter:crumble', 'm', 175, 165, 1.2, 0, 30, 5]],
    ],
  },
  // Drinks: the ruler is the glass's foot on the table (its oval), the drink stands there.
  'lime-avocado-mousse': {
    edge: [115, 245, 245, 280],
    base: ['drink:avocado', 180, 262, 3.6],
    layers: [[['lime:wheel', 'b', 180, 262, 5, 0], ['avocado:whole', 'm', 25, 197, 8, 30], ['lime:half', 's', 22, 282, 5, 0]]],
  },
  'strawberry-milkshake': {
    edge: [105, 240, 270, 305],
    base: ['drink:strawberry', 172, 288, 3.6],
    layers: [[['strawberry:half', 'b', 172, 288, 3.5, 0]]],
  },
  'orange-lime-cooler': {
    edge: [90, 240, 250, 290],
    base: ['drink:orange', 165, 270, 3.6],
    layers: [[['orange:wheel', 'b', 165, 270, 5, 0]]],
  },
  'blueberry-smoothie': {
    edge: [125, 260, 235, 265],
    base: ['drink:blueberry', 190, 250, 3.6],
    layers: [[['peach:wedge', 'm', 65, 182, 6, -30], ['blueberries:berry', 's', 115, 237, 2, 0], ['blueberries:berry', 's', 100, 262, 2, 0], ['blueberries:berry', 's', 145, 252, 2, 0], ['blueberries:berry', 's', 155, 287, 2, 0], ['blueberries:berry', 's', 125, 214, 2, 0]]],
  },
  'watermelon-cooler': {
    edge: [120, 260, 230, 265],
    base: ['drink:watermelon', 190, 248, 3.6],
    layers: [[['lime:wheel', 'b', 190, 248, 4.5, 0], ['watermelon:wedge', 'm', 100, 242, 9, 0]]],
  },
  'tomato-juice-pepper': {
    edge: [125, 250, 240, 285],
    base: ['drink:tomato', 188, 262, 3.6],
    layers: [[['lemon:wheel', 'b', 188, 262, 5, 0], ['pepper:whole', 'm', 60, 122, 10, 20], ['tomato:whole', 'm', 50, 202, 8, 0], ['lemon:half', 's', 305, 282, 6, 0]]],
  },
  'spinach-apple-juice': {
    edge: [140, 260, 230, 265],
    base: ['drink:green', 200, 248, 3.6],
    layers: [[['spinach:leaf', 'm', 120, 122, 6, 0, 4, 3], ['apple:whole', 'm', 65, 182, 8, 0], ['apple:wedge', 's', 95, 242, 6, 20], ['lime:half', 's', 295, 217, 5, 0]]],
  },
  'grape-pear-spritz': {
    edge: [95, 235, 245, 265],
    base: ['drink:grape', 165, 255, 3.6],
    layers: [[['pear:slice', 'b', 165, 255, 5, 0], ['grapes:berry', 'm', 35, 247, 2.2, 0], ['grapes:berry', 'm', 62, 237, 2.2, 0], ['grapes:berry', 'm', 90, 242, 2.2, 0], ['grapes:berry', 'm', 55, 277, 2.2, 0], ['grapes:berry', 'm', 90, 297, 2.2, 0], ['pear:whole', 's', 322, 102, 8, 0]]],
  },
  'peach-chili-salmon': {
    edge: [10, 345, 65, 285],
    layers: [
      [['salmon:fillet', 'b', 230, 172, 10, 0], ['salmon:fillet', 'b', 150, 227, 9, -20]],
      [['peach:cube', 'm', 180, 182, 2, 0, 14, 5], ['tomato:wedge', 's', 185, 187, 1.5, 0, 6, 5]],
    ],
    herbs: [10, 190, 180, 6],
  },
  'butter-garlic-broccoli-rice': {
    edge: [20, 320, 50, 240],
    layers: [[['broccoli:whole', 'b', 150, 167, 3, 0, 10, 4]]],
    herbs: [8, 160, 160, 4],
  },
  'egg-avocado-toast': {
    edge: [20, 345, 115, 340],
    ware: 'round',
    layers: [[['baguette:toast', 'b', 205, 202, 15, 10]], [['avocado:slice', 'm', 205, 187, 5, 0, 6, 4]], [['eggs:egg', 'b', 215, 157, 6, 0]]],
    herbs: [10, 210, 170, 5],
  },
  'cheese-onion-tart': {
    edge: [5, 340, 60, 295],
    layers: [[['butter:pastry', 'b', 165, 182, 20, 0]], [['onion:wheel', 'm', 165, 172, 4, 0, 6, 5], ['cheese:crumble', 's', 165, 172, 1.5, 0, 8, 5]]],
  },
  'tomato-rice-soup': {
    edge: [5, 345, 60, 295],
    base: ['soup:tomato', 205, 182, 8],
    layers: [[['garlic:chip', 's', 205, 162, 1.6, 0, 9, 1.5]]],
    herbs: [14, 205, 170, 4],
  },
  'chicken-pepper-stew': {
    edge: [10, 330, 85, 310],
    base: ['pool:tomato-sauce', 165, 192, 7.5],
    layers: [[['potato:cube', 'b', 165, 182, 2.5, 0, 8, 4.5], ['chicken:cube', 'b', 170, 182, 2.8, 0, 6, 4.5]], [['pepper:slice', 'm', 165, 187, 3.5, 0, 8, 5]]],
    herbs: [6, 165, 180, 5],
  },
  'salmon-cabbage-lime': {
    edge: [10, 345, 85, 300],
    layers: [[['cabbage:leaf', 'm', 210, 202, 5, 0, 10, 5]], [['salmon:fillet', 'b', 195, 167, 14, 10], ['lime:wedge', 's', 265, 182, 5, 30]]],
    herbs: [10, 200, 170, 6],
  },
  'orange-chicken-rice': {
    edge: [25, 330, 50, 240],
    layers: [[['chicken:cube', 'b', 170, 167, 2.4, 0, 14, 4]]],
    herbs: [10, 170, 160, 3],
  },
  'lemon-potato-wedges': {
    edge: [20, 345, 70, 320],
    ware: 'round',
    layers: [
      [['potato:wedge', 'b', 190, 182, 6, 0, 14, 7]],
      [['lemon:wedge', 'm', 95, 177, 5, 30], ['lemon:wedge', 'm', 255, 212, 5, -20], ['garlic:chip', 's', 290, 142, 1.6, 0, 5, 1.5], ['garlic:chip', 's', 112, 227, 1.6, 40, 5, 1.5]],
    ],
    herbs: [12, 190, 180, 8],
  },
  'peach-cheese-board': {
    edge: [10, 330, 90, 320],
    ware: 'round',
    layers: [
      [
        ['cheese:wedge', 'b', 110, 147, 10, 0], ['cheese:wedge', 'b', 210, 112, 8, 20], ['cheese:wedge', 'b', 275, 182, 7, -30],
        ['peach:wedge', 'm', 60, 172, 6, 60], ['peach:wedge', 'm', 110, 202, 6, 20], ['peach:wedge', 'm', 165, 197, 6, -10], ['peach:wedge', 'm', 178, 147, 6, 40],
        ['grapes:berry', 'm', 225, 207, 2, 0, 12, 3.5], ['grapes:berry', 's', 100, 92, 1.8, 0, 6, 2.5],
      ],
    ],
  },
  'mushroom-egg-rice': {
    edge: [30, 330, 50, 250],
    layers: [[['mushroom:half', 'm', 180, 197, 3, 0, 10, 4]], [['eggs:egg', 'b', 200, 147, 7, 0]]],
    herbs: [10, 190, 170, 4],
  },
  'avocado-tomato-salad': {
    edge: [5, 330, 75, 290],
    layers: [
      [['tomato:wedge', 'b', 160, 182, 5, 0, 8, 6], ['avocado:half', 'b', 150, 142, 7, 0], ['avocado:half', 'b', 230, 172, 8, 30]],
      [['onion:wheel', 's', 160, 172, 4, 0, 6, 6]],
    ],
    herbs: [12, 170, 170, 7],
  },
  'strawberry-cheese-toast': {
    edge: [15, 345, 80, 315],
    layers: [[['baguette:toast', 'b', 200, 177, 18, 0]], [['cheese:slice', 'm', 200, 177, 5, 0, 3, 3]], [['strawberry:half', 'm', 200, 152, 3, 0, 9, 4]]],
    herbs: [8, 200, 160, 5],
  },
  'apple-chicken-salad': {
    edge: [5, 335, 70, 300],
    base: ['leaves:spinach', 175, 187, 9],
    layers: [[['chicken:cube', 'b', 175, 177, 2.8, 0, 6, 4], ['apple:slice', 'm', 175, 182, 5, 0, 6, 5]]],
    herbs: [12, 175, 180, 7],
  },
  'steak-potato-mash': {
    edge: [10, 345, 70, 290],
    layers: [[['potato:mash', 'b', 190, 202, 14, 0]], [['steak:steak', 'b', 190, 162, 9, 0], ['pepper:slice', 'm', 200, 182, 4, 0, 8, 4]]],
    herbs: [6, 190, 180, 5],
  },
  'grape-cheese-salad': {
    edge: [10, 335, 65, 295],
    base: ['leaves:romaine', 150, 172, 9],
    layers: [[['grapes:berry', 'm', 150, 177, 2, 0, 12, 6], ['cheese:crumble', 's', 150, 177, 1.2, 0, 16, 6]]],
  },
  'pear-butter-cake': {
    edge: [20, 345, 70, 300],
    layers: [[['butter:cake', 'b', 210, 197, 11, 0]], [['pear:half', 'm', 185, 162, 7, 100], ['pear:half', 'm', 225, 162, 7, 80]], [['milk:mash', 's', 235, 112, 6, 0]]],
  },
  'blueberry-yogurt-bowl': {
    edge: [20, 330, 70, 300],
    base: ['pool:cream', 170, 187, 7],
    layers: [[['peach:slice', 'b', 170, 182, 6, 0, 7, 4]], [['blueberries:berry', 'm', 170, 182, 1.6, 0, 16, 6]]],
  },
  'salmon-potato-cakes': {
    edge: [20, 345, 85, 315],
    layers: [
      [['salmon:fillet', 'b', 135, 147, 13, 20], ['potato:mash', 'b', 225, 157, 8, 0], ['potato:mash', 'b', 215, 217, 8, 0]],
      [['lemon:wedge', 'm', 92, 202, 5, 20], ['lemon:wedge', 'm', 127, 217, 5, -20]],
    ],
    herbs: [8, 180, 160, 7],
  },
  'tomato-egg-toast': {
    edge: [10, 330, 80, 310],
    ware: 'round',
    layers: [[['baguette:toast', 'b', 180, 182, 18, -5]], [['tomato:wheel', 'm', 180, 167, 5, 0, 5, 4]], [['eggs:egg', 'b', 132, 127, 5, 0], ['eggs:egg', 'b', 205, 157, 5, 0]]],
    herbs: [12, 180, 150, 6],
  },
  'cabbage-potato-colcannon': {
    edge: [15, 340, 70, 300],
    layers: [[['potato:mash', 'b', 180, 177, 13, 0]], [['cabbage:leaf', 's', 180, 167, 3, 0, 10, 4]]],
  },
  'lime-chili-chicken': {
    edge: [15, 335, 65, 300],
    base: ['pool:chili', 170, 197, 8],
    layers: [
      [['chicken:drumstick', 'b', 135, 147, 11, 40], ['chicken:drumstick', 'b', 215, 137, 11, 120], ['chicken:drumstick', 'b', 150, 207, 10, 0], ['chicken:drumstick', 'b', 230, 192, 10, 60]],
      [['lime:wedge', 'm', 120, 117, 5, 20], ['lime:wedge', 'm', 270, 162, 5, -30], ['lime:wedge', 'm', 120, 207, 5, 10]],
    ],
    herbs: [14, 170, 170, 8],
  },
  'mushroom-spinach-toast': {
    edge: [0, 345, 70, 335],
    layers: [[['baguette:toast', 'b', 220, 172, 18, 0]], [['spinach:leaf', 'm', 230, 162, 5, 0, 8, 4], ['mushroom:slice', 'm', 200, 167, 3, 0, 8, 4]]],
  },
  'orange-pear-salad': {
    edge: [10, 335, 60, 300],
    base: ['leaves:spinach', 170, 172, 10],
    layers: [
      [
        ['orange:wheel', 'b', 135, 112, 6, 0], ['orange:wheel', 'b', 190, 138, 6.5, 0], ['orange:wheel', 'b', 235, 157, 6, 0], ['orange:wheel', 'b', 165, 197, 6, 0],
        ['pear:slice', 'm', 95, 160, 7, 40], ['pear:slice', 'm', 200, 100, 7, -30], ['pear:slice', 'm', 255, 197, 7, 50], ['pear:slice', 'm', 115, 215, 7, -20],
      ],
    ],
  },
  'steak-garlic-rice': {
    edge: [25, 345, 48, 240],
    layers: [[['steak:cube', 'b', 200, 177, 2.8, 0, 9, 4]], [['garlic:chip', 's', 200, 152, 1.6, 0, 24, 3.5]]],
    herbs: [10, 200, 170, 4],
  },
  'peach-butter-toast': {
    edge: [15, 330, 95, 335],
    ware: 'round',
    layers: [[['baguette:toast', 'b', 180, 197, 18, -10]], [['butter:cube', 's', 170, 182, 3, 20], ['peach:slice', 'm', 180, 172, 6, 0, 6, 4]]],
  },
  'roast-tomato-garlic': {
    edge: [15, 335, 60, 310],
    layers: [
      [['tomato:half', 'b', 130, 177, 6, 0], ['tomato:half', 'b', 195, 142, 6.5, 0], ['tomato:half', 'b', 255, 182, 6, 0], ['tomato:half', 'b', 140, 237, 6, 0], ['tomato:half', 'b', 215, 232, 6.5, 0], ['garlic:chip', 's', 195, 197, 1.6, 0, 5, 1.8], ['garlic:chip', 's', 265, 147, 1.6, 30, 5, 1.5]],
      [['cheese:crumble', 's', 190, 187, 1.2, 0, 12, 6]],
    ],
    herbs: [8, 190, 190, 7],
  },
  'apple-cabbage-steak': {
    edge: [10, 330, 70, 300],
    layers: [[['steak:steak', 'b', 140, 197, 13, 80], ['cabbage:leaf', 's', 215, 172, 3, 0, 12, 5]], [['apple:slice', 'm', 215, 162, 5, 0, 5, 4]]],
    herbs: [10, 190, 180, 7],
  },
  'grape-peach-salad': {
    edge: [20, 340, 60, 295],
    base: ['pool:honey', 205, 177, 6],
    layers: [[['peach:wedge', 'b', 205, 177, 5, 0, 7, 4.5], ['grapes:berry', 'm', 205, 177, 2, 0, 12, 5]]],
  },
  'egg-spinach-rice': {
    edge: [15, 330, 65, 265],
    layers: [[['spinach:leaf', 'm', 175, 202, 3.5, 0, 10, 4]], [['eggs:egg', 'b', 180, 157, 8, 0]]],
  },
  'lemon-cheese-dessert': {
    edge: [10, 340, 70, 310],
    layers: [
      [['butter:cake', 'b', 175, 197, 7, 0], ['butter:cake', 'b', 225, 157, 7, 0], ['strawberry:half', 's', 100, 202, 3, 0], ['blueberries:berry', 's', 200, 210, 1.5, 0, 4, 4]],
      [['strawberry:half', 'm', 160, 162, 3, 0], ['strawberry:half', 'm', 220, 122, 3, 0], ['blueberries:berry', 's', 190, 160, 1.5, 0, 4, 3]],
    ],
  },
  'onion-potato-gratin': {
    edge: [20, 345, 65, 305],
    layers: [
      [['potato:wheel', 'b', 175, 187, 5, 0, 14, 5]],
      [['potato:wheel', 'b', 175, 172, 5, 0, 8, 4], ['onion:wheel', 's', 175, 175, 3, 0, 4, 4]],
      [['cheese:crumble', 's', 175, 172, 1.2, 0, 10, 5]],
    ],
  },
  'watermelon-salmon-poke': {
    edge: [25, 345, 45, 240],
    layers: [[['salmon:cube', 'b', 200, 172, 2.4, 0, 8, 3.5], ['watermelon:cube', 'b', 200, 172, 2.4, 0, 7, 3.5]]],
    herbs: [12, 200, 165, 4],
  },
  'pepper-egg-toast': {
    edge: [0, 340, 90, 345],
    layers: [[['baguette:toast', 'b', 170, 187, 17, 0]], [['pepper:slice', 'm', 175, 182, 4, 0, 10, 5]], [['eggs:egg', 'b', 175, 147, 8, 0]]],
  },
  'broccoli-salmon-rice': {
    edge: [25, 345, 50, 250],
    layers: [[['broccoli:whole', 'm', 190, 177, 2.8, 0, 8, 4.5], ['salmon:cube', 'b', 205, 172, 2.5, 0, 6, 3]]],
    herbs: [8, 200, 170, 4],
  },
};

/** The dish as the reference shows it: its ware and base from the trace. */
export function effectiveIdea(idea: DishIdea): DishIdea {
  const t = TRACES[idea.id];
  if (!t) return idea;
  const ware = t.ware ?? idea.ware;
  return { ...idea, ware, base: t.base?.[0] ?? defaultPool(idea, ware) ?? 'none' };
}

/**
 * The sauce every plated dish starts from (the user, 2026-11-25: "first place the sauce pool, then
 * place the cut pieces ..."): a plate, slate or pasta bowl with no sauce in its reference gets one
 * under its food, the catalogue's own when it names one, else one that suits the dish.
 */
function defaultPool(idea: DishIdea, ware: DishIdea['ware']): string | undefined {
  if (!['plate', 'slate', 'bowl'].includes(ware)) return undefined;
  if (idea.base.startsWith('pool:')) return idea.base;
  if (idea.course === 'dessert') return 'pool:berry-sauce';
  if (idea.heroes.some((h) => ['steak', 'chicken', 'mushroom'].includes(h))) return 'pool:jus';
  if (idea.heroes.some((h) => ['salmon', 'eggs', 'potato'].includes(h))) return 'pool:cream';
  return 'pool:herb-oil';
}

/** Every part a traced dish uses (for its roles and colours), or nothing when it is not traced. */
export function tracedParts(idea: DishIdea): string[] | null {
  const t = TRACES[idea.id];
  if (!t) return null;
  const parts = t.layers.flat().map((item) => item[0]);
  if (t.herbs) parts.push('herb');
  return [...new Set(parts)].map((p) => readPart(p).form === 'herb' ? 'herb*1' : p);
}

/** The plan a dish is built from: its traced reference, or the composer's own plan. */
export function planFor(idea: DishIdea): ComposedPlan {
  const t = TRACES[idea.id];
  if (t) return tracedPlan(effectiveIdea(idea), t);
  // Generated dishes (the Kitchen's Cook) are planned from their layout, never the old ring.
  if (idea.layout) return composeLayoutPlan(idea, layoutById(idea.layout)!, idea.seed ?? 1);
  return composePlan(idea);
}
