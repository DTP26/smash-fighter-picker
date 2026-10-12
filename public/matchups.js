// ===================================================================
// Matchup picker
//
// Builds a grid of character icons and lets the user mark each one as
// "winning" (value 1) or "at least even" (value 0) against the matchup
// they want. The picker only tracks state; app.js reads it at submit
// time through window.getMatchupSelections() (see bottom of file).
// ===================================================================

document.addEventListener("DOMContentLoaded", async () => {
  // Where the icons live (inside /public) and how they're named.
  // The file for each character is built as `${ICON_PATH}/${name}.${ICON_EXT}`.
  const ICON_PATH = "/fighterIcons";
  const ICON_EXT = "png";

  const grid = document.getElementById("matchupGrid");
  const clearBtn = document.getElementById("matchupClear");
  const agreeBox = document.getElementById("matchupAgree");
  if (!grid) return; // page doesn't have the matchup section

  // ---- State -------------------------------------------------------
  // The single source of truth: character id -> 1 (winning) or 0 (at least even).
  // A character that isn't in this object is "ignored".
  // (Object keys are always strings in JS, so ids come out as "12", not 12.)
  const selections = {};

  // ---- Rendering ---------------------------------------------------
  // Applies the current state of one character to its tile. CSS does all
  // of the coloring by looking at the data-state attribute.
  function paintTile(tile, value) {
    if (value === 1) {
      tile.dataset.state = "win";
    } else if (value === 0) {
      tile.dataset.state = "even";
    } else {
      delete tile.dataset.state; // no attribute = neutral look
    }
    tile.setAttribute("aria-pressed", value === undefined ? "false" : "true");
    console.log(selections);
  }

  function buildTile(fighter) {

    const tile = document.createElement("button");
    tile.type = "button"; // inside a <form>, buttons submit unless told otherwise
    tile.className = "matchup-tile";

    // edge case for pokemon trainer 
    if (fighter.id > 37 && fighter.id < 41) {
        if (fighter.id == 38) {
            tile.dataset.characterId = fighter.id;
            tile.title = "Pokemon Trainer";
        } else {
            return -1;
        }
    // edge case for pyra / mythra
    } else if (fighter.id == 86 || fighter.id == 87) {
        if (fighter.id == 86) {
            tile.dataset.characterId = fighter.id;
            tile.title = "Pyra & Mythra";
        } else {
            return -1;
        }
    } else {
        tile.dataset.characterId = fighter.id;
        tile.title = fighter.name;
    }
    tile.setAttribute("aria-label", tile.title);
    tile.setAttribute("aria-pressed", "false");

    const img = document.createElement("img");
    img.src = `${ICON_PATH}/${tile.title}.${ICON_EXT}`;
    img.alt = ""; // the button's aria-label already names it
    img.loading = "lazy";
    // If a file name doesn't match, show the name as text so it's obvious
    // which icon is missing instead of leaving a blank tile.
    img.addEventListener("error", () => {
    tile.classList.add("matchup-tile--noicon");
    tile.textContent = tile.title;
    });

    tile.appendChild(img);
    return tile;
  }

  // ---- Load characters and build the grid -----------------------------
  try {
    const response = await fetch("/api/data");
    if (!response.ok) throw new Error(`Failed to fetch characters: ${response.status}`);

    const data = await response.json();
    const attributes = data.attributes;
    const matchups = data.matchups;

     // delay adding miis to mimic ingame roster appearance
    const miis = new Set();

    attributes.forEach(fighter => {
        tile = buildTile(fighter);
        if (tile != -1) {
            if (tile.title.includes("Mii")) {
                miis.add(tile);
            } else {
                grid.appendChild(tile);
            }
        }
       
        
    });

    miis.forEach(mii => grid.appendChild(mii));
        
  } catch (err) {
    console.error(err);
    grid.textContent = "Couldn't load the character list.";
    return;
  }

  // ---- Interaction -------------------------------------------------
  // One listener on the grid (event delegation) instead of one per tile.
  grid.addEventListener("click", (e) => {
    const tile = e.target.closest(".matchup-tile");
    if (!tile) return;

    const id = tile.dataset.characterId;
    const mode = Number(document.querySelector('input[name="matchup_mode"]:checked').value);

    if (selections[id] === mode) {
      delete selections[id];     // clicking again in the same mode un-selects
    } else {
      selections[id] = mode;     // otherwise set it (or switch it to the other mode)
    }
    paintTile(tile, selections[id]);
  });

  clearBtn?.addEventListener("click", () => {
    Object.keys(selections).forEach(id => delete selections[id]);
    grid.querySelectorAll(".matchup-tile").forEach(tile => paintTile(tile, undefined));
  });

  // ---- What app.js reads at submit time --------------------------------
  window.getMatchupSelections = () => ({
    chars: { ...selections },                       // copy, so callers can't mutate our state
    mutual: agreeBox ? agreeBox.checked : false // one global flag, not per character
  });
});