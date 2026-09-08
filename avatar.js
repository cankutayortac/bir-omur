/* Original, deterministic character artwork. No remote assets or SVG input. */
(function (scope) {
  "use strict";

  const SKINS = ["#e8b58d", "#c88c65", "#ad7353", "#85533f", "#f2cdb0"];
  const SHIRTS = ["#54847d", "#d78168", "#b49c60", "#6c7897", "#96778a"];
  const HAIR = { black: "#34312f", brown: "#634737", blond: "#bf925a", blonde: "#bf925a", ginger: "#ab6041", gray: "#c3bdb3", grey: "#c3bdb3" };
  const INK = "#433d38";
  let sequence = 0;

  function hash(value) {
    let result = 2166136261;
    for (const character of String(value || "life")) result = Math.imul(result ^ character.charCodeAt(0), 16777619);
    return result >>> 0;
  }
  function color(value, fallback) {
    if (typeof value !== "string") return fallback;
    return /^#(?:[a-f\d]{3}|[a-f\d]{6})$/i.test(value) ? value : HAIR[value.toLowerCase()] || fallback;
  }
  function escape(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  }
  function number(value, fallback, min, max) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
  }
  function path(d, fill, extra) {
    return `<path d="${d}" fill="${fill || "none"}" ${extra || ""}/>`;
  }

  function render(person, opts) {
    person = person || {};
    opts = opts || {};
    const appearance = person.appearance || {};
    const seed = hash(person.id || person.name || "player");
    const age = number(person.age, 22, 0, 130);
    const baby = age < 3;
    const child = age >= 3 && age < 12;
    const teen = age >= 12 && age < 18;
    const elder = age >= 60;
    const woman = ["woman", "female", "kadın", "kız"].includes(String(person.gender || "").toLowerCase());
    const health = number((person.stats || {}).health ?? person.health, 85, 0, 100);
    const stress = number((person.stats || {}).stress ?? person.stress, 20, 0, 100);
    const happiness = number((person.stats || {}).happiness ?? (person.stats || {}).mood ?? person.mood, 70, 0, 100);
    const strength = number((person.stats || {}).strength, 40, 0, 100);
    const worried = health < 30 || stress > 75 || happiness < 25;
    const skin = color(appearance.skin, SKINS[seed % SKINS.length]);
    const hairColor = elder ? "#c9c4ba" : color(appearance.color || appearance.hairColor, HAIR[seed % 3 === 0 ? "brown" : "black"]);
    const shirt = color(appearance.shirt, SHIRTS[seed % SHIRTS.length]);
    const requestedHair = appearance.hair || (woman ? "wave" : "short");
    const hair = ["short", "wave", "long", "buzz", "bald"].includes(requestedHair) ? requestedHair : "short";
    const beard = age >= 18 && ["stubble", "full"].includes(appearance.beard) ? appearance.beard : "none";
    const cx = 100;
    const cy = baby ? 104 : child ? 98 : 93;
    const rx = baby ? 44 : child ? 42 : teen ? 39 : 39 + strength / 100 * 2;
    const ry = baby ? 43 : child ? 47 : 51;
    const left = cx - rx;
    const right = cx + rx;
    const top = cy - ry;
    const chin = cy + ry;
    const eyeY = cy + (baby ? 0 : 2);
    const mouthY = cy + (baby ? 22 : 27);
    const shoulderY = baby ? 160 : child ? 159 : 158;
    const shoulder = baby ? 49 : child ? 58 : 65 + strength * 0.075;
    const line = `stroke="${INK}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`;
    const lightLine = `stroke="${INK}" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"`;
    const titleId = `life-avatar-title-${++sequence}`;
    const title = `${person.name ? person.name + ", " : "Karakter, "}${Math.floor(age)} yaş`;
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" class="avatar-svg" viewBox="0 0 200 220" role="img" aria-labelledby="${titleId}"><title id="${titleId}">${escape(title)}</title>`;

    if (opts.bg) {
      svg += '<circle cx="100" cy="109" r="91" fill="#f2eadc"/>';
      svg += '<circle cx="169" cy="51" r="5" fill="#d4b788" opacity=".55"/><circle cx="33" cy="145" r="3" fill="#96b6a6"/>';
      svg += '<path d="M28 71h8m-4-4v8M163 132h8m-4-4v8" fill="none" stroke="#b1bfb0" stroke-width="2" stroke-linecap="round"/>';
    }

    // Back hair has its own silhouette so changing hairstyles alters the outline.
    if (!baby && (hair === "long" || hair === "wave" && woman)) {
      svg += path(`M${left - 7} ${cy + 8} C${left - 14} ${top - 18} ${right + 16} ${top - 23} ${right + 8} ${cy + 8} L${right + 13} ${shoulderY + 20} Q100 ${shoulderY + 37} ${left - 16} ${shoulderY + 18} Z`, hairColor, line);
      svg += path(`M${left - 2} ${cy + 29} Q${left + 5} ${shoulderY + 1} ${left - 4} ${shoulderY + 18} M${right + 2} ${cy + 29} Q${right - 5} ${shoulderY + 1} ${right + 4} ${shoulderY + 18}`, "none", 'stroke="#ffffff" stroke-opacity=".1" stroke-width="3"');
    }

    // Shoulders, softly tailored clothes, and neck remain visible at small sizes.
    svg += path(`M${100 - shoulder} 220 L${100 - shoulder + 3} ${shoulderY + 33} Q${100 - shoulder + 6} ${shoulderY + 6} 77 ${shoulderY - 2} L123 ${shoulderY - 2} Q${100 + shoulder - 6} ${shoulderY + 6} ${100 + shoulder - 3} ${shoulderY + 33} L${100 + shoulder} 220 Z`, shirt, line);
    svg += path(`M84 ${chin - 10} L83 ${shoulderY} Q100 ${shoulderY + 20} 117 ${shoulderY} L116 ${chin - 10} Z`, skin, line);
    svg += path(`M84 ${chin - 3} Q100 ${chin + 7} 116 ${chin - 3} L116 ${chin + 6} Q100 ${chin + 15} 84 ${chin + 6} Z`, "#744b39", 'opacity=".13"');

    if (baby) {
      svg += path("M75 159 Q100 177 125 159 L126 193 Q100 214 74 193 Z", "#f5ead2", line);
      svg += '<path d="M94 184q6-9 12 0q4 8-6 13q-10-5-6-13" fill="#d78168"/>';
    } else {
      svg += path(`M77 ${shoulderY - 2} Q100 ${shoulderY + 26} 123 ${shoulderY - 2}`, "none", `stroke="${INK}" stroke-width="2" opacity=".8"`);
      svg += path(`M74 ${shoulderY + 2} Q100 ${shoulderY + 31} 126 ${shoulderY + 2}`, "none", 'stroke="#ffffff" stroke-width="3" opacity=".2"');
      svg += path("M55 198L53 220M145 198L147 220", "none", `stroke="${INK}" stroke-width="1.6" opacity=".3"`);
      if (!child) svg += path("M124 191h16v13q-8 6-16 0z", "none", 'stroke="#ffffff" stroke-width="1.5" opacity=".27"');
    }

    // Ears and a continuous cheek/jaw contour avoid the old age-sprite look.
    svg += `<ellipse cx="${left}" cy="${cy + 6}" rx="8" ry="11" fill="${skin}" ${line}/><ellipse cx="${right}" cy="${cy + 6}" rx="8" ry="11" fill="${skin}" ${line}/>`;
    svg += path(`M${left - 1} ${cy + 4}q5-3 4 5M${right + 1} ${cy + 4}q-5-3-4 5`, "none", 'stroke="#9d6c56" stroke-width="1.5" stroke-linecap="round" opacity=".6"');
    svg += path(`M${left} ${cy - 7} C${left} ${top - 4} ${right} ${top - 4} ${right} ${cy - 7} L${right - 2} ${cy + 18} C${right - 5} ${chin - 4} 114 ${chin + 3} 100 ${chin + 3} C86 ${chin + 3} ${left + 5} ${chin - 4} ${left + 2} ${cy + 18} Z`, skin, line);
    svg += path(`M${right - 2} ${cy - 5} Q${right + 1} ${chin - 7} 100 ${chin + 3} Q125 ${chin + 6} ${right - 2} ${cy + 18}Z`, "#80533e", 'opacity=".075"');

    // Age-specific hair is layered above the forehead, never painted over eyes.
    if (baby) {
      if (hair !== "bald") svg += path(`M89 ${top + 9} Q96 ${top - 8} 107 ${top + 1} Q116 ${top + 10} 103 ${top + 12} Q98 ${top + 13} 101 ${top + 7}`, "none", `stroke="${hairColor}" stroke-width="5" stroke-linecap="round"`);
    } else if (hair === "short") {
      svg += path(`M${left - 1} ${cy - 7} L${left - 5} ${top + 17} Q${left - 8} ${top - 6} 88 ${top - 7} L106 ${top - 13} L104 ${top - 5} Q137 ${top - 8} ${right + 4} ${top + 16} L${right + 1} ${cy - 5} L${right - 7} ${cy - 13} L${right - 9} ${top + 22} Q108 ${top + 30} 87 ${top + 16} Q75 ${top + 28} ${left + 7} ${cy - 12} L${left + 5} ${cy + 2} Z`, hairColor, line);
      svg += path(`M77 ${top + 6}Q94 ${top - 2} 119 ${top + 8}`, "none", 'stroke="#ffffff" stroke-opacity=".12" stroke-width="3" stroke-linecap="round"');
    } else if (hair === "wave") {
      svg += path(`M${left + 1} ${cy} Q${left - 13} ${cy - 23} ${left - 4} ${top + 13} Q${left - 6} ${top - 5} 79 ${top - 5} Q91 ${top - 22} 111 ${top - 10} Q132 ${top - 14} 139 ${top + 5} Q${right + 15} ${top + 12} ${right + 3} ${cy - 1} L${right - 5} ${cy - 10} Q${right - 3} ${top + 28} 124 ${top + 18} Q109 ${top + 37} 86 ${top + 22} Q77 ${top + 36} ${left + 6} ${cy - 10} L${left + 5} ${cy + 1}Z`, hairColor, line);
      svg += path(`M75 ${top + 10} Q93 ${top - 6} 109 ${top + 6} M116 ${top + 4}Q133 ${top + 4} 135 ${top + 19}`, "none", 'stroke="#ffffff" stroke-opacity=".13" stroke-width="3" stroke-linecap="round"');
    } else if (hair === "long") {
      svg += path(`M${left - 1} ${cy + 9} Q${left - 13} ${top - 9} 100 ${top - 11} Q${right + 12} ${top - 6} ${right + 4} ${cy + 19} L${right - 6} ${cy + 8} Q${right - 5} ${top + 26} 104 ${top + 12} Q86 ${top + 34} ${left + 9} ${cy - 2} L${left + 4} ${cy + 21} Z`, hairColor, line);
      svg += path(`M102 ${top - 2}Q81 ${top + 10} ${left + 2} ${cy - 4}`, "none", 'stroke="#ffffff" stroke-opacity=".15" stroke-width="3" stroke-linecap="round"');
    } else if (hair === "buzz") {
      svg += path(`M${left} ${cy - 10} Q${left - 1} ${top - 1} 100 ${top - 1} Q${right + 1} ${top - 1} ${right} ${cy - 10} L${right - 7} ${cy - 16} Q${right - 10} ${top + 14} 100 ${top + 13} Q${left + 10} ${top + 14} ${left + 7} ${cy - 16} Z`, hairColor, line);
      svg += path(`M79 ${top + 10}l2-2m8-1l2-2m8 0l2-2m8 2l2-2m8 6l2-2`, "none", 'stroke="#ffffff" stroke-opacity=".22" stroke-width="1.5"');
    } else if (elder) {
      svg += path(`M${left} ${cy - 14}l5-13l3 22l-7 5zM${right} ${cy - 14}l-5-13l-3 22l7 5z`, hairColor);
    }

    // Soft cheek color, understated brows, eyes and nose keep expression legible.
    const cheeks = health < 30 ? ".08" : baby ? ".34" : ".22";
    svg += `<ellipse cx="${left + 13}" cy="${eyeY + 17}" rx="9" ry="5" fill="#ce735f" opacity="${cheeks}"/><ellipse cx="${right - 13}" cy="${eyeY + 17}" rx="9" ry="5" fill="#ce735f" opacity="${cheeks}"/>`;
    svg += worried
      ? path(`M76 ${eyeY - 10}l10-4M114 ${eyeY - 14}l10 4`, "none", `stroke="${hairColor}" stroke-width="2.6" stroke-linecap="round"`)
      : path(`M75 ${eyeY - 11}q6-3 12 0M113 ${eyeY - 11}q6-3 12 0`, "none", `stroke="${hairColor}" stroke-width="2.6" stroke-linecap="round"`);
    svg += `<ellipse cx="81" cy="${eyeY}" rx="${baby ? 3.5 : 2.9}" ry="${baby ? 4.5 : worried ? 3.1 : 4}" fill="${INK}"/><ellipse cx="119" cy="${eyeY}" rx="${baby ? 3.5 : 2.9}" ry="${baby ? 4.5 : worried ? 3.1 : 4}" fill="${INK}"/>`;
    svg += `<circle cx="82" cy="${eyeY - 1.3}" r=".85" fill="#fff"/><circle cx="120" cy="${eyeY - 1.3}" r=".85" fill="#fff"/>`;
    if (woman && age >= 12) svg += path(`M77 ${eyeY - 1}l-2-2M123 ${eyeY - 1}l2-2`, "none", lightLine);
    svg += path(`M100 ${eyeY + 5}l-3 9q3 3 6 0`, "none", 'stroke="#93684f" stroke-width="1.6" stroke-linecap="round" opacity=".65"');

    if (beard === "full") {
      svg += path(`M${left + 5} ${cy + 15} Q${left + 15} ${cy + 34} 89 ${cy + 25} Q100 ${cy + 20} 111 ${cy + 25} Q${right - 15} ${cy + 34} ${right - 5} ${cy + 15} L${right - 5} ${cy + 30} Q130 ${chin + 5} 100 ${chin + 9} Q70 ${chin + 5} ${left + 5} ${cy + 30} Z`, hairColor);
      svg += `<ellipse cx="100" cy="${mouthY + 1}" rx="10" ry="5" fill="${skin}"/>`;
      svg += path(`M89 ${chin - 3}l2 4m9-2v5m9-7l-2 4`, "none", 'stroke="#ffffff" stroke-width="1.5" opacity=".14" stroke-linecap="round"');
    } else if (beard === "stubble") {
      svg += path(`M${left + 7} ${cy + 20} Q100 ${chin + 8} ${right - 7} ${cy + 20} Q${right - 9} ${chin - 1} 100 ${chin + 2} Q${left + 9} ${chin - 1} ${left + 7} ${cy + 20}Z`, hairColor, 'opacity=".18"');
      svg += path(`M79 ${mouthY + 2}l1 2m9 6l1 2m10-1v2m10-3l-1 2m11-10l-1 2`, "none", `stroke="${hairColor}" stroke-width="1.5" stroke-linecap="round" opacity=".55"`);
    }

    if (worried) svg += path(`M91 ${mouthY + 3}q9-7 18 0`, "none", lightLine);
    else if (baby) svg += `<ellipse cx="100" cy="${mouthY}" rx="5" ry="4" fill="#8d5348"/><path d="M96 ${mouthY + 1}q4-2 8 0" stroke="#e3988c" stroke-width="2" fill="none"/>`;
    else svg += path(`M90 ${mouthY}q10 9 20 0`, "none", lightLine);

    if (elder) {
      svg += path(`M86 ${eyeY - 22}q14-4 28 0M90 ${eyeY - 27}q10-2 20 0M69 ${eyeY + 3}l-3 2m65-2l3 2M85 ${mouthY - 4}l-2 7m32-7l2 7`, "none", 'stroke="#956b54" stroke-width="1.3" stroke-linecap="round" opacity=".5"');
      svg += path(`M75 ${eyeY + 8}q6 3 12 0M113 ${eyeY + 8}q6 3 12 0`, "none", 'stroke="#956b54" stroke-width="1.2" opacity=".4"');
    }
    if (appearance.glasses === true) {
      svg += `<g fill="none" stroke="${INK}" stroke-width="2"><rect x="69" y="${eyeY - 8}" width="25" height="20" rx="7"/><rect x="106" y="${eyeY - 8}" width="25" height="20" rx="7"/><path d="M94 ${eyeY - 1}q6-4 12 0M69 ${eyeY - 2}h-7M131 ${eyeY - 2}h7"/></g>`;
    }
    svg += "</svg>";
    return svg;
  }

  const api = Object.freeze({ render });
  scope.LifeAvatar = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
