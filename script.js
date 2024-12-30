/****************************************************************************
 * GLOBALS & DATA STRUCTURES
 ****************************************************************************/

// Current "mode" for labeling hexes or setting E-values ("start", "end", "nogo", "checkpoint", "setEValue", or null)
let currentMode = null;

// Toggling between Distance (dValue) and Energy (eValue) in pathfinding
let useDistance = true; // default = distance mode

// If we're in "setEValue" mode, which value are we assigning? (10,20,30,40,50)
let currentEValue = 50;

// Our grid data structure.
// hexGrid[row][col] => { dValue, eValue, isNoGo, isStart, isEnd, isCheckpoint, etc. }
let hexGrid = [];

// We'll keep references to all hex <div>s for quick clearing and toggling.
let allHexCells = [];

// Dimensions for the grid
const hexRows = 47;
let hexCols = 0;

// Whether the grid (hex <div>s) is visible or hidden
let gridVisible = true;

/**
 * Global variable to track if the mouse button is currently held down (for drag).
 * We attach event listeners on the window so we always track mouse-up/down anywhere.
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
 * Only shows/hides the hex cells, does NOT handle mouseIsDown logic anymore.
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
      clearGridColors();
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
      setActiveButton(btn60);
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

    // Use the global hexRows variable instead of declaring a new one
    // const hexRows = 47; // Remove this line

    // Calculate the size of each hex based on container height and number of rows
    // For pointy-up hexagons:
    // Total vertical space = H + (R - 1) * (3/4 * H) => H * (1 + 0.75 * (R -1))
    const cellHeight = containerHeight / (1 + 0.75 * (hexRows - 1));
    const size = cellHeight / 2; // size is half of cellHeight

    // Calculate width based on size
    const cellWidth = Math.sqrt(3) * size;

    // Spacing calculations
    const horizontalSpacing = cellWidth; // Corrected from cellWidth to 1.5 * cellWidth
    const verticalSpacing = cellHeight * 0.75; // 3/4 * H

    // Calculate the number of columns that fit within containerWidth
    hexCols = Math.ceil(containerWidth / horizontalSpacing) + 1; // Assign to global hexCols

    console.log(`Hex Grid Dimensions: Rows = ${hexRows}, Columns = ${hexCols}`);

    // Initialize the hexGrid data array
    for (let r = 0; r < hexRows; r++) {
      hexGrid[r] = [];
      for (let c = 0; c < hexCols; c++) {
        hexGrid[r][c] = {
          dValue: 150, // distance cost
          eValue: 10,   // energy cost
          isNoGo: false,
          isStart: false,
          isEnd: false,
          isCheckpoint: false
        };
      }
    }

    // Create DOM elements for each hex cell
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

        // Event listeners
        hexDiv.addEventListener("click", () => {
          colorHex(hexDiv);
        });

        hexDiv.addEventListener("mousedown", (e) => {
          e.preventDefault(); // Prevent text selection
          colorHex(hexDiv);
        });

        hexDiv.addEventListener("mouseover", () => {
          if (mouseIsDown) {
            colorHex(hexDiv);
          }
        });

        hexDiv.addEventListener("contextmenu", (e) => {
          e.preventDefault(); // Prevent default context menu
          const r = parseInt(hexDiv.dataset.row, 10);
          const c = parseInt(hexDiv.dataset.col, 10);
          alert(`E-Value for this hex: ${hexGrid[r][c].eValue}`);
        });

        mapContainer.appendChild(hexDiv);
        allHexCells.push(hexDiv);
      }
    }
  };

  // Trigger the onload function if the image is already cached
  if (mapImage.complete) {
    mapImage.onload();
  }
}

/****************************************************************************
 * 3. colorHex() - Applies the current mode to the hex
 ****************************************************************************/
function colorHex(hexDiv) {
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
      // Assign the chosen eValue to this cell, color accordingly
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
          hexDiv.style.backgroundColor = "rgba(110,187,238,0.48)";
          break;
      }
      break;

    default:
      // No mode or unrecognized
      break;
  }
}

/****************************************************************************
 * (Optional) Helpers if you only want ONE start or ONE end
 ****************************************************************************/
function resetStartFlag(currentRow, currentCol) {
  // Ensure only one "Start" hex at a time
  for (let r = 0; r < hexRows; r++) {
    for (let c = 0; c < hexCols; c++) {
      if (hexGrid[r][c].isStart && !(r === currentRow && c === currentCol)) {
        hexGrid[r][c].isStart = false;
        // Update the UI
        const hexDiv = document.querySelector(`.hex-cell[data-row='${r}'][data-col='${c}']`);
        if (hexDiv) {
          resetHexColor(hexDiv, r, c);
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
        // Update the UI
        const hexDiv = document.querySelector(`.hex-cell[data-row='${r}'][data-col='${c}']`);
        if (hexDiv) {
          resetHexColor(hexDiv, r, c);
        }
      }
    }
  }
}

/**
 * Helper to reset hex color based on its current state
 */
function resetHexColor(hexDiv, r, c) {
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
    // Set color based on eValue
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
        hexDiv.style.backgroundColor = "rgba(110, 187, 238, 0.41)";// default orange
    }
  }
}

/****************************************************************************
 * 4. clearGridColors() - Reset everything to default
 ****************************************************************************/
function clearGridColors() {
  // Revert all hex <div>s to default colour
  allHexCells.forEach((hexDiv) => {
    hexDiv.style.backgroundColor = "rgba(110,187,238,0.41)";
  });

  // Reset all data flags 
  for (let r = 0; r < hexRows; r++) {
    for (let c = 0; c < hexCols; c++) {
      hexGrid[r][c].isNoGo = false;
      hexGrid[r][c].isStart = false;
      hexGrid[r][c].isEnd = false;
      hexGrid[r][c].isCheckpoint = false;
      hexGrid[r][c].eValue = 10; // default eValue reset
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
 * 5. NEIGHBOR CALCULATION (Pointy-Top Hexagons)
 ****************************************************************************/
function getNeighbors(r, c) {
  const neighbors = [];

  // Directions for pointy-up hexagons
  const directions = [
    { dr: -1, dc: 0 },  // top-right
    { dr: -1, dc: 1 },  // top-left
    { dr: 0, dc: 1 },   // left
    { dr: 1, dc: 0 },   // bottom-left
    { dr: 1, dc: -1 },  // bottom-right
    { dr: 0, dc: -1 }   // right
  ];

  for (const dir of directions) {
    const nr = r + dir.dr;
    const nc = c + dir.dc;
    if (nr >= 0 && nr < hexRows && nc >= 0 && nc < hexCols) {
      neighbors.push({ r: nr, c: nc });
    }
  }

  return neighbors;
}

/****************************************************************************
 * 6. DIJKSTRA PATHFINDING (DISTANCE OR ENERGY)
 ****************************************************************************/
function dijkstraDistance(startR, startC, endR, endC) {
  // Initialize distance and previous arrays
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

    // If we've reached the end, we can stop
    if (r === endR && c === endC) {
      break;
    }

    // Explore neighbors
    const nbrs = getNeighbors(r, c);
    for (const n of nbrs) {
      if (hexGrid[n.r][n.c].isNoGo) continue; // skip blocked

      // cost depends on whether we're using distance or energy
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
 * 7. A* PATHFINDING (DISTANCE OR ENERGY)
 ****************************************************************************/
/**
 * Converts offset coordinates (row, col) to cube coordinates (x, y, z).
 * This is necessary for accurate distance calculations in hex grids.
 */
function offsetToCube(r, c) {
  const x = c - Math.floor(r / 2);
  const z = r;
  const y = -x - z;
  return { x, y, z };
}

/**
 * Calculates the hex distance between two cells using cube coordinates.
 */
function hexDistance(r1, c1, r2, c2) {
  const a = offsetToCube(r1, c1);
  const b = offsetToCube(r2, c2);
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.z - b.z));
}

/**
 * Implements the A* pathfinding algorithm.
 * @param {number} startR - Starting row.
 * @param {number} startC - Starting column.
 * @param {number} endR - Ending row.
 * @param {number} endC - Ending column.
 * @returns {Object} - Contains 'dist' and 'prev' arrays.
 */
function aStar(startR, startC, endR, endC) {
  // Initialize distance and previous arrays
  const dist = Array.from({ length: hexRows }, () => Array(hexCols).fill(Infinity));
  const prev = Array.from({ length: hexRows }, () => Array(hexCols).fill(null));

  dist[startR][startC] = 0;

  // Priority Queue implemented as an array for simplicity
  // Each element is an object { r, c, f }
  const openSet = [{ r: startR, c: startC, f: hexDistance(startR, startC, endR, endC) }];

  // To keep track of visited nodes
  const closedSet = new Set();

  while (openSet.length > 0) {
    // Sort the open set by f value (f = g + h) and select the node with the lowest f
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift();
    const { r, c } = current;
    const currentId = `${r},${c}`;

    if (closedSet.has(currentId)) continue;
    closedSet.add(currentId);

    // If we've reached the end, we can stop
    if (r === endR && c === endC) {
      break;
    }

    // Explore neighbors
    const neighbors = getNeighbors(r, c);
    for (const neighbor of neighbors) {
      const { r: nr, c: nc } = neighbor;

      if (hexGrid[nr][nc].isNoGo) continue; // Skip blocked cells

      const tentativeG = dist[r][c] + (useDistance ? hexGrid[nr][nc].dValue : hexGrid[nr][nc].eValue);

      if (tentativeG < dist[nr][nc]) {
        dist[nr][nc] = tentativeG;
        prev[nr][nc] = { r, c };
        const f = tentativeG + hexDistance(nr, nc, endR, endC);
        openSet.push({ r: nr, c: nc, f });
      }
    }
  }

  return { dist, prev };
}

/****************************************************************************
 * 8. RECONSTRUCT PATH FROM PREV[][]
 ****************************************************************************/
function reconstructPath(dist, prev, endR, endC) {
  // If we never found a path, dist is Infinity
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
 * 9. MULTI-SEGMENT ROUTE (CHECKPOINTS)
 *    i.e. Start -> C1 -> C2 -> ... -> End
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
        console.log(`Found Start at Row: ${r}, Col: ${c}`);
      }
      if (cell.isEnd) {
        endR = r;
        endC = c;
        console.log(`Found End at Row: ${r}, Col: ${c}`);
      }
      if (cell.isCheckpoint) {
        checkpoints.push({ r, c });
        console.log(`Found Checkpoint at Row: ${r}, Col: ${c}`);
      }
    }
  }

  // Basic validation
  if (startR === null || startC === null) {
    alert("No Start cell found!");
    return;
  }
  if (endR === null || endC === null) {
    alert("No End cell found!");
    return;
  }

  // Build a waypoint list: Start -> checkpoints... -> End
  const waypoints = [{ r: startR, c: startC }, ...checkpoints, { r: endR, c: endC }];
  let totalPath = [];
  let totalCost = 0;

  // For each consecutive pair in the waypoints array
  for (let i = 0; i < waypoints.length - 1; i++) {
    const s = waypoints[i];
    const t = waypoints[i + 1];

    let result;
    if (currentAlgorithm === 'dijkstra') {
      result = dijkstraDistance(s.r, s.c, t.r, t.c);
    } else if (currentAlgorithm === 'astar') {
      result = aStar(s.r, s.c, t.r, t.c);
    }

    const { dist, prev } = result;
    const segmentPath = reconstructPath(dist, prev, t.r, t.c);

    if (!segmentPath) {
      alert("No path found (blocked or missing route)!");
      return;
    }

    // Accumulate cost
    totalCost += dist[t.r][t.c];

    // Merge segments (avoid duplication of the connecting waypoint)
    if (i === 0) {
      // first segment in full
      totalPath = segmentPath;
    } else {
      // remove the last node from previous path to avoid duplication
      totalPath.pop();
      totalPath = [...totalPath, ...segmentPath];
    }
  }

  // Highlight final path
  highlightPath(totalPath);

  // Display final total cost
  if (routeCostDisplay) {
    const costType = useDistance ? "Distance" : "Energy";
    routeCostDisplay.textContent = `Total ${costType} Cost: ${totalCost}`;
  }
}

/****************************************************************************
 * 10. HIGHLIGHT THE FINAL PATH
 ****************************************************************************/
function highlightPath(path) {
  if (!path || path.length === 0) return;

  // Clear previous highlights
  allHexCells.forEach(hexDiv => {
    const r = parseInt(hexDiv.dataset.row, 10);
    const c = parseInt(hexDiv.dataset.col, 10);
    const cell = hexGrid[r][c];
    resetHexColor(hexDiv, r, c);
  });

  // Store the current route path
  currentRoutePath = path;

  // Use one color for distance, another for energy
  const pathColor = useDistance
    ? "rgba(255, 255, 0, 0.6)"   // yellow
    : "rgba(255, 0, 255, 0.6)"; // magenta

  for (const cell of path) {
    const r = cell.r;
    const c = cell.c;
    const hexDiv = document.querySelector(`.hex-cell[data-row='${r}'][data-col='${c}']`);
    if (hexDiv) {
      hexDiv.style.backgroundColor = pathColor;
    }
  }
}

/****************************************************************************
 * 11. SAVE AND LOAD DATA FUNCTIONS
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

  // Assign it to your hexGrid
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

    // Decide color based on cell's data
    if (cell.isNoGo) {
      hexDiv.style.backgroundColor = "rgba(0,0,0,0.5)";
    } else if (cell.isStart) {
      hexDiv.style.backgroundColor = "rgba(0,255,0,0.5)";
    } else if (cell.isEnd) {
      hexDiv.style.backgroundColor = "rgba(255,0,0,0.5)";
    } else if (cell.isCheckpoint) {
      hexDiv.style.backgroundColor = "rgba(0,0,255,0.5)";
    } else {
      // Set color based on eValue
      switch (cell.eValue) {
        case 10:
          hexDiv.style.backgroundColor = "rgba(200, 255, 200, 0.9)";
          break;
        case 20:
          hexDiv.style.backgroundColor = "rgba(255, 255, 150, 0.9)";
          break;
        case 30:
          hexDiv.style.backgroundColor = "rgba(255, 200, 200, 0.9)";
          break;
        case 40:
          hexDiv.style.backgroundColor = "rgba(150, 200, 255, 0.9)";
          break;
        case 50:
          hexDiv.style.backgroundColor = "rgba(255, 150, 255, 0.9)";
          break;
        default:
          hexDiv.style.backgroundColor = "rgba(255,165,0,0.5)"; // default orange
      }
    }
  });
}

/****************************************************************************
 * 12. EXPORT ROUTE DATA FUNCTION
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

/****************************************************************************
 * 13. A* PATHFINDING (DISTANCE OR ENERGY)
 ****************************************************************************/
function aStar(startR, startC, endR, endC) {
  // Initialize distance and previous arrays
  const dist = Array.from({ length: hexRows }, () => Array(hexCols).fill(Infinity));
  const prev = Array.from({ length: hexRows }, () => Array(hexCols).fill(null));

  dist[startR][startC] = 0;

  // Priority Queue implemented as an array for simplicity
  // Each element is an object { r, c, f }
  const openSet = [{ r: startR, c: startC, f: hexDistance(startR, startC, endR, endC) }];

  // To keep track of visited nodes
  const closedSet = new Set();

  while (openSet.length > 0) {
    // Sort the open set by f value (f = g + h) and select the node with the lowest f
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift();
    const { r, c } = current;
    const currentId = `${r},${c}`;

    if (closedSet.has(currentId)) continue;
    closedSet.add(currentId);

    // If we've reached the end, we can stop
    if (r === endR && c === endC) {
      break;
    }

    // Explore neighbors
    const neighbors = getNeighbors(r, c);
    for (const neighbor of neighbors) {
      const { r: nr, c: nc } = neighbor;

      if (hexGrid[nr][nc].isNoGo) continue; // Skip blocked cells

      const tentativeG = dist[r][c] + (useDistance ? hexGrid[nr][nc].dValue : hexGrid[nr][nc].eValue);

      if (tentativeG < dist[nr][nc]) {
        dist[nr][nc] = tentativeG;
        prev[nr][nc] = { r, c };
        const f = tentativeG + hexDistance(nr, nc, endR, endC);
        openSet.push({ r: nr, c: nc, f });
      }
    }
  }

  return { dist, prev };
}
