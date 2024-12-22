/****************************************************************************
 * GLOBALS & DATA STRUCTURES
 ****************************************************************************/
 
// Current "mode" for labeling hexes or setting E-values ("start", "end", "nogo", "checkpoint", "setEValue", or null)
let currentMode = null;

// Toggling between Distance (dValue) and Energy (eValue) in pathfinding
let useDistance = true; // default = distance mode

// If we're in "setEValue" mode, which value are we assigning? (10,20,30,40,50)
let currentEValue = 10;

// Our grid data structure. 
//   hexGrid[row][col] => { dValue, eValue, isNoGo, isStart, isEnd, isCheckpoint, etc. }
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
 * Toggle-Grid button listener.
 * Only shows/hides the hex cells, does NOT handle mouseIsDown logic anymore.
 */
document.getElementById("btn-toggle-grid").addEventListener("click", () => {
  gridVisible = !gridVisible;
  document.getElementById("btn-toggle-grid").textContent = gridVisible ? "Hide Grid" : "Show Grid";

  // Show or hide all hex cells
  allHexCells.forEach((hexDiv) => {
    hexDiv.style.display = gridVisible ? "block" : "none";
  });
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
  document.getElementById("btn-start").addEventListener("click", () => {
    currentMode = "start";
  });
  document.getElementById("btn-end").addEventListener("click", () => {
    currentMode = "end";
  });
  document.getElementById("btn-nogo").addEventListener("click", () => {
    currentMode = "nogo";
  });
  document.getElementById("btn-checkpoint").addEventListener("click", () => {
    currentMode = "checkpoint";
  });
  document.getElementById("btn-clear").addEventListener("click", () => {
    clearGridColors();
    currentMode = null;
  });
  document.getElementById("btn-save-data").addEventListener("click", () => {
    saveHexData();
  });
  document.getElementById("btn-load-data").addEventListener("click", () => {
    loadHexData();
  });


  // E-value assignment buttons
  document.getElementById("btn-e10").addEventListener("click", () => {
    currentMode = "setEValue";
    currentEValue = 10;
  });
  document.getElementById("btn-e20").addEventListener("click", () => {
    currentMode = "setEValue";
    currentEValue = 20;
  });
  document.getElementById("btn-e30").addEventListener("click", () => {
    currentMode = "setEValue";
    currentEValue = 30;
  });
  document.getElementById("btn-e40").addEventListener("click", () => {
    currentMode = "setEValue";
    currentEValue = 40;
  });
  document.getElementById("btn-e50").addEventListener("click", () => {
    currentMode = "setEValue";
    currentEValue = 50;
  });

  // Toggle Distance vs Energy
  document.getElementById("btn-toggle-cost").addEventListener("click", () => {
    useDistance = !useDistance;
    const btn = document.getElementById("btn-toggle-cost");
    btn.textContent = useDistance ? "Mode: Distance (D)" : "Mode: Energy (E)";
  });

  // Find Route (Dijkstra with checkpoints)
  document.getElementById("btn-find-route").addEventListener("click", () => {
    findRouteWithCheckpoints();
  });
}

/************************************************
 * 1b set up save and load data
 ************************************************/
function saveHexData() {
  // 1) Convert the entire hexGrid 2D array into a JSON string.
  const jsonData = JSON.stringify(hexGrid);
  
  // 2) Save it in the browser's localStorage under a key, e.g., "hexData".
  localStorage.setItem("hexData", jsonData);
  
  alert("Hex data saved locally!");
}

function loadHexData() {
  // 1) Pull the string from localStorage
  const jsonData = localStorage.getItem("hexData");
  
  // 2) If nothing found, alert and return
  if (!jsonData) {
    alert("No saved data found in localStorage!");
    return;
  }
  
  // 3) Parse it
  const savedGrid = JSON.parse(jsonData);
  
  // 4) Assign it to your hexGrid
  // (Assumes savedGrid has the same # of rows/cols)
  for (let r = 0; r < hexRows; r++) {
    for (let c = 0; c < hexCols; c++) {
      hexGrid[r][c] = savedGrid[r][c];
    }
  }
  
  // 5) Redraw the hexes to reflect the loaded data
  reDrawFromHexGrid();
  
  alert("Hex data loaded from localStorage!");
}


/****************************************************************************
 * 2. CREATE THE HEX GRID (DOM + DATA)
 ****************************************************************************/
function createHexGrid() {
  const mapContainer = document.getElementById("map-container");
  const containerWidth = mapContainer.clientWidth;
  const containerHeight = mapContainer.clientHeight;

  // For pointy-top hexes, totalHeight = cellHeight + (hexRows - 1)*0.75*cellHeight
  // => cellHeight = containerHeight / (1 + 0.75*(hexRows - 1))
  const cellHeight = containerHeight / (1 + 0.75 * (hexRows - 1));
  // For pointy-top, the ratio of height to width is about 1.1547
  const cellWidth  = cellHeight / 1.1547;

  // row-to-row and column-to-column spacing
  const verticalSpacing = 0.8 * cellHeight;
  const horizontalSpacing = cellWidth;

  // Shift the entire grid down by 1/3 hex
  const gridOffsetY = cellHeight / 3;

  // Compute columns needed
  hexCols = Math.ceil((containerWidth - cellWidth) / horizontalSpacing) + 1;

  // Initialize the hexGrid data array
  for (let r = 0; r < hexRows; r++) {
    hexGrid[r] = [];
    for (let c = 0; c < hexCols; c++) {
      hexGrid[r][c] = {
        dValue: 150,       // distance cost
        eValue: 10,        // energy cost
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

      // Store row/col in dataset so we can reference them in event handlers
      hexDiv.dataset.row = row;
      hexDiv.dataset.col = col;

      // For odd rows, shift columns horizontally by half a hex width
      const xOffset = (row % 2 === 1) ? (cellWidth / 2) : 0;

      const xPos = col * horizontalSpacing + xOffset;
      const yPos = row * verticalSpacing + gridOffsetY;

      // Apply sizing & positioning
      hexDiv.style.width = `${cellWidth}px`;
      hexDiv.style.height = `${cellHeight}px`;
      hexDiv.style.left = `${xPos}px`;
      hexDiv.style.top  = `${yPos}px`;

      // Left-click (simple click)
      hexDiv.addEventListener("click", () => {
        colorHex(hexDiv);
      });

      // For DRAG painting: 
      //   mousedown => color immediately
      //   mouseover => color if mouseIsDown is true
      hexDiv.addEventListener("mousedown", () => {
        colorHex(hexDiv);
      });
      hexDiv.addEventListener("mouseover", () => {
        if (mouseIsDown) {
          colorHex(hexDiv);
        }
      });

      // Right-click => show the current eValue
      hexDiv.addEventListener("contextmenu", (e) => {
        e.preventDefault(); // avoid default browser menu
        const r = parseInt(hexDiv.dataset.row, 10);
        const c = parseInt(hexDiv.dataset.col, 10);
        alert(`E-Value for this hex: ${hexGrid[r][c].eValue}`);
      });

      mapContainer.appendChild(hexDiv);
      allHexCells.push(hexDiv);
    }
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
      hexDiv.style.backgroundColor = "rgba(0,255,0,0.5)"; // green
      resetStartFlag();
      hexGrid[row][col].isStart = true;
      break;

    case "end":
      hexDiv.style.backgroundColor = "rgba(255,0,0,0.5)"; // red
      resetEndFlag();
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
          hexDiv.style.backgroundColor = "rgba(255,165,0,0.9)";
          break;
      }
      break;

    default:
      // no mode or unrecognized
      break;
  }
}


/****************************************************************************
 * (Optional) Helpers if you only want ONE start or ONE end or redraw loaded data
 ****************************************************************************/
function resetStartFlag() {
  // If you want only one "Start" hex at a time, remove any existing
  for (let r = 0; r < hexRows; r++) {
    for (let c = 0; c < hexCols; c++) {
      if (hexGrid[r][c].isStart) {
        hexGrid[r][c].isStart = false;
      }
    }
  }
}
function resetEndFlag() {
  // If you want only one "End" hex
  for (let r = 0; r < hexRows; r++) {
    for (let c = 0; c < hexCols; c++) {
      if (hexGrid[r][c].isEnd) {
        hexGrid[r][c].isEnd = false;
      }
    }
  }
}

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
      // If setEValue => pick color based on eValue
      // Or default orange if eValue=10, etc.
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
 * 4. clearGridColors() - Reset everything to default
 ****************************************************************************/
function clearGridColors() {
  // Revert all hex <div>s to default orange
  allHexCells.forEach((hexDiv) => {
    hexDiv.style.backgroundColor = "rgba(255,165,0,0.5)";
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
}


/****************************************************************************
 * 5. NEIGHBOR CALCULATION (Pointy-Top Offset)
 ****************************************************************************/
function getNeighbors(r, c) {
  const neighbors = [];

  // left & right
  neighbors.push({ r, c: c - 1 });
  neighbors.push({ r, c: c + 1 });

  if (r % 2 === 0) {
    // even row
    neighbors.push({ r: r - 1, c });
    neighbors.push({ r: r - 1, c: c - 1 });
    neighbors.push({ r: r + 1, c });
    neighbors.push({ r: r + 1, c: c - 1 });
  } else {
    // odd row
    neighbors.push({ r: r - 1, c });
    neighbors.push({ r: r - 1, c: c + 1 });
    neighbors.push({ r: r + 1, c });
    neighbors.push({ r: r + 1, c: c + 1 });
  }

  // Filter valid in-bounds
  return neighbors.filter(n =>
    n.r >= 0 && n.r < hexRows &&
    n.c >= 0 && n.c < hexCols
  );
}


/****************************************************************************
 * 6. DIJKSTRA PATHFINDING (DISTANCE OR ENERGY)
 ****************************************************************************/
function dijkstraDistance(startR, startC, endR, endC) {
  // dist & prev arrays, default Infinity
  const dist = Array.from({ length: hexRows }, () => Array(hexCols).fill(Infinity));
  const prev = Array.from({ length: hexRows }, () => Array(hexCols).fill(null));

  dist[startR][startC] = 0;

  const visited = new Set();
  const pq = [{ r: startR, c: startC, dist: 0 }];

  while (pq.length > 0) {
    // Sort by distance ascending
    pq.sort((a, b) => a.dist - b.dist);
    const { r, c, dist: currentDist } = pq.shift();

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
 * 7. RECONSTRUCT PATH FROM PREV[][]
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
 * 8. MULTI-SEGMENT ROUTE (CHECKPOINTS)
 *    i.e. Start -> C1 -> C2 -> ... -> End
 ****************************************************************************/
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

    // Run Dijkstra for s -> t
    const { dist, prev } = dijkstraDistance(s.r, s.c, t.r, t.c);
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
 * 9. HIGHLIGHT THE FINAL PATH
 ****************************************************************************/
function highlightPath(path) {
  if (!path || path.length === 0) return;

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
