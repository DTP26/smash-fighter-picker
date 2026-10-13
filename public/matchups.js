/* ===================================================================
  Matchup picker

  Builds a grid of character icons and lets the user mark each one as
  "winning" (value 1) or "at least even" (value 0) against the matchup
  they want. The picker only tracks state; app.js reads it at submit
  time through window.getMatchupSelections() (see bottom of file).
*/ 

document.addEventListener("DOMContentLoaded", async () => {
  
  // variables for character icon paths and extensions just in case they require chaninging later
  const ICON_PATH = "/fighterIcons";
  const ICON_EXT = "png";

  // refers to the grid of clickable character icons 
  const grid = document.getElementById("matchupGrid");

  // refers to the button that can clear all matchup requests
  const clearBtn = document.getElementById("matchupClear");

  // refers to whether or not both sides of a matchup must agree on the requested ratio
  const mutualBox = document.getElementById("matchupAgree");
  if (!grid) return; // page doesn't have the matchup section

  
  // the object that will contain requested matchups sent to be searched in matchupMatch (found in app.js)
  const selections = {};

  /* Description: Builds each of the tiles at the start of the site running
    
     Parameters: 
                fighter: a row from the attributes table used to parse the characters id and name
  */
  function buildTile(fighter) {

    // each character has their icon placed on their own button
    const tile = document.createElement("button");
    tile.type = "button"; 
    tile.className = "matchup-tile";

    // edge case for pokemon trainer (combines squirtle, ivysaur, and charizard)
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

    // sets title to display upon hover, initial status to unselected, and loads character icon
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

  // Load characters and build the grid
  try {
    const response = await fetch("/api/data");
    if (!response.ok) throw new Error(`Failed to fetch characters: ${response.status}`);

    const data = await response.json();
    const attributes = data.attributes;

     // separates miis from id order to add them to the end (mimics select screen)
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

   /* Description: color codes tiles based on whether the user wants to beat, 
                  go even with, or is indiffirent on the character

                  tile: the tile we are coloring  

                  value: int representing the requested ratio against a character
  */
  function paintTile(tile, value) {

    // the tiles state is used in styles.css to update color
    if (value === 1) {
      tile.dataset.state = "win";
    } else if (value === 0) {
      tile.dataset.state = "even";
    } else {
      // no attribute = neutral look
      delete tile.dataset.state; 
    }

    // alerts html to update appearance
    tile.setAttribute("aria-pressed", value === undefined ? "false" : "true");
  }

  // One listener on the grid (event delegation) instead of one per tile.
  grid.addEventListener("click", (e) => {
    const tile = e.target.closest(".matchup-tile");
    if (!tile) return;

    const id = tile.dataset.characterId;
    const mode = Number(document.querySelector('input[name="matchup_mode"]:checked').value);

    if (selections[id] === mode) {
      // clicking again in the same mode un-selects
      delete selections[id];     
    } else {
      // otherwise set it (or switch it to the other mode)
      selections[id] = mode;     
    }
    paintTile(tile, selections[id]);
  });

  // clears all tiles upon clicking 
  clearBtn?.addEventListener("click", () => {
    Object.keys(selections).forEach(id => delete selections[id]);
    grid.querySelectorAll(".matchup-tile").forEach(tile => paintTile(tile, undefined));
  });

  // What app.js reads at submit time -
  window.getMatchupSelections = () => ({
    // copy, so callers can't mutate our state
    chars: { ...selections },                       
    mutual: mutualBox ? mutualBox.checked : false 
  });
});