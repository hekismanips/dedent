const body = document.getElementById('body');
window.onload = function () {
  renderFields('https://dedent.org/fields/f.json', 'body', 'DERP');
  fetchLibrary('https://dedent.org/fields/library.json');
  document.getElementById('head').innerHTML = `
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Kumbh+Sans:wght@100..900&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="style.css" />
    <title>DERP</title>
  `
};


// Here defines the Next Generation UI JS Engine for DERP.
// Introducing... NGUE.v1


// General Data Holding
const formData = [];
/* Example
  formData === {
  "2_0_2": "2025-05-16",            // timeOfDiagnosis
  "2_0_4": [                        // locationDetails (repeatable)
    { facility: "KP Senawang", clinicians: ["Dr. A"] },
    { facility: "KP PD",       clinicians: ["Dr. B"] }
  ]
}
*/

// Utility to evaluate a logic string in context of formData
function checkLogic(expr) {
  if (!expr) return true;
  try {
    // Very simple: build a fn that returns the boolean
    return new Function("data", `with(data){ return (${expr}); }`)(formData);
  } catch {
    return false;
  }
}
/* Example
  // show only when 2_0_2 === "Anaemia" AND field 2_0_5 is not present
  const expr = 
    `data["2_0_2"] === "Anaemia" && !("2_0_5" in data)`;

  checkLogic(expr);  // returns true or false
*/

// Fetching function
const jsonCache = new Map();
async function fetchJson(path) {
  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error(res.statusText);
    return await res.json();
  } catch {
    return [];
  }
}

// Instructs which DOM element needs to add details in <datalist>
async function fetchDataList(childJSON, id) {
  // 1. load current defs
  let float = '';
  let defs = [];
  defs = await fetchJson(childJSON);
  if (!defs.length) {
    console.error("Failed to load upperPath definitions:", err);
    return
  }

  for (let i = 0; i < defs.length; i++) {
    float += `<option value="${defs[i].name}">`
  }

  document.getElementById(`${id}`) ? document.getElementById(`${id}`).innerHTML = float : '';
}

// Suggestion Keywords Registry
let suggestionRegistry = [];

// Core render function: given a parentLocation, draw all its fields into `container`
async function renderFields(jsonPath, containerID, name, repeatability) {
  const container = document.getElementById(containerID);
  container.innerHTML = "<p>Loading…</p>";       // optional loading state
  suggestionRegistry = [];
  // define upperPath
  let backButton;
  const parts = jsonPath.split('/');
  if (parts.length > 5) {
    const dir = parts.slice(0, parts.length - 2).join('/');
    const segments = parts[parts.length-2].split('_');
    const prefix = segments.slice(0, -1).join('_');
    const upperPath = `${dir}/${prefix}.json`;    
    
    // extract upperPath
    let upperDefs = [];
    upperDefs = await fetchJson(upperPath);
    if (!upperDefs.length) {
      console.error("Failed to load upperPath definitions:", err);
      return
    }
    
    // parent name
    const found = upperDefs.find(obj => obj.id.includes(prefix));
    backButton = `<button onclick="renderFields('${upperPath}', '${containerID}', '${found.parentName}')"><p>Back</p></button>`;
  } else {
    backButton = ``;
  }

  // build your HTML
  const basePath = jsonPath.replace(/\.json$/, '');
  let html = "";
  html += `
    <div>
      <h1>${name}</h1>
      ${backButton}
    </div>
    <div>
  `;

  // 1. load current defs
  let defs = [];
  defs = await fetchJson(jsonPath);
  if (!defs.length) {
    container.innerHTML = html + '<p class="error">Couldn’t load fields.</p>';
    return;
  }
  defs.forEach(def => {
    // 1️⃣ logic
    if (def.logic && !checkLogic(def.logic)) return;

    // 2️⃣ repeatable
    if (def.repeatable) {
      html += `
        <div class="repeatable-group" data-id="${def.id}">
          <header id="${def.id}Header">
            <h4>${def.key}</h4>
            ${(formData[def.id] || []).map((_, idx) => `
              <button class="edit-instance" data-id="${def.id}" data-idx="${idx}"><p>
                Edit ${def.key} #${idx+1}
              </p></button>
            `).join("")}
            <button class="add-instance" data-id="${def.id}" onclick="renderFields('${basePath}_${def.id.slice(-1)}-${def.key}/${def.id}.json', '${containerID}', '${def.name}', ${true})"><p>
              Add ${def.key}
            </p></button>
          </header>
          <div id="${def.id}Div"></div>
        </div>
      `;
      return;
    }

    // 3️⃣ class-based
    if (def.class === "input") {
      const opt = [];
      if (def.autofocus)          opt.push('autofocus');
      if (def.disabled)           opt.push('disabled');
      if ('form' in def)          opt.push(`form="${def.form}"`);
      if ('autocomplete' in def)  opt.push(`autocomplete="${def.autocomplete}"`);
      if ('min' in def)           opt.push(`min="${def.min}"`)
      // …etc…
      if (def.checked)            opt.push('checked');
      if (def.inputType === 'list') fetchDataList(`${basePath}_${def.id.slice(-1)}-${def.key}/${def.id}.json`, `${def.id}-list`);
      
      html += `
        <div class="field-value" data-id="${def.id}">
          <label for="${def.id}">${def.name}</label>
          <input
            id="${def.id}"
            type="${def.inputType}"
            name="${def.name}"
            value="${formData[def.id] ?? ''}"
            onclick="suggestKeywords('${containerID}')"
            ${opt.join(' ')}
            ${def.inputType === 'list' ? `list="${def.id}-list"` : ''}
          />
          ${def.inputType === 'list' ? `<datalist id="${def.id}-list"></datalist>` : ''}
        </div>
      `;

      /*
        Create for "list"
          parent.json
          - def1.list === true
          - run <datalist> populator
          - - fetch def1.json
          - - writes <datalist id="${def.id}-list">
          - - screens from first object to last object
          - - if obj.class === "option"
          - - - create <option value="def2.name"></option>
          - - else ""
          - - close with </datalist>
      */
    } else if (def.class === "boolean") {
      html += `
        <div class="field-boolean" data-id="${def.id}">
          <label for="${def.id}">${def.name}</label>
          <select id="${def.id}">
            <option value="">Select</option>
            <option value="true"  ${formData[def.id]===true  ? "selected" : ""}>True</option>
            <option value="false" ${formData[def.id]===false ? "selected" : ""}>False</option>
          </select>
        </div>
      `;
    } else if (def.class === "object") {
      html += `
        <div>
          <button class="edit-object" data-id="${def.id}" onclick="renderFields('${basePath}_${def.id.slice(-1)}-${def.key}/${def.id}.json', '${containerID}', '${def.name}', ${false})"><p>
            ${def.name}
          </p></button>
        </div>
      `;
    } else if (def.class === "textarea") {
      html += `
        <div class="field-textarea" data-id="${def.id}">
          <label for="${def.id}">${def.name}</label>
          <textarea id="${def.id}" value="${formData[def.id] || ""}"></textarea>
        </div>
      `;
    } else if (def.class === "select") {

      html += `
        <div class="field-select" data-id="${def.id}">
          <label for="${def.id}">${def.name}</label>
          <select id="${def.id}">
          </select>
        </div>
      `;

      fetchSelect(`${basePath}_${def.id.slice(-1)}-${def.key}/${def.id}.json`, `${def.id}`)
    }

    // 4️⃣ suggestion registering
    if (def.libraryId) {
      suggestionRegistry.push([def.id, def.libraryId, def.logicDefinition ? def.logicDefinition : null]);
    }
  });

  // replace the loading message with the built HTML
  container.innerHTML = html + '</div><div id="suggestionPane"></div>';
  writeInput();
}

async function fetchSelect(childJSON, id) {
  // 1. load current defs
  let float = '<option value="">— choose —</option>';
  let defs = [];
  defs = await fetchJson(childJSON);
  if (!defs.length) {
    console.error("Failed to load upperPath definitions:", err);
    return
  }
  for (let i = 0; i < defs.length; i++) {
    if (defs[i].data !== null) {
      float += `<optgroup label="${defs[i].description}">`
      for (let j = 0; j < defs[i].data.length; j++) {
        const defsDes = defs[i].data[j].description ? defs[i].data[j].description : "";
        const defsAbbr = defs[i].data[j].abbreviation ? defs[i].data[j].abbreviation : defsDes;
        float += `<option value="${defsDes}">${defsAbbr}</option>`
      }
      float += `</optgroup>`
    } else {
      const defsDes = defs[i].description ? defs[i].description : "";
      const defsAbbr = defs[i].abbreviation ? defs[i].abbreviation : defsDes;
      float += `<option value="${defsDes}">${defsAbbr}</option>`
    }
  }
  document.getElementById(`${id}`) ? document.getElementById(`${id}`).innerHTML = float : '';
}

// write the input with its exisiting value
function writeInput() {
  for (let i = 0; i < formData.length; i++) {
    document.getElementById(`${formData[i][0]}`) ? document.getElementById(`${formData[i][0]}`).value = formData[i][1] : "";
  }
}

// Floating State of the Suggestion Buttons
let floatSuggestion = [];

// Fetch the library.json
let library = [];
async function fetchLibrary(link) {
  library = await fetchJson(link);
  if (!library.length) {
    console.log('<p class="error">Couldn’t load fields.</p>');
    return;
  }
}

// Global listener function
document.getElementById('body').addEventListener('click', e => {
  if (e.target.tagName !== 'INPUT') return;            // ignore non-inputs
  const idx = suggestionRegistry.findIndex(([f]) => f === e.target.id);
  if (idx === -1) return;                              // not registered for suggestions
  suggestKeywords(suggestionRegistry[idx]);             // trigger suggestion workflow
});


// showSuggestions Workflow   
async function suggestKeywords([fieldId, libraryId, logicDef]) {
  floatSuggestion = [];
  // The Suggstion Div
  const suggestion = document.getElementById('suggestionPane') ? document.getElementById('suggestionPane') : '';
  // Creating the array
  const index = library.findIndex(item => item.id === libraryId);
  const nefs = index !== -1 ? library[index] : null;

  let html = '';

  // Assess repeatability
  const repeat = nefs.repeatability ? nefs.repeatability : false;
  const separator = nefs.separator ? nefs.separator : '';

  // Generating UI
  if (nefs !== null) {
    // reads the nefs.data, else if false then no point generating the UI
    // a data consists of [id, key, description, data], the loop stops for a particular when data = null, then continues the next loop.
    // hierarchy definition
    nefsLoop(nefs);
  };

  /*
  if (nefs !== null) {

    // This section repeats on itself
    -------------------------------------------------------
    if (nefs.logic || checkLogic(nefs.logic)) {
      if (nefs.data !== null) {
        html += hHeadParser (nefs);
        for (let i = 0; i < nefs.data.length; i++) {
          
          //Repeats here, the difference? every repeat it lengthens -> nefs.data[i].data[j].da....... till infinity
        
        }
        html += '</div>';
      } else {
        html += hEndParser(nefs, fieldId);
      }
    }
    -------------------------------------------------------

  }
  */

  function nefsLoop(nefs) {
    const nefsLogic = nefs.logic ? nefs.logic : null;
    const nefsData = nefs.data ? nefs.data : null;
    if (!nefsLogic || checkLogic(nefsLogic)) {
      if (nefsData !== null) {
        html += hHeadParser (nefs);
        for (let i = 0; i < nefsData.length; i++) {
          nefsLoop(nefsData[i]);        
        }
        html += '</div></div>';
      } else {
        html += hEndParser(nefs, fieldId);
      }
    }
  }

  function hHeadParser (nefs) {
    return `
      <div>
      <label>
        ${nefs.description ? nefs.description : ''}
      </label>
      <div>
    `
  }
  function hEndParser (nefs, fieldId) {
    const nefsId = nefs.id ? nefs.id : '';
    const nefsDes = nefs.description ? nefs.description : '';
    const nefsAbbr = nefs.abbreviation ? nefs.abbreviation : nefsDes;
    floatSuggestion.push([`${nefsId}`, 0])
    return `
      <button 
        id="${nefsId}" 
        onclick="registerSuggestion('${nefsId}', '${fieldId}', '${nefsDes}', ${repeat}, '${separator}')"
      >
        ${nefsAbbr}
      </button>
    `
  }
  suggestion.innerHTML = html;
  colorSuggestions();
}

function registerSuggestion(nefsId, fieldId, nefsDes, repeat, separator) {
  for (let i = 0; i < floatSuggestion.length; i++) {
    floatSuggestion[i][0] === `${nefsId}` ? floatSuggestion[i][1] === 0 ? floatSuggestion[i][1] = 1 : floatSuggestion[i][1] = 0 : repeat ? "" : floatSuggestion[i][1] = 0;
  }
  let parts = [];
  for (let i = 0; i < floatSuggestion.length; i++) {
    floatSuggestion[i][1] === 1 ? parts.push(nefsDes) : "";
  }
  const text = parts.join(separator);
  let fDId = '';
  for (let i = 0; i < formData.length; i++) {
    if (formData[i][0] === `${fieldId}`) fDId = i;
  }
  fDId === '' ? formData.push([`${fieldId}`,text]) : formData[fDId][1] = text;
  writeInput();
  colorSuggestions();
}

function colorSuggestions() {
  for (let i = 0; i < floatSuggestion.length; i++) {
    const nefsId = document.getElementById(`${floatSuggestion[i][0]}`) ? document.getElementById(`${floatSuggestion[i][0]}`) : "";
    floatSuggestion[i][1] === 0 ? nefsId.className = "buttonFalse" : nefsId.className = "buttonTrue";
  }
}
