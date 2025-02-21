// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { _createElement } from "simple-jsx-handler";
declare const React: JSX.IntrinsicElements;

import { TypeDefinitionAdditional } from "./types";

export function createField(
  definition: TypeDefinitionAdditional,
  initialGetter: (key: string) => unknown | undefined,
  setter: (key: string, value: unknown | null) => void
): HTMLElement {
  const inputs: HTMLElement[] = [];
  if (definition.type === "input") {
    const input = (
      <input
        class="form-input"
        type="text"
        on:input={() => {
          if (input.value && input.value !== definition.default) {
            setter(definition.key, definition.isNumber ? Number(input.value) || null : input.value);
          } else {
            setter(definition.key, null);
          }
        }}
      ></input>
    );

    const initial = initialGetter(definition.key);
    if (initial !== undefined) {
      input.value = initial;
    } else if (definition.default) {
      input.value = definition.default;
    }

    inputs.push(input);

    if (definition.autocomplete) {
      const list = createAutocomplete(input, definition.autocomplete, value => {
        input.value = value;
        setter(definition.key, value);
      });
      inputs.push(list);
    }
  } else if (definition.type === "select") {
    const input = (
      <select class="form-select" on:change={() => setter(definition.key, input.value)}>
        {...definition.options.map(option => <option value={option}>{option}</option>)}
      </select>
    );

    const initial = initialGetter(definition.key);
    if (initial !== undefined) {
      input.value = initial;
      setter(definition.key, initial);
    }

    inputs.push(input);
  } else if (definition.type === "icon") {
    const input = (
      <input
        class="form-input"
        type="text"
        on:input={() => {
          if (select.value === "item" || select.value === "texture") {
            setter(definition.key, { [select.value]: input.value });
          }
        }}
      ></input>
    );

    const select = (
      <select
        class="form-select"
        style="flex-grow: unset"
        on:change={() => {
          if (input.value) {
            setter(definition.key, { [select.value]: input.value });
          }
        }}
      >
        <option value="item">Item</option>
        <option value="texture">Texture</option>
      </select>
    );

    const initial = initialGetter(definition.key);
    if (initial !== undefined) {
      if (typeof initial === "object" && initial !== null) {
        if ("item" in initial) {
          input.value = initial.item;
          select.value = "item";
        }

        if ("texture" in initial) {
          input.value = initial.texture;
          select.value = "texture";
        }
      }
    }

    inputs.push(input, select);
  } else if (definition.type === "boolean") {
    const input = (
      <select class="form-select" on:change={() => setter(definition.key, input.value === "true")}>
        <option value="true">True</option>
        <option value="false">False</option>
      </select>
    );

    const initial = initialGetter(definition.key);
    if (initial !== undefined) {
      input.value = String(initial);
      setter(definition.key, initial === "true" || initial === true);
    }

    inputs.push(input);
  } else if (definition.type === "textarea") {
    const input = (
      <textarea
        class="form-input"
        on:input={() => {
          if (input.value && input.value !== definition.default) {
            setter(definition.key, input.value);
          } else {
            setter(definition.key, null);
          }
        }}
      ></textarea>
    );

    const initial = initialGetter(definition.key);
    if (initial !== undefined) {
      input.value = initial;
    } else if (definition.default) {
      input.value = definition.default;
    }

    inputs.push(input);
  } else {
    const input = <input class="form-input disabled" type="text" disabled></input>;
    input.value = "Error in definition! Report this to the developer.";

    inputs.push(input);
  }

  return (
    <div class="form-group">
      <div class="input-group">
        <span class="input-group-addon min-w-5em text-right">{definition.name}</span>
        {...inputs}
        <div class="input-group-addon popover popover-right">
          <div class="noselect">?</div>
          <div class="popover-container card p-0">
            <div class="card-body ws-collapse" id="tooltip">
              {definition.description}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function createAutocomplete(
  input: HTMLInputElement,
  options: string[],
  setter: (value: string) => void
): HTMLElement {
  const list: HTMLUListElement = <ul class="menu autocomplete"></ul>;

  function hide() {
    list.style.display = "none";
  }

  function show() {
    list.style.display = "block";
    setStyle();
  }

  input.addEventListener("input", () => {
    if (!input.value) {
      hide();
      return;
    }

    list.innerHTML = "";

    const value = input.value.toLowerCase();
    const filtered = options
      .filter(option => option.toLowerCase().includes(value))
      .sort((a, b) => {
        // First show the ones that start with the value
        const aStartsWith = a.toLowerCase().startsWith(value);
        const bStartsWith = b.toLowerCase().startsWith(value);
        if (aStartsWith && !bStartsWith) {
          return -1;
        } else if (!aStartsWith && bStartsWith) {
          return 1;
        }

        // Then show the ones that contain the value (sorted by how soon the value appears)
        const aIndex = a.toLowerCase().indexOf(value);
        const bIndex = b.toLowerCase().indexOf(value);

        if (aIndex < bIndex) {
          return -1;
        } else if (aIndex > bIndex) {
          return 1;
        }

        // Then sort alphabetically
        return a.localeCompare(b);
      })
      .slice(0, 100);

    if (filtered.length === 0) {
      hide();
      return;
    } else {
      show();
    }

    for (const option of filtered) {
      const item: HTMLLIElement = (
        <li class="menu-item">
          <a href="#">{option}</a>
        </li>
      );
      item.addEventListener("click", e => {
        e.preventDefault();
        setter(option);
        hide();
      });
      list.appendChild(item);
    }

    console.log({ [value]: filtered, length: list.childNodes.length });

    setStyle();
  });

  function setStyle() {
    list.style.width = input.clientWidth + "px";
    list.style.left = input.offsetLeft + "px";
    list.style.top = input.offsetTop + input.clientHeight + "px";
  }

  window.addEventListener("resize", function resize() {
    if (!list.isConnected) {
      window.removeEventListener("resize", resize);
      return;
    }

    setStyle();
  });

  function handleNav(e: KeyboardEvent) {
    if (list.style.display === "none" || list.childNodes.length === 0) {
      return;
    }

    const key = e.key;
    const hasShift = e.shiftKey;
    // Focused item
    let current = document.activeElement as HTMLElement | null;
    if (!list.contains(current)) {
      console.log("current not in list");
      current = null;
    } else {
      if (current?.tagName !== "A") {
        current = current?.querySelector("a") || null;
      }
    }

    console.log("current:", current);

    if (key === "ArrowDown" || (key == "Tab" && !hasShift)) {
      e.preventDefault();
      if (!current) {
        (list.firstChild?.firstChild as HTMLElement).focus();
      } else {
        const next = current.parentElement?.nextElementSibling?.firstChild as HTMLElement;
        if (next) {
          console.log("next:", next);
          next.focus();
        }
      }
    } else if (key === "ArrowUp" || (key == "Tab" && hasShift)) {
      e.preventDefault();
      if (!current) {
        (list.lastChild?.firstChild as HTMLElement).focus();
      } else {
        const prev = current.parentElement?.previousElementSibling?.firstChild as HTMLElement;
        if (prev) {
          console.log("prev:", prev);
          prev.focus();
        }
      }
    } else if (key === "Enter") {
      e.preventDefault();
      if (current) {
        setter(current.textContent || "");
        hide();
      }
    }
  }

  input.addEventListener("keydown", handleNav);
  list.addEventListener("keydown", handleNav);

  hide();

  return list;
}
