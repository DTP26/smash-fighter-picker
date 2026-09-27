document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ JS loaded and DOM ready");

  function bestFighters(mandatory, preferred, fighters, mii_sword) {

      let currBest = -999;
      let results = new Set();

      fighters.forEach((fighter) => {
        // first determine if fighter matches mandatory requirements
        let valid = true;
       
        for (const [stat, value] of Object.entries(mandatory)) {
          // edge case for characters with highly variable effective range
          valid = valid && (fighter[stat] == value || fighter[stat] == 6);
        }
        
        // if mandatory needs are met, calculate preferred score
        if (valid) {
          let score = 0;
          // score based on how close to desired the character is
          for (const [stat, value] of Object.entries(preferred)) {
            // edge case for characters with highly variable effective range
            if (fighter[stat] != 6) {
              score += Math.abs(Number(fighter[stat]) - value) * -1
            }
          }
          // reset results if new best match is found
          if (score > currBest && (fighter.name != "Mii Swordfighter" || mii_sword)) {
              currBest = score;
              results.clear();
          }
          // add character if they match the score threshold
          if (score == currBest && (fighter.name != "Mii Swordfighter" || mii_sword)) {
            results.add(fighter.name);
          }
        } 
      })
    
      return results;
  }

  // TODO: I want to keep track of whether or not the player and opponent agree on the ranking per matchup 
  // TODO: I also want some way to have some matchups be given higher priority such that some matchups are mandatory, and the others are preferred

  function matchupMatch(mandatory, preferred, fighters, matchups, mutual, mii_sword) {
    results = new Set([1, 2]);
    // initially start with set of all fighters. It will remove any that don't meet the requirements 
    /*for (const fighter of fighters) {
      results.add(fighter.id);
    }*/
    // requirement represents whether we need to beat (1) or at least go even (0) vs characater
    for (const [character, requirement] of Object.entries(mandatory)) {
        // create of copy of results to iterate through so we can remove from results while iterating
        resultsCopy = new Set(results);
        for (const opponent of resultsCopy) { 
          // check opinions of matchups from both the character and the opponent
          // matchups[character1][character2] represents how players of character1 think they do vs the character2
          playerOpinion = matchups[character][opponent] <= requirement;
          opponentOpinion = matchups[opponent][character] >= requirement;
          // if mutual is true, both opinions must agree
          // if mutual is false, either opinion is sufficient
          if (!(mutual && playerOpinion && opponentOpinion) || (!mutual && (playerOpinion || opponentOpinion))) {
             results.delete(opponent);
             console.log("Removing ", opponent, " from results because of matchup with ", character);
          } 
        }
    }
    // convert ids into names 
    const resultsNames = new Set();
    for (const fighter of results) { 
      resultsNames.add(fighters[fighter - 1].name);
    }
    console.log("Matchup results: ", resultsNames);
    return resultsNames;
  }

  const formGroups = document.querySelectorAll('.form-group');

  
  // Updates the videos displayed based on what attributes are selected
  formGroups.forEach(group => {
    const select = group.querySelector('select');
    const checkbox = group.querySelector('input[type="checkbox"]');
    const video = group.querySelector('.stat-video');

    if (!video) return;

    // case with select box
    if (select) {
      select.addEventListener('change', () => {
        video.src = `/statVods/${select.name}_${select.value}.mp4`;
        video.load();
      });
      // accounts for retaining video on site refresh
      video.src = `/statVods/${select.name}_${select.value}.mp4`;
      video.load();
    } 
    // case with single checkbox
    else if (checkbox) {
      video.src = `/statVods/${checkbox.name}.mp4`;
      video.load();
    }
  });
  // submits results of the attribute forms into the requiremments array,
  // which will be the input of the bestFighters functionS
  // NEW: rework to have mandatory and preferred seperate

  const form = document.getElementById('preferencesForm');


  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const errorMessage = document.getElementById('form-error');

    const selectedImportance = form.querySelector(
        'input[type="radio"][value="1"]:checked, input[type="radio"][value="0"]:checked'
    );

    if (!selectedImportance) {
        errorMessage.textContent =
            "Please set at least one attribute to Mandatory or Preferred!";

        errorMessage.classList.add('visible');

        return;
    }

    // Hide error if the user previously triggered it
    errorMessage.classList.remove('visible');

    let mii_sword = true;
    const mandatory = {};
    const preferred = {};

    formGroups.forEach(group => {
      // we check if the current formgroup had a select box,
      // one checkbox, or multiple checkboxes (effective range case)
      const select = group.querySelector('select');
      const checkbox = group.querySelector('input[type="checkbox"]');
      const checkedRadio = group.querySelector('input[type="radio"]:checked');
      const statImportance = checkedRadio ? parseInt(checkedRadio.value) : -1;
      // special case for effective range 
      if (checkbox) {
        const statName = checkbox.name;
        if (statName == "mii_sword") {
          mii_sword = checkbox.checked ? 1 : 0;
        }
        else if (statImportance == 1) {
          mandatory[statName] = [checkbox.checked ? 1 : 0];
        } else if (statImportance == 0) {
          preferred[statName] = [checkbox.checked ? 1 : 0];
        }
      } else if (select) {
        const statName = select.name;
        if (statImportance == 1) {
          mandatory[statName] = [parseInt(select.value)];
        } else if (statImportance == 0) {
          preferred[statName] = [parseInt(select.value)];
        }
        
      }
    });

    
    const response = await fetch("/api/data");
    const data = await response.json();

    const attributes = data.attributes;
    const matchups = data.matchups;

    //console.log(attributes);
    //console.log(matchups);

    const results = bestFighters(mandatory, preferred, attributes, mii_sword);
    matchupMandatoryTest = {2: 0}
    const matchupTest = matchupMatch(matchupMandatoryTest, preferred, attributes, matchups, true, mii_sword);

    localStorage.setItem(
        "results",
        JSON.stringify(Array.from(results))
    );

    // stash what was actually requested so results.html can show which
    // attributes matched (green) or didn't (red) for each fighter
    localStorage.setItem(
        "requirements",
        JSON.stringify({ mandatory, preferred })
    );


    window.location.href = "results.html";
  });
});
