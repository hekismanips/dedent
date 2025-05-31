// Input Types
const inputTypeLibrary = [
  ["email", "password", "search", "tel", "text", "url"],
  ["date", "datetime-local", "month", "number", "time", "week"],
  ["button", "image", "reset", "submit"],
  ["checkbox", "color", "file", "hidden", "radio", "range"]
];

// Infinite For-Loop Problem
  // Generating UI
  if (nefs !== null && (!nefs.logic || checkLogic(nefs.logic))) {
    // reads the nefs.data, else if false then no point generating the UI
    // a data consists of [id, key, description, data], the loop stops for a particular when data = null, then continues the next loop.
    
    if (nefs.data !== null) {
      for (let i = 0; i < nefs.data.length; i++) {
        if (nefs.data[i].data !== null ) {
          if (!nefs.data[i].logic || checkLogic(nefs.data[i].logic)) {
            html += hHeadParser(nefs.data[i]);
            for (let j = 0; j < nefs.data[i].length; j++) {
              if (nefs.data[i].data[j].data !== null) {
                if (!nefs.data[i].data[j].logic || checkLogic(nefs.data[i].data[j].logic)) {
                  html += `
                    <label>
                      ${nefs.data[i].data[j].description}
                    </label>
                    <div>
                  `

                  for (let k = 0; k < nefs.data[i].data[j].length; k++) {
                    if (nefs.data[i].data[j].data[k].data !== null) {
                      if (nefs.data[i].data[j].data[k].logic || checkLogic(nefs.data[i].data[j].data[k].logic)) {
                        html += `
                          <label>
                            ${nefs.data[i].data[j].data[k].description}
                          </label>
                          <div>
                        `
                        // for loop until infinity
                        html += `</div>`
                      } else {
                        html += ""
                      }
                    } else {
                      html += hEndParser (nefs.data[i].data[j].data[k], fieldId);
                    }
                  }

                  html += "</div>"
                } else {
                  html += ""
                }
              } else {
                html += hEndParser (nefs.data[i].data[j], fieldId);
              }
            }
            html += "</div>"
          } else {
            html += ""
          }
        } else {
          html += hEndParser (nefs.data[i], fieldId);
        }
      }
    }
    // hierarchy definition
    
  };