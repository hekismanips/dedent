const body = document.getElementById('body');
window.onload = function () {
  renderFields('https://dedent.org/fields/f.json', 'body', 'DERP');
  fetchLibrary();
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
const formData = {}
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
async function fetching(json) {
  try {
    const res = await fetch(childJSON);            // e.g. "/fields/f0.json"
    if (!res.ok) throw new Error(res.statusText);
    return await res.json();                      // your array of field defs
  } catch (err) {
    console.log('<p class="error">Couldn’t load fields.</p>');
    return;
  }
}

// Instructs which DOM element needs to add details
async function fetchDataList(childJSON, id) {
  // 1. load current defs
  let float = '';
  let defs = [];
  try {
    const res = await fetch(childJSON);            // e.g. "/fields/f0.json"
    if (!res.ok) throw new Error(res.statusText);
    defs = await res.json();                      // your array of field defs
  } catch (err) {
    console.log('<p class="error">Couldn’t load fields.</p>');
    return;
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
  if (parts.length > 3) {
    const dir = parts.slice(0, parts.length - 2).join('/');
    const segments = parts[parts.length-2].split('_');
    const prefix = segments.slice(0, -1).join('_');
    const upperPath = `${dir}/${prefix}.json`;    
    
    // extract upperPath
    let upperDefs = [];
    try {
      const res1  = await fetch(upperPath);         // e.g. "/fields/f0.json"
      if (!res1.ok) throw new Error(res1.statusText);
      upperDefs = await res1.json();                    // your array of field defs
    } catch (err) {
      console.error("Failed to load upperPath definitions:", err);
      return;
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
  try {
    const res = await fetch(jsonPath);            // e.g. "/fields/f0.json"
    if (!res.ok) throw new Error(res.statusText);
    defs = await res.json();                      // your array of field defs
  } catch (err) {
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

      let selectChild;
      html += `
        <div class="field-select" data-id="${def.id}">
          <label for="${def.id}">${def.name}</label>
          <select id="${def.id}">
            <option value="">— choose —</option>
            ${selectChild}
          </select>
        </div>
      `;
    }

    // 4️⃣ suggestion registering
    if (def.libraryId) {
      suggestionRegistry.push([def.id, def.libraryId, def.logicDefinition ? def.logicDefinition : null]);
    }
  });

  // replace the loading message with the built HTML
  container.innerHTML = html + '</div><div id="suggestionPane"></div>';
}

// Fetch the library.json
let library = [];
async function fetchLibrary() {
  try {
    const res = await fetch('https://dedent.org/fields/library.json');            // fetch library.json NOT libraryID.json (no such thing)
    if (!res.ok) throw new Error(res.statusText);
    library = await res.json();                      // your array of field defs
  } catch (err) {
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
  // The Suggstion Div
  const suggestion = document.getElementById('suggestionPane') ? document.getElementById('suggestionPane') : '';
  // Creating the array
  const index = library.findIndex(item => item.id === libraryId);
  const nefs = index !== -1 ? library[index] : null;

  let html = '';

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
    if (!nefs.logic || checkLogic(nefs.logic)) {
      if (nefs.data !== null) {
        html += hHeadParser (nefs);
        for (let i = 0; i < nefs.data.length; i++) {
          nefsLoop(nefs.data[i]);        
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
        ${nefs.description}
      </label>
      <div>
    `
  }
  function hEndParser (nefs, fieldId) {
    return `
      <button 
        id="${nefs.id}" 
        onclick="registerSuggestion(${nefs.id}, '${fieldId}', ${nefs.key})"
      >
        ${nefs.description}
      </button>
    `
  }
  suggestion.innerHTML = html;
  colorSuggestions();
}

// Floating State of the Suggestion Buttons
let floatSuggestion = [];

function registerSuggestion(nefsId, fieldId, nefsKey) {

}

function colorSuggestions() {

}
