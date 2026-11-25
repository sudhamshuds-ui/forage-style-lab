/**
 * The cooking panel beside the card: the few choices that steer what the ingredients become.
 *
 * Kept small on purpose (the user, 2026-11-16: "less parameters"): the course, the taste, and
 * how wild the result may be. Each has a default; Randomise picks new ones at random. The values
 * are plain data (`CookChoices`), ready to be handed to whatever makes the dish.
 */

export interface CookChoices {
  course: string;
  taste: string;
  /** 0 to 100: from a classic dish to something nobody has made before. */
  wild: number;
}

interface ChipGroup {
  key: 'course' | 'taste';
  label: string;
  options: string[];
}

const GROUPS: ChipGroup[] = [
  { key: 'course', label: 'Course', options: ['Starter', 'Main', 'Dessert', 'Snack', 'Drink'] },
  { key: 'taste', label: 'Taste', options: ['Savoury', 'Sweet', 'Both'] },
];

export const DEFAULT_CHOICES: CookChoices = { course: 'Main', taste: 'Savoury', wild: 60 };

export interface CookPanel {
  choices(): CookChoices;
  /** Cook can be pressed only while something is on the table. */
  setCanCook(can: boolean): void;
  /** While the dish is being plated (a few seconds of physics): Cook reads "Cooking" and waits. */
  setBusy(busy: boolean): void;
  /** A short line under Cook when a cook failed (never a silent click); empty clears it. */
  showError(text: string): void;
}

/** Two dice (Randomise): the user's icon from Figma (Forage file, node 283:229), in the button's ink. */
const RANDOM_ICON = `<svg viewBox="0 0 512 512" width="20" height="20" fill="none" aria-hidden="true"> <g> <path d="M321.755 29.0849C324.532 28.9356 327.725 29.5461 330.317 30.5174C338.93 33.7439 347.535 37.1536 356.11 40.4766L407.672 60.4806L436.747 71.7499C442.232 73.8774 447.81 75.7911 453.047 78.4714C462.737 83.4309 463.007 93.4614 464.453 102.907L466.957 119.252L475.15 172.292L479.947 203.272C480.852 209.073 481.925 215.035 482.517 220.856C483.145 227.028 480.345 234.021 475.637 238.051C470.6 242.367 465.328 246.448 460.162 250.607L429.102 275.582L393.032 304.587C388.975 307.857 383.692 311.77 379.885 315.172C365.312 328.19 355.858 322.5 339.69 316.192C328.65 311.832 317.575 307.552 306.472 303.357C309.923 308.225 313.33 313.577 316.722 318.532C318.88 321.682 322.827 327.227 324.31 330.38C325.372 332.632 325.995 335.067 326.145 337.552C326.262 339.645 325.842 343.46 324.98 345.355C322.435 350.94 319.605 356.585 316.905 362.097L301.342 393.897L279.533 438.47L272.325 453.205C270.203 457.537 267.688 463.417 264.535 466.917C261.94 469.827 258.625 471.997 254.923 473.212C250.012 474.845 243.217 474.83 237.927 475.235C228.773 475.987 219.609 476.607 210.438 477.092L191.257 478.472C178.417 479.497 165.448 480.122 152.598 481.072L137.697 482.097C123.59 483.16 111.764 485.527 102.986 472.01C99.5275 466.685 95.7435 461.2 92.186 455.91L67.2775 418.875L43.999 384.272C39.8805 378.16 35.5487 371.925 31.6497 365.692C29.105 361.625 28.589 353.805 30.5507 349.4C33.3222 343.177 36.505 336.877 39.528 330.707L56.2738 296.505L77.9133 252.29C81.4858 244.964 84.9205 237.482 88.7852 230.314C94.313 220.061 105.043 220.583 114.996 219.912L137.882 218.378L215.5 213.062C214.853 210.599 214.183 205.233 213.766 202.521L210.728 182.778L205.728 150.57C204.832 144.799 203.939 138.855 203.099 133.252C202.288 127.845 203.197 121.28 207.038 117.181C210.861 113.102 218.183 107.71 222.767 104.022L258.87 75.0101L295.022 45.9494L305.44 37.5676C311.57 32.6129 313.75 30.0319 321.755 29.0849ZM347.872 178.264C348.362 185.092 350.647 197.445 351.747 204.531L359.485 254.542L365.132 291.075C365.845 295.682 367.122 305.81 368.29 309.792C371.745 307.67 379.025 301.402 382.455 298.625L407.552 278.482L447.527 246.344C454.33 240.885 461.167 235.463 467.902 229.92C471.425 227.021 471.715 223.579 471.097 219.387C469.787 210.491 468.377 201.607 467 192.721L459.157 142.1C458.483 137.728 452.195 95.4261 451.695 94.5666L451.487 94.4324C449.985 96.2851 445.072 100.022 443.03 101.66L427.822 113.846L374.66 156.592L357.347 170.492C354.567 172.724 350.36 175.913 347.872 178.264ZM356.82 310.627L342.667 219.133C341.988 214.733 337.145 181.415 336.265 180.037C332.295 178.04 324.145 175.133 319.71 173.412L288.465 161.288L241.046 142.887C232.464 139.554 222.991 135.63 214.355 132.639L227.474 217.703L231.575 244.289C232.217 248.474 233.258 262.09 237.194 263.997C243.972 267.285 252.012 270.137 259.11 272.887L313.427 293.94L343.737 305.717C345.685 306.475 355.333 310.345 356.82 310.627ZM113.634 465.685L152.38 386.492L164.311 362.087C166.228 358.17 169.001 352.915 170.638 348.965C168.27 345.095 165.189 340.745 162.634 336.945L147.917 315.065L111.914 261.53C110.19 258.965 98.002 240.355 96.656 239.417C84.0525 265.97 70.5815 292.805 57.65 319.235L46.822 341.31C44.846 345.34 42.6997 349.427 41.0517 353.595C39.708 356.995 41.1885 359.88 43.0305 362.67C46.9007 368.492 50.823 374.28 54.7315 380.075L75.8825 411.505L103.63 452.742C104.924 454.645 111.861 465.602 113.04 466.14C113.571 465.917 113.394 466.095 113.634 465.685ZM218.442 121.973C225.968 125.164 234.305 128.23 241.987 131.207L282.343 146.859L319.285 161.199C325.87 163.756 332.485 166.357 339.1 168.844C339.88 169.138 340.342 169.262 341.155 169.094L412.237 111.891C422.497 103.646 433.907 94.8574 443.882 86.4194C439.985 85.2289 435.705 83.4409 431.858 81.9416L413.025 74.6119L353.085 51.3611L335.895 44.6716C331.275 42.8764 325.892 40.1481 320.935 40.5384C317.737 41.6349 310.935 47.6304 307.98 50.0094L288.7 65.5271L218.442 121.973ZM217.182 224.4L213.192 224.647C190.078 226.034 166.974 227.592 143.883 229.321L117.367 231.14C113.491 231.381 109.231 231.911 105.431 231.911C107.957 235.279 110.524 239.311 112.89 242.841L124.651 260.352L161.768 315.547L173.397 332.852C175.264 335.63 178.061 340.055 180.05 342.55C187.778 342.4 196.487 341.587 204.296 341.072L272.06 336.4C285.212 335.497 300.115 334.06 313.147 333.625C305.75 321.285 295.955 308.657 288.32 296.257L250.497 281.57C244.532 279.257 237.64 277.037 232.04 274.012C222.128 268.657 222.24 256.675 220.621 246.973C219.368 239.464 218.225 231.889 217.182 224.4ZM125.688 471.527L208.187 465.877L235.108 464.025C239.772 463.71 244.869 463.757 249.45 462.877C252.272 462.335 254.155 461.645 256.133 459.457C259.095 456.175 267.902 436.735 270.41 431.63L299.192 372.82C303.59 363.837 308.265 353.667 312.872 344.905L310 345.097C296.147 346.482 280.373 347.197 266.35 348.13L180.82 354.127C178.743 357.805 176.723 362.177 174.854 366.005L165.533 385.072L136.921 443.54L127.831 462.135C126.613 464.632 124.381 469.572 123.016 471.817C123.756 471.735 124.986 471.555 125.688 471.527Z" fill="currentColor"/> <path d="M411.962 184.846C422.567 183.763 420.687 199.224 418.362 205.411C415.937 211.863 412.978 216.639 406.64 219.658C392.448 221.952 397.857 189.293 411.962 184.846Z" fill="currentColor"/> <path d="M436.075 130.302C449.278 130.033 443.812 161.255 428.895 165.475C416.177 166.499 421.503 133.491 436.075 130.302Z" fill="currentColor"/> <path d="M390.155 239.055C403.228 239.355 396.345 271.532 382.465 274.122C378.337 273.935 376.288 271.385 375.578 267.39C373.88 257.842 379.468 241.02 390.155 239.055Z" fill="currentColor"/> <path d="M275.987 211.54C290.75 210.264 307.777 235.63 293.317 240.479C279.105 242.312 261.232 215.617 275.987 211.54Z" fill="currentColor"/> <path d="M103.258 390.803C116.333 389.338 119.248 420.143 105.462 425.775C92.2377 427.565 90.1148 394.705 103.258 390.803Z" fill="currentColor"/> <path d="M134.731 326.558C147.478 326.06 149.529 358.018 135.606 361.805C130.307 362.02 126.935 355.965 125.918 351.453C124.421 344.868 124.872 337.138 128.426 331.253C130.077 328.52 131.698 327.273 134.731 326.558Z" fill="currentColor"/> <path d="M101.249 333.532C114.201 331.835 117.315 362.44 103.753 368.432C98.879 369.422 95.2458 364.565 93.887 360.46C91.693 353.827 91.8545 345.967 94.886 339.615C96.2993 336.652 98.075 334.587 101.249 333.532Z" fill="currentColor"/> <path d="M99.8252 276.82C112.904 276.168 114.971 307.378 101.267 311.893C87.7815 312.593 86.6222 279.865 99.8252 276.82Z" fill="currentColor"/> <path d="M68.2935 341.042C82.1675 339.47 84.16 370.022 71.342 375.782C57.7358 378.12 55.4195 346.022 68.2935 341.042Z" fill="currentColor"/> <path d="M276.172 98.3579C297.73 97.3777 300.272 116.104 276.322 118.723C271.16 118.847 265.592 118.069 261.405 114.786C257.905 112.044 257.697 107.677 260.617 104.404C264.432 100.13 270.69 98.7222 276.172 98.3579Z" fill="currentColor"/> <path d="M341.525 123.585C363.57 122.104 367.165 140.535 344.14 143.737C338.703 144.035 333.17 143.679 328.595 140.537C321.327 135.547 326.287 128.178 332.725 125.693C336.035 124.416 338.017 124.065 341.525 123.585Z" fill="currentColor"/> <path d="M323.037 59.5925C345.28 58.781 346.15 78.2855 322.612 79.9245C300.495 80.5927 298.195 62.0975 323.037 59.5925Z" fill="currentColor"/> <path d="M389.177 84.8523C396.105 84.3903 411.942 87.9958 404.675 98.776C402.032 102.692 394.723 104.596 390.078 105.023C384.875 105.158 379.763 104.873 375.42 101.894C368.23 96.9588 372.758 89.681 379.185 87.082C382.845 85.6025 385.327 85.1713 389.177 84.8523Z" fill="currentColor"/> <path d="M229.068 396.095C246.948 396.265 233.117 421.16 215.458 423.03C197.82 423.005 210.554 398.223 229.068 396.095Z" fill="currentColor"/> <path d="M251.165 299.56C256.287 298.977 261.21 300.302 266.203 302.607C270.958 304.805 280.96 311.99 277.953 318.547C276.938 320.765 274.033 321.827 271.718 322.47C262.503 323.875 247.495 317 244.329 307.48C243.926 306.042 243.924 304.442 244.762 303.157C246.317 300.775 248.591 300.105 251.165 299.56Z" fill="currentColor"/> <path d="M147.359 244.083C165.242 242.742 185.356 263.785 166.947 266.975C148.282 268.315 128.231 247.153 147.359 244.083Z" fill="currentColor"/> </g> </svg>`;


export function mountCookPanel(root: HTMLElement, options: { onCook: (choices: CookChoices) => void; onRandomise?: (choices: CookChoices) => void }): CookPanel {
  const choices: CookChoices = { ...DEFAULT_CHOICES };

  const chipButtons: { group: ChipGroup; option: string; button: HTMLButtonElement }[] = [];
  for (const group of GROUPS) {
    const field = document.createElement('fieldset');
    field.className = 'cook-group';
    const legend = document.createElement('legend');
    legend.textContent = group.label;
    const row = document.createElement('div');
    row.className = 'cook-chips';
    for (const option of group.options) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'chip';
      button.textContent = option;
      button.addEventListener('click', () => {
        choices[group.key] = option;
        paint();
      });
      row.append(button);
      chipButtons.push({ group, option, button });
    }
    field.append(legend, row);
    root.append(field);
  }

  // Wild level: a slider from Classic to Unhinged, with a line saying what it does.
  const wild = document.createElement('label');
  wild.className = 'cook-group cook-slider';
  const name = document.createElement('span');
  name.className = 'cook-label';
  name.textContent = 'Wild level';
  const input = document.createElement('input');
  input.type = 'range';
  input.min = '0';
  input.max = '100';
  input.step = '1';
  input.addEventListener('input', () => {
    choices.wild = Number(input.value);
    paint();
  });
  const ends = document.createElement('span');
  ends.className = 'cook-slider-ends';
  ends.innerHTML = '<span>Classic</span><span>Unhinged</span>';
  const note = document.createElement('span');
  note.className = 'cook-note';
  note.textContent = 'Unhinged gives you more unexpected results.';
  wild.append(name, input, ends, note);
  root.append(wild);

  // The foot of the panel: Cook, the main action, and a small Randomise beside it.
  const foot = document.createElement('div');
  foot.className = 'cook-foot';
  const cook = document.createElement('button');
  cook.type = 'button';
  cook.className = 'cook-go';
  cook.textContent = 'Cook';
  cook.disabled = true;
  cook.addEventListener('click', () => options.onCook({ ...choices }));
  // Randomise (Group 4, in place of Reset): a random course, taste and wild level. The table stays.
  const reset = document.createElement('button');
  reset.type = 'button';
  reset.className = 'cook-reset';
  reset.setAttribute('aria-label', 'Randomise the choices');
  reset.title = 'Randomise';
  reset.innerHTML = RANDOM_ICON;
  reset.addEventListener('click', () => {
    const any = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];
    for (const group of GROUPS) choices[group.key] = any(group.options.filter((option) => option !== choices[group.key]));
    choices.wild = Math.round(Math.random() * 20) * 5;
    paint();
    options.onRandomise?.({ ...choices });
  });
  foot.append(cook, reset);
  root.append(foot);
  const error = document.createElement('p');
  error.className = 'cook-error';
  error.setAttribute('role', 'status');
  root.append(error);

  /** Show the current choices on the controls. */
  function paint(): void {
    for (const { group, option, button } of chipButtons) {
      const on = choices[group.key] === option;
      button.toggleAttribute('data-on', on);
      button.setAttribute('aria-pressed', String(on));
    }
    input.value = String(choices.wild);
    // The filled part of the track follows the value.
    input.style.setProperty('--fill', `${choices.wild}%`);
    reset.disabled = false;
  }
  let canCook = false;
  paint();

  let busy = false;
  const refresh = () => {
    cook.disabled = !canCook || busy;
    cook.textContent = busy ? 'Cooking' : 'Cook';
    cook.dataset.busy = String(busy);
    cook.setAttribute('aria-busy', String(busy));
  };
  return {
    choices: () => ({ ...choices }),
    setCanCook: (can) => ((canCook = can), refresh(), paint()),
    showError: (text) => {
      error.textContent = text;
      error.hidden = !text;
    },
    setBusy: (on) => ((busy = on), refresh()),
  };
}
