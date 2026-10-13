// all of this runs once the HTML DOM has loaded
document.addEventListener("DOMContentLoaded", () => {

  /*
     Description: Chooses characters that succeed in the matchups the user requested

     Parameters:
        requests: Object containing matchups that the user requested the character should win / go even in.
                  Pairs in the form of (character: ratioAgainstCharacter) 

        matchups: Object representing all of the matchup opinions contained in the matchups table

        mutual: boolean determining whether or not both sides of a matchup must agree on the requested ratio
  */

  function matchupMatch(requests, matchups, mutual) {
    // placeholder for now until matchups table is finished 
    // currently goes up to Luigi

    results = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

    // initially start with set of all fighters. It will remove any that don't meet the requirements 
  
    // requirement represents whether we must win against (1) or at least go even (0) vs the id characater
    for (const [id, requirement] of Object.entries(requests)) {

        // create of copy of results to iterate through so we dynamically lower number of inner loops as options are deleted
        resultsCopy = new Set(results);
        for (const opponent of resultsCopy) { 

          // check opinions of matchups from both the character and the opponent
          // matchups[character1][character2] represents how players of character1 think they do vs the character2
          character = parseInt(id);
          playerOpinion = matchups[character][opponent] <= requirement * -1;
          opponentOpinion = matchups[opponent][character] >= requirement;

          // if mutual is true, both opinions must agree
          // if mutual is false, either opinion is sufficient
          if ((mutual && !(playerOpinion && opponentOpinion)) || (!mutual && !(playerOpinion || opponentOpinion))) {
             results.delete(opponent);
          } 
        }
    }
    return results;
  }

  /* 
     Description: Chooses the best possible character(s) based on requested attributes 

     Parameters:
        mandatory: an object containing attributes that MUST be matched,
                   which are in pairs of (attributeName: requestedValue).
                   Any characters not matching everything here will be discarded

        preferred: an object containing attributes that aren't mandatory, but increase
                   likelihood of selection upon matching. Same type of paird as mandatory

        attributes: array representing the attributes database described in server.js.
                    Used to check whether characters match the attributes requested in 
                    mandatory and preferred.

        mii_sword: boolean determining whether or not Mii Swordfighter will be allowed in 
                   the final results. If false, he will be removed regardless of other matches.

        remaining: The characters IDs remaining after matchupMatch is performed. Primarily 
                   exists to lower runtime in the event that some characters are already 
                   disqualified due to not having the requested matchups.
  */  

  function attributeMatch(mandatory, preferred, attributes, mii_sword, remaining) {

      // initial value for score used to determine which characters are chosen 
      // irrelvant in the event of no 'preferred' attributes
      let currBest = -999;

      let results = new Set();

      remaining.forEach((fighter) => {

        // first determine if fighter matches mandatory requirements
        let valid = true;
        const currFighter = attributes[fighter - 1];
       
        for (const [attribute, value] of Object.entries(mandatory)) {
          // value equaling 6 is an edge case for characters with highly variable effective range
          valid = valid && (currFighter[attribute] == value || currFighter[attribute] == 6);
        }
        
        // if mandatory needs are met, calculate preferred score
        if (valid) {
          let score = 0;
          // subtract based on how far from desired the character is
          for (const [attribute, value] of Object.entries(preferred)) {
            // edge case for characters with highly variable effective range
            if (currFighter[attribute] != 6) {
              score += Math.abs(Number(currFighter[attribute]) - value) * -1
            }
          }
          // reset results if new best match is found
          if (score > currBest) {
              currBest = score;
              results.clear();
          }
          // add character if they match the score threshold
          if (score == currBest) {
            results.add(currFighter.name);
          }
        } 
      })

      // deletes mii swordfighter from the set if user doesn't consent to them

      if (!mii_sword) {
        results.delete("Mii Swordfighter")
      }
    
      return results;
  }

  // form groups represent each of the attribute boxes

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


  

  const form = document.getElementById('preferencesForm');

  // runs when the user attempts to submit their requests
  form.addEventListener('submit', async (e) => {
    e.preventDefault();


    // submits results of the attribute forms into mandatory and preferred 
    // based on how the user marked their preferences
    
    const mandatory = {};
    const preferred = {};
    let mii_sword = true;

    formGroups.forEach(group => {
      // we check if the current formgroup had a select box or checkbox
      const select = group.querySelector('select');
      const checkbox = group.querySelector('input[type="checkbox"]');

      // statImportance describes whether attribute is mandatory, preferred, or ignored 
      // 1 = Mandatory, 0 = Preferred, -1 = Ignore
      const checkedRadio = group.querySelector('input[type="radio"]:checked');
      const statImportance = checkedRadio ? parseInt(checkedRadio.value) : -1;


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

    // grabs matchup data from matchups.js 

    let matchupRequests = window.getMatchupSelections();

    // User must mark at least one matchup/attribute before submitting 
    const errorMessage = document.getElementById('form-error');

     //

    if (Object.keys(mandatory).length + Object.keys(preferred).length + Object.keys(matchupRequests.chars).length === 0) {
        errorMessage.textContent =
            "Please set at least one preference!";

        errorMessage.classList.add('visible');

        return;
    }

    // Hide error if the user previously triggered it
    errorMessage.classList.remove('visible');

    // retrieve table data 
    const response = await fetch("/api/data");
    const data = await response.json();

  
    const attributes = data.attributes;
    const matchups = data.matchups;
   
    const matchupResults = matchupMatch(matchupRequests.chars, matchups, matchupRequests.mutual);
    const results = attributeMatch(mandatory, preferred, attributes, mii_sword, matchupResults);

    // stores characters to be displayed on results screen
    localStorage.setItem(
        "results",
        JSON.stringify(Array.from(results))
    );

    // stash what was actually requested so results.html can highlught requested attributes/matchups
    localStorage.setItem(
        "requirements",
        JSON.stringify({ mandatory, preferred, matchupRequests })
    );


    window.location.href = "results.html";
  });
});
