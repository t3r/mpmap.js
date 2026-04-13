/**
 * Maps FG model id substrings to CSS sprite classes under `static/acicons/icons.css`.
 * Keys are matched case-insensitively as prefixes of the model name from the server.
 */
const MODEL_ICON_BY_KEY: Record<string, string> = {
  bo105: 'heli',
  sikorsky76c: 'heli',
  ec135: 'heli',
  r22: 'heli',
  s76c: 'heli',
  'Lynx-WG13': 'heli',
  'S51-sikorsky': 'heli',
  CH47: 'heli',
  R22: 'heli',
  'apache-model': 'heli',
  'uh-1': 'heli',
  uh60: 'heli',
  'OH-1': 'heli',
  ec130: 'heli',

  c150: 'singleprop',
  c172: 'singleprop',
  c182: 'singleprop',
  dhc2: 'singleprop',
  pa28: 'singleprop',
  pa38: 'singleprop',

  pc7: 'singleprop',
  j3cub: 'singleprop',

  C208B: 'singleprop',
  c310: 'twinprop',
  Boeing314: 'twinprop',
  Lockheed1049: 'twinprop',
  'TU-114': 'twinprop',
  b1900d: 'twinprop',
  b29: 'twinprop',
  beech99: 'twinprop',
  dc3: 'twinprop',
  fokker50: 'twinprop',
  SenecaII: 'twinprop',
  DHC6: 'twinprop',
  DHC6F: 'twinprop',
  DHC6S: 'twinprop',

  Citation: 'smalljet',
  Bravo: 'smalljet',
  fokker100: 'smalljet',
  tu154B: 'smalljet',

  boeing733: 'heavyjet',
  boeing747: 'heavyjet',
  a320: 'heavyjet',
  A380: 'heavyjet',
  'AN-225': 'heavyjet',
  'B-52F': 'heavyjet',
  Concorde: 'heavyjet',
  FINNAIRmd11: 'heavyjet',
  MD11: 'heavyjet',
  KLMmd11: 'heavyjet',
  '737': 'heavyjet',
  '787': 'heavyjet',
  '777': 'heavyjet',
  '747': 'heavyjet',

  'hgldr-cs': 'glider',
  paraglider: 'glider',
  colditz: 'glider',
  sgs233: 'glider',

  'ZLT-NT': 'blimp',
  'ZF-balloon': 'blimp',
  Submarine_Scout: 'blimp',
  'LZ-129': 'blimp',
  Excelsior: 'blimp',

  'mp-nimitz': 'fg_carrier',
  'mp-eisenhower': 'fg_carrier',
  'mp-foch': 'fg_carrier',
  'mp-clemenceau': 'fg_carrier',

  OV10: 'ov10',

  KC135: 'kc135',
  'ch53e-model': 'ch53e',
  E3B: 'e3b',
  ufo: 'ufo',

  mibs: 'atc2',
  atc: 'atc2',
  OpenRadar: 'atc2',
}

export function resolveModelIconClass(model: string): string {
  const lower = model.toLowerCase()
  for (const key of Object.keys(MODEL_ICON_BY_KEY)) {
    if (lower.startsWith(key.toLowerCase())) return MODEL_ICON_BY_KEY[key]
  }
  return 'fg_generic_craft'
}
