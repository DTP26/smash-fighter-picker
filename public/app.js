document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ JS loaded and DOM ready");
  async function getStats() {
      const response = await fetch("/api/attributes");

      if (!response.ok) {
          throw new Error(`Failed to fetch characters: ${response.status}`);
      }

      return await response.json();
  }

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
          //console.log(`Score: ${score} ${fighter.name}`);
          // reset results if new best match is found
          if (score > currBest && (fighter.name != "Mii Swordfighter" || mii_sword)) {
              //console.log(`New best: ${score} ${fighter.name}`);
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
        const value = parseInt(select.value);
        video.src = `/statVods/${select.name.replace(/\s+/g, '')}_${value}.mp4`;
        console.log(video.src);
        video.load();
      });
      // accounts for retaining video on site refresh
      const value = parseInt(select.value);
      video.src = `/statVods/${select.name.replace(/\s+/g, '')}_${value}.mp4`;
      video.load();
    } 
    // case with single checkbox
    else if (checkbox) {
      video.src = `/statVods/${checkbox.name.replace(/\s+/g, '')}.mp4`;
      console.log(video.src);
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

    // sends the requirements data to fightercontroller, which will 
    // eventually send its results to results.html
    
    const fighters = await getStats();

    console.log(mandatory);
    const results = bestFighters(
        mandatory,
        preferred,
        fighters,
        mii_sword
    );

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
