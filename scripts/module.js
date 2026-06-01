/**
 * Mythic Bastionland — Sheet Layout
 *
 * Lays the actor sheet's item categories (abilities, passions, steeds,
 * companions, properties, scars) out side by side instead of in one long
 * stack. The categories render in the system template as a contiguous run of
 * plain <div> blocks (each an <h2> + a list) directly inside .paper.scrollable;
 * the other blocks there all carry the class "grid". On every actor-sheet
 * render this script wraps that run in a single .mbsl-categories container so
 * the stylesheet can flow it into balanced columns, and tags the properties
 * block (matched by its localized heading) so CSS can force it full width.
 *
 * The column count is a per-user setting, published as --mb-list-columns on
 * <body> so the stylesheet reacts live without re-rendering any sheet.
 */

const MODULE_ID = "mb-sheet-layout";

function applyColumnSetting() {
  document.body.style.setProperty("--mb-list-columns", game.settings.get(MODULE_ID, "listColumns"));
}

function groupCategories(scrollable) {
  // Re-render rebuilds the inner HTML, so the wrapper is gone and we rebuild it;
  // bail only if we somehow run twice against the same DOM.
  if (scrollable.querySelector(":scope > .mbsl-categories")) return;

  const categories = [...scrollable.children].filter(
    (el) => !el.classList.contains("grid") && el.querySelector(":scope > h2.text-large")
  );
  if (!categories.length) return;

  const propertyTitle = game.i18n.localize("MB.Actor.Property").trim();
  const wrapper = document.createElement("div");
  wrapper.className = "mbsl-categories";
  categories[0].before(wrapper);

  for (const category of categories) {
    category.classList.add("mbsl-category");
    const heading = category.querySelector(":scope > h2.text-large");
    if (heading?.textContent.trim() === propertyTitle) category.classList.add("mbsl-properties");
    wrapper.appendChild(category);
  }
}

/**
 * For weapons/armour/shields the system renders a stat line as the first <p> of
 * the description: the damage die (an inline-roll), the armour value (A{n}) and
 * the weapon traits (hefty/long/slow). Move that line up onto the name line,
 * after a comma, so it reads "Sword, d6, hefty". Nodes are moved (not copied via
 * innerHTML) so the damage die keeps its already-attached inline-roll listener.
 */
function hoistStatLine(row, description) {
  const first = description.firstElementChild;
  if (!first || first.tagName !== "P") return;

  const isStatLine = first.querySelector('a.inline-roll[data-flavor="damage"]')
    || /^\s*A\d+\s*$/.test(first.textContent);
  if (!isStatLine) return;

  const name = row.querySelector(":scope > .col-9 > .text-bold");
  if (!name || name.querySelector(".mbsl-stats")) return;

  const stats = document.createElement("span");
  stats.className = "mbsl-stats";
  stats.append(", ");
  while (first.firstChild) stats.appendChild(first.firstChild);

  // The template prints the name as a text node followed by an (often empty)
  // quantity span, so the name text carries trailing whitespace. Anchor the
  // comma directly to the name text — appending at the end would render
  // "Sword , d6" with a gap before the comma.
  const nameText = [...name.childNodes].find((n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
  if (nameText) {
    nameText.textContent = nameText.textContent.replace(/\s+$/, "");
    nameText.after(stats);
  } else {
    name.appendChild(stats);
  }
  first.remove();
}

/**
 * Per-row tweaks:
 *  - Hoist the weapon/armour stat line onto the name (see hoistStatLine).
 *  - Lift the .item-description out of the narrow text column so it becomes its
 *    own full-width row beneath the name and buttons (moving the node keeps its
 *    already-attached inline-roll listeners intact).
 *  - Publish the action column's measured width as --mbsl-actions-w, so the CSS
 *    mask dims exactly the slice of the name sitting behind the icons.
 */
function reflowItems(scrollable) {
  for (const row of scrollable.querySelectorAll(".item")) {
    const description = row.querySelector(".item-description");
    if (description) {
      hoistStatLine(row, description);
      if (description.parentElement !== row) row.appendChild(description);
    }

    const actions = row.querySelector(":scope > .col-3");
    if (actions?.offsetWidth) row.style.setProperty("--mbsl-actions-w", `${actions.offsetWidth}px`);
  }
}

Hooks.on("renderMBActorSheet", (app, element) => {
  const root = element instanceof HTMLElement ? element : element?.[0];
  const scrollable = root?.querySelector(".paper.scrollable");
  if (!scrollable) return;
  groupCategories(scrollable);
  reflowItems(scrollable);
});

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, "listColumns", {
    name: "MBSL.Settings.ListColumns.Name",
    hint: "MBSL.Settings.ListColumns.Hint",
    scope: "client",
    config: true,
    type: String,
    choices: {
      "1": "MBSL.Settings.ListColumns.One",
      "2": "MBSL.Settings.ListColumns.Two",
      "3": "MBSL.Settings.ListColumns.Three"
    },
    default: "2",
    onChange: applyColumnSetting
  });
});

Hooks.once("ready", applyColumnSetting);
