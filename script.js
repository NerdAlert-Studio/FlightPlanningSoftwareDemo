/****************************************************************************
 * GLOBALS & DATA STRUCTURES
 ****************************************************************************/

// Current "mode" for labeling hexes or setting E-values ("start", "end", "nogo", "checkpoint", "setEValue", or null)
let currentMode = null;

// Toggling between Distance (dValue) and Energy (eValue) in pathfinding
let useDistance = true; // default = distance mode

// Set EValue
let currentEValue = 50;

// 2D array to map [row][col] to hexDiv
let hexDivMap = []; 

// Grid data structure.
// hexGrid[row][col] => { dValue, eValue, isNoGo, isStart, isEnd, isCheckpoint, etc. }
let hexGrid = [];

// keep references to all hex <div>s for quick clearing.
let allHexCells = [];

// Dimensions for the grid
const hexRows = 47;
let hexCols = 0;

// Whether the grid (hex <div>s) is visible or hidden
let gridVisible = true;

/**
 * Global variable to track if the mouse button is currently held down (for drag).
 * Attach event listeners to always track mouse-up/down.
 */
let mouseIsDown = false;
window.addEventListener("mousedown", () => {
  mouseIsDown = true;
});
window.addEventListener("mouseup", () => {
  mouseIsDown = false;
});

/**
 * Current pathfinding algorithm ('dijkstra' or 'astar')
 */
let currentAlgorithm = 'dijkstra'; // default to Dijkstra's

/**
 * Toggle-Grid button listener.
 * shows/hides the hex cells.
 */
document.addEventListener("DOMContentLoaded", () => {
  const toggleGridButton = document.getElementById("btn-toggle-grid");
  if (toggleGridButton) {
    toggleGridButton.addEventListener("click", () => {
      gridVisible = !gridVisible;
      toggleGridButton.textContent = gridVisible ? "Hide Grid" : "Show Grid";

      // Show or hide all hex cells
      allHexCells.forEach((hexDiv) => {
        hexDiv.style.display = gridVisible ? "block" : "none";
      });
    });
  }
});

/****************************************************************************
 * WINDOW ONLOAD - SETUP
 ****************************************************************************/
window.onload = () => {
  setupToolbar();
  createHexGrid();
};

/****************************************************************************
 * 1. SETUP TOOLBAR BUTTONS
 ****************************************************************************/
function setupToolbar() {
  // Basic labeling modes
  const btnStart = document.getElementById("btn-start");
  const btnEnd = document.getElementById("btn-end");
  const btnNoGo = document.getElementById("btn-nogo");
  const btnCheckpoint = document.getElementById("btn-checkpoint");
  const btnClear = document.getElementById("btn-clear");

  if (btnStart) {
    btnStart.addEventListener("click", () => {
      currentMode = "start";
      setActiveButton(btnStart);
    });
  }

  if (btnEnd) {
    btnEnd.addEventListener("click", () => {
      currentMode = "end";
      setActiveButton(btnEnd);
    });
  }

  if (btnNoGo) {
    btnNoGo.addEventListener("click", () => {
      currentMode = "nogo";
      setActiveButton(btnNoGo);
    });
  }

  if (btnCheckpoint) {
    btnCheckpoint.addEventListener("click", () => {
      currentMode = "checkpoint";
      setActiveButton(btnCheckpoint);
    });
  }

  if (btnClear) {
    btnClear.addEventListener("click", () => {
      clearGridColours();
      currentMode = null;
      removeActiveButtons();
    });
  }

  // E-value assignment buttons
  const btnE20 = document.getElementById("btn-e20");
  const btnE30 = document.getElementById("btn-e30");
  const btnE50 = document.getElementById("btn-e50");
  const btnE60 = document.getElementById("btn-e60");
  const btnE100 = document.getElementById("btn-e100");

  if (btnE20) {
    btnE20.addEventListener("click", () => {
      currentMode = "setEValue";
      currentEValue = 20;
      setActiveButton(btnE20);
    });
  }

  if (btnE30) {
    btnE30.addEventListener("click", () => {
      currentMode = "setEValue";
      currentEValue = 30;
      setActiveButton(btnE30);
    });
  }

  if (btnE60) {
    btnE60.addEventListener("click", () => {
      currentMode = "setEValue";
      currentEValue = 60;
      setActiveButton(btnE60);
    });
  }

  if (btnE100) {
    btnE100.addEventListener("click", () => {
      currentMode = "setEValue";
      currentEValue = 100;
      setActiveButton(btnE100);
    });
  }

  if (btnE50) {
    btnE50.addEventListener("click", () => {
      currentMode = "setEValue";
      currentEValue = 50;
      setActiveButton(btnE50);
    });
  }

  // Toggle Distance vs Energy
  const btnToggleCost = document.getElementById("btn-toggle-cost");
  if (btnToggleCost) {
    btnToggleCost.addEventListener("click", () => {
      useDistance = !useDistance;
      btnToggleCost.textContent = useDistance ? "Mode: Distance (D)" : "Mode: Energy (E)";
    });
  }

  // Pathfinding Algorithm Selection
  const algorithmSelect = document.getElementById("algorithm-select");
  if (algorithmSelect) {
    algorithmSelect.addEventListener("change", () => {
      currentAlgorithm = algorithmSelect.value; // 'dijkstra' or 'astar'
    });
  }

  // Find Route
  const btnFindRoute = document.getElementById("btn-find-route");
  if (btnFindRoute) {
    btnFindRoute.addEventListener("click", () => {
      findRouteWithCheckpoints();
    });
  }

  // Save and Load Buttons
  const btnSaveData = document.getElementById("btn-save-data");
  const btnLoadData = document.getElementById("btn-load-data");

  if (btnSaveData) {
    btnSaveData.addEventListener("click", () => {
      saveHexData();
    });
  }

  if (btnLoadData) {
    btnLoadData.addEventListener("click", () => {
      loadHexData();
    });
  }

  // Export Buttons
  const btnExportJSON = document.getElementById("btn-export-json");
  const btnExportCSV = document.getElementById("btn-export-csv");

  if (btnExportJSON) {
    btnExportJSON.addEventListener("click", () => {
      exportAsJSON();
    });
  }

  if (btnExportCSV) {
    btnExportCSV.addEventListener("click", () => {
      exportAsCSV();
    });
  }
}

/**
 * Helper function to set active button styling
 */
function setActiveButton(activeBtn) {
  removeActiveButtons();
  if (activeBtn) {
    activeBtn.classList.add("active");
  }
}

/**
 * Helper function to remove active styling from all buttons
 */
function removeActiveButtons() {
  const buttons = document.querySelectorAll("#toolbar button");
  buttons.forEach(btn => btn.classList.remove("active"));
}

/****************************************************************************
 * 2. CREATE THE HEX GRID (DOM + DATA)
 ****************************************************************************/
function createHexGrid() {
  const mapContainer = document.getElementById("map-container");
  const mapImage = document.getElementById("map-image");
  
  // Ensure the image is loaded to get accurate dimensions
  mapImage.onload = () => {
    const containerWidth = mapContainer.clientWidth;
    const containerHeight = mapContainer.clientHeight;

    // Calculate the size of each hex based on container height and number of rows
    const cellHeight = containerHeight / (1 + 0.75 * (hexRows - 1));
    const size = cellHeight / 2; // size is half of cellHeight

    // Calculate width based on size
    const cellWidth = Math.sqrt(3) * size;

    // Spacing calculations
    const horizontalSpacing = cellWidth;
    const verticalSpacing = cellHeight * 0.75;

    // Calculate the number of columns that fit within containerWidth
    hexCols = Math.ceil(containerWidth / horizontalSpacing) + 1;

    console.log(`Hex Grid Dimensions: Rows = ${hexRows}, Columns = ${hexCols}`);

    // Initialise the hexGrid and hexDivMap data arrays
    for (let r = 0; r < hexRows; r++) {
      hexGrid[r] = [];
      hexDivMap[r] = []; // Initialize the row in hexDivMap
      for (let c = 0; c < hexCols; c++) {
        hexGrid[r][c] = {
          dValue: 150, // distance cost
          eValue: 50,   // default energy cost
          isNoGo: false,
          isStart: false,
          isEnd: false,
          isCheckpoint: false
        };
        hexDivMap[r][c] = null; // Placeholder, will be assigned during DOM creation
      }
    }

    // Create a DocumentFragment to batch append hexDivs
    const fragment = document.createDocumentFragment();

    for (let row = 0; row < hexRows; row++) {
      for (let col = 0; col < hexCols; col++) {
        const hexDiv = document.createElement("div");
        hexDiv.classList.add("hex-cell");

        // Store row/col in dataset for reference
        hexDiv.dataset.row = row;
        hexDiv.dataset.col = col;

        // Calculate horizontal offset for odd rows
        const xOffset = (row % 2 === 1) ? (horizontalSpacing / 2) : 0;

        const xPos = col * horizontalSpacing + xOffset;
        const yPos = row * verticalSpacing;

        // Apply sizing & positioning
        hexDiv.style.width = `${cellWidth}px`;
        hexDiv.style.height = `${cellHeight}px`;
        hexDiv.style.left = `${xPos}px`;
        hexDiv.style.top = `${yPos}px`;
        fragment.appendChild(hexDiv);
        allHexCells.push(hexDiv);
        hexDivMap[row][col] = hexDiv; // Cache the reference
      }
    }

    mapContainer.appendChild(fragment); // Append all hexDivs at once
    mapContainer.removeEventListener("click", handleClick);
    mapContainer.removeEventListener("mousedown", handleMouseDown);
    mapContainer.removeEventListener("mouseover", handleMouseOver);
    mapContainer.removeEventListener("contextmenu", handleContextMenu);

    // Define handler functions
    function handleClick(event) {
      const hexDiv = event.target.closest(".hex-cell");
      if (hexDiv) {
        colourHex(hexDiv);
      }
    }

    function handleMouseDown(event) {
      const hexDiv = event.target.closest(".hex-cell");
      if (hexDiv) {
        event.preventDefault(); // Prevent text selection
        colourHex(hexDiv);
      }
    }

    function handleMouseOver(event) {
      if (mouseIsDown) {
        const hexDiv = event.target.closest(".hex-cell");
        if (hexDiv) {
          colourHex(hexDiv);
        }
      }
    }

    function handleContextMenu(event) {
      const hexDiv = event.target.closest(".hex-cell");
      if (hexDiv) {
        event.preventDefault(); // Prevent default context menu
        const r = parseInt(hexDiv.dataset.row, 10);
        const c = parseInt(hexDiv.dataset.col, 10);
        alert(`E-Value for this hex: ${hexGrid[r][c].eValue}`);
      }
    }

    // Attach event listeners
    mapContainer.addEventListener("click", handleClick);
    mapContainer.addEventListener("mousedown", handleMouseDown);
    mapContainer.addEventListener("mouseover", handleMouseOver);
    mapContainer.addEventListener("contextmenu", handleContextMenu);
  };

  // Trigger the onload function if the image is already cached
  if (mapImage.complete) {
    mapImage.onload();
  }
}


/****************************************************************************
 * 3. colourHex() - Applies the current mode to the hex
 ****************************************************************************/
function colourHex(hexDiv) {
  const row = parseInt(hexDiv.dataset.row, 10);
  const col = parseInt(hexDiv.dataset.col, 10);

  switch (currentMode) {
    case "start":
      resetStartFlag(row, col);
      hexDiv.style.backgroundColor = "rgba(0,255,0,0.5)"; // green
      hexGrid[row][col].isStart = true;
      console.log(`Set Start at Row: ${row}, Col: ${col}`);
      break;

    case "end":
      resetEndFlag(row, col);
      hexDiv.style.backgroundColor = "rgba(255,0,0,0.5)"; // red
      hexGrid[row][col].isEnd = true;
      break;

    case "nogo":
      hexDiv.style.backgroundColor = "rgba(0,0,0,0.5)";   // black
      hexGrid[row][col].isNoGo = true;
      break;

    case "checkpoint":
      hexDiv.style.backgroundColor = "rgba(0,0,255,0.5)"; // blue
      hexGrid[row][col].isCheckpoint = true;
      break;

    case "setEValue":
      // Assign the chosen eValue to this cell, colour accordingly
      hexGrid[row][col].eValue = currentEValue;
      switch (currentEValue) {
        case 20:
          hexDiv.style.backgroundColor = "rgba(247, 162, 52, 0.48)";
          break;
        case 30:
          hexDiv.style.backgroundColor = "rgba(230, 239, 132, 0.48)";
          break;
        case 50:
          hexDiv.style.backgroundColor = "rgba(110, 187, 238, 0.48)";
          break;
        case 60:
          hexDiv.style.backgroundColor = "rgba(207, 250, 128, 0.48)";
          break;
        case 100:
          hexDiv.style.backgroundColor = "rgba(63, 232, 63, 0.48)";
          break;
        default:
          hexDiv.style.backgroundColor = "rgba(238, 210, 110, 0.48)";
          break;
      }
      break;

    default:
      // No mode or unrecognised
      break;
  }
}

/****************************************************************************
 * Helpers for ONE start or ONE end
 ****************************************************************************/
function resetStartFlag(currentRow, currentCol) {
  // Ensure only one "Start" hex at a time
  for (let r = 0; r < hexRows; r++) {
    for (let c = 0; c < hexCols; c++) {
      if (hexGrid[r][c].isStart && !(r === currentRow && c === currentCol)) {
        hexGrid[r][c].isStart = false;
        // Update the UI using hexDivMap
        const hexDiv = hexDivMap[r][c];
        if (hexDiv) {
          resetHexColour(hexDiv, r, c);
        }
      }
    }
  }
}

function resetEndFlag(currentRow, currentCol) {
  // Ensure only one "End" hex at a time
  for (let r = 0; r < hexRows; r++) {
    for (let c = 0; c < hexCols; c++) {
      if (hexGrid[r][c].isEnd && !(r === currentRow && c === currentCol)) {
        hexGrid[r][c].isEnd = false;
        // Update the UI using hexDivMap
        const hexDiv = hexDivMap[r][c];
        if (hexDiv) {
          resetHexColour(hexDiv, r, c);
        }
      }
    }
  }
}

/**
 * Helper to reset hex colour based on its current state
 */
function resetHexColour(hexDiv, r, c) {
  // Remove any path-related classes
  hexDiv.classList.remove("path-distance", "path-energy");

  const cell = hexGrid[r][c];
  if (cell.isNoGo) {
    hexDiv.style.backgroundColor = "rgba(0,0,0,0.5)";
  } else if (cell.isStart) {
    hexDiv.style.backgroundColor = "rgba(0,255,0,0.5)";
  } else if (cell.isEnd) {
    hexDiv.style.backgroundColor = "rgba(255,0,0,0.5)";
  } else if (cell.isCheckpoint) {
    hexDiv.style.backgroundColor = "rgba(0,0,255,0.5)";
  } else {
    // Set colour based on eValue
    switch (cell.eValue) {
      case 20:
        hexDiv.style.backgroundColor = "rgba(247, 162, 52, 0.48)";
        break;
      case 30:
        hexDiv.style.backgroundColor = "rgba(230, 239, 132, 0.48)";
        break;
      case 50:
        hexDiv.style.backgroundColor = "rgba(110, 187, 238, 0.48)";
        break;
      case 60:
        hexDiv.style.backgroundColor = "rgba(207, 250, 128, 0.48)";
        break;
      case 100:
        hexDiv.style.backgroundColor = "rgba(63, 232, 63, 0.48)";
        break;
      default:
        hexDiv.style.backgroundColor = "rgba(238, 210, 110, 0.48)";
        break;
    }
  }
}


/****************************************************************************
 * 4. clearGridColours() - Reset everything to default
 ****************************************************************************/
function clearGridColours() {
  // Reset all data flags and reset colors using resetHexColour
  for (let r = 0; r < hexRows; r++) {
    for (let c = 0; c < hexCols; c++) {
      hexGrid[r][c].isNoGo = false;
      hexGrid[r][c].isStart = false;
      hexGrid[r][c].isEnd = false;
      hexGrid[r][c].isCheckpoint = false;
      hexGrid[r][c].eValue = 50; // default eValue reset

      const hexDiv = hexDivMap[r][c];
      if (hexDiv) {
        resetHexColour(hexDiv, r, c);
      }
    }
  }

  // Clear any route cost display if it exists
  const routeCost = document.getElementById("route-cost-display");
  if (routeCost) {
    routeCost.textContent = "";
  }

  // Clear the current route path
  currentRoutePath = [];
}

/****************************************************************************
 * 5. NEIGHBOUR CALCULATION (Pointy-Top Hexagons)
 ****************************************************************************/
function getNeighbours(r, c) {
  const neighbours = [];
  
  let directions;
  if (r % 2 === 0) {
    // Even row offsets
    directions = [
      { dr: -1, dc: 0 },
      { dr: -1, dc: -1 },
      { dr: 0, dc: -1 },
      { dr: 1, dc: -1 },
      { dr: 1, dc: 0 },
      { dr: 0, dc: 1 }
    ];
  } else {
    // Odd row offsets
    directions = [
      { dr: -1, dc: 1 },
      { dr: -1, dc: 0 },
      { dr: 0, dc: -1 },
      { dr: 1, dc: 0 },
      { dr: 1, dc: 1 },
      { dr: 0, dc: 1 }
    ];
  }
  
  for (const dir of directions) {
    const nr = r + dir.dr;
    const nc = c + dir.dc;
    if (nr >= 0 && nr < hexRows && nc >= 0 && nc < hexCols) {
      neighbours.push({ r: nr, c: nc });
    }
  }
  
  return neighbours;
}

/****************************************************************************
 * 6. DIJKSTRA PATHFINDING (DISTANCE OR ENERGY)
 ****************************************************************************/
function dijkstraDistance(startR, startC, endR, endC) {
  // Initialise distance and previous arrays
  const dist = Array.from({ length: hexRows }, () => Array(hexCols).fill(Infinity));
  const prev = Array.from({ length: hexRows }, () => Array(hexCols).fill(null));

  dist[startR][startC] = 0;

  const visited = new Set();
  const pq = [{ r: startR, c: startC, dist: 0 }];

  while (pq.length > 0) {
    // Sort by distance ascending
    pq.sort((a, b) => a.dist - b.dist);
    const current = pq.shift();
    const { r, c, dist: currentDist } = current;

    const id = `${r},${c}`;
    if (visited.has(id)) continue;
    visited.add(id);

    // If reached the end, stop
    if (r === endR && c === endC) {
      break;
    }

    // Explore neighbours
    const nbrs = getNeighbours(r, c);
    for (const n of nbrs) {
      if (hexGrid[n.r][n.c].isNoGo) continue; // skip blocked

      // cost depends on using distance or energy
      const cost = useDistance ? hexGrid[n.r][n.c].dValue : hexGrid[n.r][n.c].eValue;
      const altDist = currentDist + cost;

      if (altDist < dist[n.r][n.c]) {
        dist[n.r][n.c] = altDist;
        prev[n.r][n.c] = { r, c };
        pq.push({ r: n.r, c: n.c, dist: altDist });
      }
    }
  }

  return { dist, prev };
}

/****************************************************************************
 * 6.1. OFFSET TO CUBE COORDINATES
 ****************************************************************************/
/**
 * Converts offset coordinates (row, col) to cube coordinates (x, y, z).
 * Assumes pointy-top hexagons.
 * @param {number} r - Row index.
 * @param {number} c - Column index.
 * @returns {Object} - Cube coordinates { x, y, z }.
 */
function offsetToCube(r, c) {
  const x = c - Math.floor(r / 2);
  const z = r;
  const y = -x - z;
  return { x, y, z };
}

/****************************************************************************
 * 6.2. HEX DISTANCE CALCULATION
 ****************************************************************************/
/**
 * Calculates the hex distance between two cells using cube coordinates.
 * @param {number} r1 - Row index of the first cell.
 * @param {number} c1 - Column index of the first cell.
 * @param {number} r2 - Row index of the second cell.
 * @param {number} c2 - Column index of the second cell.
 * @returns {number} - Hex distance between the two cells.
 */
function hexDistance(r1, c1, r2, c2) {
  const a = offsetToCube(r1, c1);
  const b = offsetToCube(r2, c2);
  return Math.max(
    Math.abs(a.x - b.x),
    Math.abs(a.y - b.y),
    Math.abs(a.z - b.z)
  );
}

/****************************************************************************
 * 7. HEURISTIC FUNCTIONS FOR A* PATHFINDING
 ****************************************************************************/

/**
 * Calculates an energy-based heuristic.
 * Ensures the heuristic is admissible by using the minimum energy per step.
 * @param {number} r1 - Current row.
 * @param {number} c1 - Current column.
 * @param {number} r2 - Target row.
 * @param {number} c2 - Target column.
 * @returns {number} - Estimated minimum energy to reach the target.
 */
function energyHeuristic(r1, c1, r2, c2) {
  const distance = hexDistance(r1, c1, r2, c2);
  const minEnergyPerStep = 20; // Adjust based on your minimum eValue
  return distance * minEnergyPerStep;
}

/**
 * Selects the appropriate heuristic based on the current mode.
 * @param {number} r - Current row.
 * @param {number} c - Current column.
 * @param {number} endR - Target row.
 * @param {number} endC - Target column.
 * @returns {number} - Heuristic value.
 */
function getHeuristic(r, c, endR, endC) {
  if (useDistance) {
    return hexDistance(r, c, endR, endC);
  } else {
    return energyHeuristic(r, c, endR, endC);
  }
}

/****************************************************************************
 * 7.1. MINIMUM HEAP IMPLEMENTATION FOR PRIORITY QUEUE
 ****************************************************************************/
class MinHeap {
  constructor() {
    this.heap = [];
  }

  push(element) {
    this.heap.push(element);
    this.bubbleUp(this.heap.length - 1);
  }

  pop() {
    if (this.heap.length === 0) return null;
    if (this.heap.length === 1) return this.heap.pop();
    const top = this.heap[0];
    this.heap[0] = this.heap.pop();
    this.bubbleDown(0);
    return top;
  }

  bubbleUp(index) {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.heap[parentIndex].f <= this.heap[index].f) break;
      [this.heap[parentIndex], this.heap[index]] = [this.heap[index], this.heap[parentIndex]];
      index = parentIndex;
    }
  }

  bubbleDown(index) {
    const length = this.heap.length;
    while (true) {
      let left = 2 * index + 1;
      let right = 2 * index + 2;
      let smallest = index;

      if (left < length && this.heap[left].f < this.heap[smallest].f) smallest = left;
      if (right < length && this.heap[right].f < this.heap[smallest].f) smallest = right;

      if (smallest === index) break;
      [this.heap[smallest], this.heap[index]] = [this.heap[index], this.heap[smallest]];
      index = smallest;
    }
  }

  isEmpty() {
    return this.heap.length === 0;
  }
}

/****************************************************************************
 * 8. A* PATHFINDING (DISTANCE OR ENERGY)
 ****************************************************************************/
/**
 * Implements the A* pathfinding algorithm.
 * @param {number} startR - Starting row.
 * @param {number} startC - Starting column.
 * @param {number} endR - Ending row.
 * @param {number} endC - Ending column.
 * @returns {Object} - Contains 'dist' and 'prev' arrays.
 */
function aStar(startR, startC, endR, endC) {
  // Initialise distance and previous arrays
  const dist = Array.from({ length: hexRows }, () => Array(hexCols).fill(Infinity));
  const prev = Array.from({ length: hexRows }, () => Array(hexCols).fill(null));

  dist[startR][startC] = 0;

  // Priority Queue implemented with a binary heap for efficiency
  const openSet = new MinHeap();
  openSet.push({ r: startR, c: startC, f: getHeuristic(startR, startC, endR, endC) });

  // To keep track of visited nodes
  const closedSet = new Set();

  while (!openSet.isEmpty()) {
    const current = openSet.pop();
    const { r, c } = current;
    const currentId = `${r},${c}`;

    if (closedSet.has(currentId)) continue;
    closedSet.add(currentId);

    // If reached the end, stop
    if (r === endR && c === endC) {
      break;
    }

    // Explore neighbours
    const neighbours = getNeighbours(r, c);
    for (const neighbour of neighbours) {
      const { r: nr, c: nc } = neighbour;

      if (hexGrid[nr][nc].isNoGo) continue; // Skip blocked cells

      const cost = useDistance ? hexGrid[nr][nc].dValue : hexGrid[nr][nc].eValue;
      const tentativeG = dist[r][c] + cost;

      if (tentativeG < dist[nr][nc]) {
        dist[nr][nc] = tentativeG;
        prev[nr][nc] = { r, c };
        const heuristic = getHeuristic(nr, nc, endR, endC);
        const f = tentativeG + heuristic;
        openSet.push({ r: nr, c: nc, f });
      }
    }
  }

  return { dist, prev };
}


/****************************************************************************
 * 9. RECONSTRUCT PATH FROM PREV[][]
 ****************************************************************************/
function reconstructPath(dist, prev, endR, endC) {
  // If no path, distance is Infinity
  if (dist[endR][endC] === Infinity) {
    return null;
  }

  const path = [];
  let cur = { r: endR, c: endC };
  while (cur) {
    path.push(cur);
    const p = prev[cur.r][cur.c];
    if (!p) break; // reached start
    cur = p;
  }
  return path.reverse();
}

/****************************************************************************
 * 10. MULTI-SEGMENT ROUTE (CHECKPOINTS)
 *    i.e. Start -> C1 -> C2 -> ... -> End in order placed
 ****************************************************************************/
let currentRoutePath = []; // Global variable to store the current route path

function findRouteWithCheckpoints() {
  const routeCostDisplay = document.getElementById("route-cost-display");
  if (routeCostDisplay) {
    routeCostDisplay.textContent = ""; // reset display
  }

  // Gather the start, end, and any checkpoints from hexGrid
  let startR = null, startC = null;
  let endR = null, endC = null;
  const checkpoints = [];

  for (let r = 0; r < hexRows; r++) {
    for (let c = 0; c < hexCols; c++) {
      const cell = hexGrid[r][c];
      if (cell.isStart) {
        startR = r;
        startC = c;
      }
      if (cell.isEnd) {
        endR = r;
        endC = c;
      }
      if (cell.isCheckpoint) {
        checkpoints.push({ r, c });
      }
    }
  }

  if (startR === null || startC === null) {
    alert("No Start cell found!");
    return;
  }
  if (endR === null || endC === null) {
    alert("No End cell found!");
    return;
  }

  // Waypoints: Start -> checkpoint(s) -> End
  const waypoints = [{ r: startR, c: startC }, ...checkpoints, { r: endR, c: endC }];
  let totalPath = [];
  let totalCost = 0;

  // Track total runtime
  let totalRuntimeMs = 0;

  for (let i = 0; i < waypoints.length - 1; i++) {
    const s = waypoints[i];
    const t = waypoints[i + 1];

    // Start the timer
    const startTime = performance.now();

    let result;
    if (currentAlgorithm === 'dijkstra') {
      result = dijkstraDistance(s.r, s.c, t.r, t.c);
    } else if (currentAlgorithm === 'astar') {
      result = aStar(s.r, s.c, t.r, t.c);
    }

    // End the timer
    const endTime = performance.now();
    // Calculate the runtime for this segment
    const segmentRuntime = endTime - startTime;
    totalRuntimeMs += segmentRuntime;

    const { dist, prev } = result;
    const segmentPath = reconstructPath(dist, prev, t.r, t.c);

    if (!segmentPath) {
      alert("No path found (blocked or missing route)!");
      return;
    }

    totalCost += dist[t.r][t.c];

    // Merge path segments
    if (i === 0) {
      totalPath = segmentPath;
    } else {
      totalPath.pop(); 
      totalPath = [...totalPath, ...segmentPath];
    }
  }

  // Highlight final path
  highlightPath(totalPath);

  // Display final total cost + runtime
  if (routeCostDisplay) {
    const costType = useDistance ? "Distance" : "Energy";
    routeCostDisplay.textContent = 
      `Total ${costType} Cost: ${totalCost}\n` +
      `Total Runtime: ${totalRuntimeMs.toFixed(2)} ms`;
  }
}


/****************************************************************************
 * 11. HIGHLIGHT THE FINAL PATH
 ****************************************************************************/
function highlightPath(path) {
  if (!path || path.length === 0) return;

  // Clear previous highlights
  allHexCells.forEach(hexDiv => {
    const r = parseInt(hexDiv.dataset.row, 10);
    const c = parseInt(hexDiv.dataset.col, 10);
    resetHexColour(hexDiv, r, c);
  });

  // Store the current route path
  currentRoutePath = path;

  // Determine the class based on mode
  const pathClass = useDistance ? "path-distance" : "path-energy";

  for (const cell of path) {
    const r = cell.r;
    const c = cell.c;
    const hexDiv = hexDivMap[r][c];
    if (hexDiv) {
      hexDiv.classList.add(pathClass);
    }
  }
}

/****************************************************************************
 * 12. SAVE AND LOAD DATA FUNCTIONS
 ****************************************************************************/

/**
 * Save the current hexGrid data to localStorage
 */
function saveHexData() {
  // Convert the entire hexGrid 2D array into a JSON string.
  const jsonData = JSON.stringify(hexGrid);
  
  // Save it in the browser's localStorage under a key, e.g., "hexData".
  localStorage.setItem("hexData", jsonData);
  
  alert("Hex data saved locally!");
}

/**
 * Load the hexGrid data from localStorage
 */
function loadHexData() {
  // Pull the string from localStorage
  const jsonData = localStorage.getItem("hexData");
  
  // If nothing found, alert and return
  if (!jsonData) {
    alert("No saved data found in localStorage!");
    return;
  }
  
  // Parse it
  const savedGrid = JSON.parse(jsonData);
  
  // Validate the savedGrid structure
  if (!Array.isArray(savedGrid) || savedGrid.length !== hexRows) {
    alert("Saved data is invalid or incompatible!");
    return;
  }

  // Assign to hexGrid
  // (Assumes savedGrid has the same rows and cols)
  for (let r = 0; r < hexRows; r++) {
    if (!Array.isArray(savedGrid[r]) || savedGrid[r].length !== hexCols) {
      alert("Saved data is invalid or incompatible!");
      return;
    }
    for (let c = 0; c < hexCols; c++) {
      hexGrid[r][c] = savedGrid[r][c];
    }
  }
  
  // Redraw the hexes to reflect the loaded data
  reDrawFromHexGrid();
  
  alert("Hex data loaded from localStorage!");
}

/**
 * Re-draw the hexes based on the current hexGrid data
 */
function reDrawFromHexGrid() {
  allHexCells.forEach((hexDiv) => {
    const r = parseInt(hexDiv.dataset.row, 10);
    const c = parseInt(hexDiv.dataset.col, 10);
    const cell = hexGrid[r][c];

    // Decide colour based on cell's data
    if (cell.isNoGo) {
      hexDiv.style.backgroundColor = "rgba(0,0,0,0.5)";
    } else if (cell.isStart) {
      hexDiv.style.backgroundColor = "rgba(0,255,0,0.5)";
    } else if (cell.isEnd) {
      hexDiv.style.backgroundColor = "rgba(255,0,0,0.5)";
    } else if (cell.isCheckpoint) {
      hexDiv.style.backgroundColor = "rgba(0,0,255,0.5)";
    } else {
      // Set colour based on eValue
      switch (cell.eValue) {
        case 20:
          hexDiv.style.backgroundColor = "rgba(247, 162, 52, 0.48)";
          break;
        case 30:
          hexDiv.style.backgroundColor = "rgba(230, 239, 132, 0.48)";
          break;
        case 50:
          hexDiv.style.backgroundColor = "rgba(110, 187, 238, 0.48)";
          break;
        case 60:
          hexDiv.style.backgroundColor = "rgba(207, 250, 128, 0.48)";
          break;
        case 100:
          hexDiv.style.backgroundColor = "rgba(63, 232, 63, 0.48)";
          break;
        default:
          hexDiv.style.backgroundColor = "rgba(238, 210, 110, 0.48)";
          break;
      }
    }
  });
}

/****************************************************************************
 * 13. EXPORT ROUTE DATA FUNCTION
 ****************************************************************************/
function exportRouteData() {
  if (!currentRoutePath || currentRoutePath.length === 0) {
    alert("No route to export! Please calculate a route first.");
    return;
  }

  // Prompt the user to choose between JSON and CSV
  const exportFormat = prompt("Enter export format: 'json' or 'csv'").toLowerCase();

  if (exportFormat === "json") {
    exportAsJSON();
  } else if (exportFormat === "csv") {
    exportAsCSV();
  } else {
    alert("Invalid format! Please enter 'json' or 'csv'.");
  }
}

/**
 * Helper function to export the route as a JSON file
 */
function exportAsJSON() {
  const routeData = {
    path: currentRoutePath,
    totalCost: calculateTotalCost(currentRoutePath)
  };

  const jsonString = JSON.stringify(routeData, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, "route.json");
}

/**
 * Helper function to export the route as a CSV file
 */
function exportAsCSV() {
  let csvContent = "Row,Column\n";

  currentRoutePath.forEach(cell => {
    csvContent += `${cell.r},${cell.c}\n`;
  });

  // Include total cost
  csvContent += `Total Cost,${calculateTotalCost(currentRoutePath)}\n`;

  // Properly encode the CSV content
  const encodedUri = "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent);
  triggerDownload(encodedUri, "route.csv");
}

/**
 * Helper function to calculate total cost of the route
 * Assumes that the total cost has been calculated in findRouteWithCheckpoints
 */
function calculateTotalCost(path) {
  let cost = 0;
  for (let i = 0; i < path.length; i++) {
    const r = path[i].r;
    const c = path[i].c;
    // Add the cost of the current cell
    cost += useDistance ? hexGrid[r][c].dValue : hexGrid[r][c].eValue;
  }
  return cost;
}

/**
 * Helper function to trigger the download of a file
 */
function triggerDownload(url, filename) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  alert(`Route exported as ${filename}!`);
}