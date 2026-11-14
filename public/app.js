// all of this runs once the HTML DOM has loaded
document.addEventListener("DOMContentLoaded", () => {

  /*
     Description: Chooses characters that succeed in the matchups the user requested

     Parameters:
        requests: Object containing matchups that the user requested the character should win / go even in.
                  Pairs in the form of (character: ratioAgainstCharacter) 

        matchups: Object representing all of the matchup opinions contained in the matchups table

        scores: Scores per character to update based on how they match user requests
  */

  function matchupMatch(requests, matchups, scores) {
  
    // requirement represents whether we must win against (1) or at least go even (0) vs the id characater
    for (character of scores) {
      for (const [id, requirement] of Object.entries(requests)) {
          // 'target' refers to the character the user is trying to beat 
          target = parseInt(id);

          // 'current' refers to the character we are currently comparing to the target
          current = character.id;

          // edge case for pokemon trainer and pyra & mythra
          if (current == 39 || current == 40) {
            current = 38;
          } else if (current == 87) {
            current = 86;
          }

          // check opinions of matchups from players of the target and the current
          // matchups[character1][character2] represents how players of character1 think they do vs the character2
          
          targetOpinion = matchups[target][current] * -1;
          currentOpinion = matchups[current][target];

          // character score goes up by 1 per side that agrees on the requirement (mutual agreement gives full point)

          if (targetOpinion >= requirement) {
            character.matchupScore += 1;
          } 
          else if (targetOpinion - requirement != -2) {
            character.matchupScore += 0.5;
          }

          if (currentOpinion >= requirement) {
            character.matchupScore += 1
          }
           else if (currentOpinion - requirement != -2) {
            character.matchupScore += 0.5;
          }

        }
    }
    
  }

  /* 
     Description: Chooses the best possible character(s) based on requested attributes 

     Parameters:
        requests: an object containing attributes that the user wants matched, 
                  contains the attribute name, requested value, and importance
                  
        attributes: array representing the attributes database described in server.js.
                    Used to check whether characters match the attributes requested in 
                    mandatory and preferred.

        mii_sword: boolean determining whether or not Mii Swordfighter will be allowed in 
                   the final results. If false, he will be removed regardless of other matches.

        scores: Scores per character to update based on how they match user requests
  */  

  function attributeMatch(requests, attributes, mii_sword, scores) {

      for (character of scores) {
        for (const attribute of requests) {
          // edge case for characters with highly variable effective range
          if (attribute.name == "effective_range" && attributes[character.id - 1][attribute.name] == 6) {
            character.attributeScore += 1;
            
          // attribute is matched exactly
          } else if (attributes[character.id - 1][attribute.name] == attribute.value) {
            character.attributeScore += 1 * (attribute.importance + 1);
          }
          // attribute is not close to matching
          else if (Math.abs(attributes[character.id - 1][attribute.name] - attribute.value) == 1) {
            character.attributeScore += 0.5 * (attribute.importance + 1);
          }
        }
        if (!mii_sword && character.id == 57) {
          scores.delete(character)
        }
      }
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
    
    let attributeRequests = [];
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
        else if (statImportance != -1) {
          attributeRequests.push({name: statName, value: checkbox.checked ? 1 : -1, importance: statImportance});
        }
      } else if (select) {
        const statName = select.name;
        if (statImportance != -1) {
          attributeRequests.push({name:select.name, value: select.value, importance: statImportance});
        }
      }
    });

    // grabs matchup data from matchups.js 

    let matchupRequests = window.getMatchupSelections();

    // User must mark at least one matchup/attribute before submitting 
    const errorMessage = document.getElementById('form-error');

     //

    if (attributeRequests.length + Object.keys(matchupRequests.chars).length === 0) {
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

    // creates initial collection of character scores, all starting at 0 
    // only goes up to little mac for now
    let scores = []
    for (let i = 1; i < 55; i++) {
      scores.push({id: i, name: attributes[i - 1].name, attributeScore: 0, matchupScore: 0});
    }

    // runs both matching algorithms, then sorts results by descending score
    matchupMatch(matchupRequests.chars, matchups, scores);
    attributeMatch(attributeRequests, attributes, mii_sword, scores);
    for (character of scores) {
      character.totalScore = character.attributeScore + character.matchupScore;
    }

    scores.sort((a, b) => b.totalScore - a.totalScore);
    console.log(scores);
    // stores characters to be displayed on results screen
    localStorage.setItem(
        "results",
        JSON.stringify(scores)
    );

    // stash what was actually requested so results.html can highlught requested attributes/matchups
    localStorage.setItem(
        "requirements",
        JSON.stringify({attributeRequests, matchupRequests})
    );


    window.location.href = "results.html";
  });
});
