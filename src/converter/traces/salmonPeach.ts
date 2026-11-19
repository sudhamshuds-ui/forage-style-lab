import type { DishTrace } from '../trace';

/**
 * Seared salmon, caramelised peach, lime foam: the painting traced (Figma node 214:2, 512 x 640).
 * A first draft by Claude, read off the painting; drag the points on the page to fix it, then
 * "Copy trace" and paste it back here.
 *
 * Rim points sit on the plate's outer edge, at the top of its lip. Each outline goes round what is
 * visible of the piece; `height` is how tall the piece stands (cm), used to find its footprint.
 */
export const SALMON_PEACH_TRACE: DishTrace = {
  dish: 'dish-salmon-peach',
  painting: 'salmon-peach.png',
  picture: { width: 512, height: 640 },
  ware: 'dinner',
  fov: 30,
  rim: [
    [50, 322], [62, 268], [100, 222], [150, 206], [255, 198], [350, 207], [400, 222], [440, 258],
    [453, 315], [440, 392], [400, 420], [350, 437], [255, 446], [150, 433], [100, 413], [62, 372],
  ],
  pieces: [
    {
      label: 'foam', ingredient: 'lime', size: 'ground', height: 0.5,
      outline: [[262, 352], [292, 345], [320, 366], [345, 374], [353, 395], [340, 410], [300, 418], [265, 412], [250, 392], [254, 366]],
    },
    {
      label: 'foam', ingredient: 'lime', size: 'ground', height: 0.5,
      outline: [[118, 348], [132, 337], [152, 338], [160, 350], [150, 362], [130, 365], [117, 358]],
    },
    {
      label: 'salmon', ingredient: 'salmon', size: 'big', height: 3.4,
      outline: [[197, 223], [253, 237], [300, 262], [327, 275], [355, 300], [368, 330], [366, 345], [337, 368], [300, 350], [262, 330], [237, 315], [200, 300], [160, 292], [155, 265], [170, 240]],
    },
    {
      label: 'peach', ingredient: 'peach', size: 'medium', height: 2.4,
      outline: [[128, 272], [145, 280], [168, 293], [185, 310], [178, 330], [165, 345], [150, 341], [135, 325], [125, 300]],
    },
    {
      label: 'peach', ingredient: 'peach', size: 'medium', height: 2.4,
      outline: [[153, 380], [190, 340], [220, 322], [240, 318], [247, 335], [240, 365], [215, 390], [185, 397], [160, 392]],
    },
    {
      label: 'peach', ingredient: 'peach', size: 'medium', height: 2.4,
      outline: [[308, 243], [335, 250], [355, 262], [365, 280], [355, 285], [335, 272], [318, 262]],
    },
    { label: 'lime', ingredient: 'lime', size: 'small', height: 0.3, outline: ellipse(285, 243, 25, 16) },
    { label: 'lime', ingredient: 'lime', size: 'small', height: 1.5, outline: ellipse(355, 303, 22, 29) },
    { label: 'lime', ingredient: 'lime', size: 'small', height: 0.6, outline: ellipse(190, 328, 30, 27) },
    { label: 'lime', ingredient: 'lime', size: 'small', height: 0.6, outline: ellipse(240, 380, 32, 27) },
  ],
};

/** An oval outline (a lime wheel seen at an angle), as ten points. */
function ellipse(cx: number, cy: number, rx: number, ry: number): [number, number][] {
  return Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2;
    return [Math.round(cx + Math.cos(a) * rx), Math.round(cy + Math.sin(a) * ry)] as [number, number];
  });
}
