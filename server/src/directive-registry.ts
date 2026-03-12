import directivesData from './data/directives.json';
import filtersData from './data/filters.json';
import validatorsData from './data/validators.json';

export interface CompanionMeta {
  name: string;
  type: string;
  description: string;
}

export interface DirectiveMeta {
  name: string;
  pattern: boolean;
  priority: number;
  valueType: string;
  valueDescription: string;
  requiresValue: boolean;
  companions: CompanionMeta[];
  companionsSameAs?: string;
  childAttributes?: CompanionMeta[];
  documentation: string;
  category: string;
}

export interface PatternMeta {
  name: string;
  prefix: string;
  priority: number;
  valueType: string;
  valueDescription: string;
  requiresValue: boolean;
  documentation: string;
  commonTargets?: string[];
  commonEvents?: string[];
  subBehaviors?: string[];
  modifiers?: {
    behavioral: string[];
    timing: string[];
    key: string[];
  };
  category: string;
}

export interface FilterMeta {
  name: string;
  description: string;
  args: { name: string; type: string; required?: boolean; default?: unknown }[];
  example: string;
  category: string;
}

export interface ValidatorMeta {
  name: string;
  description: string;
  args: { name: string; type: string; required?: boolean }[];
  example: string;
}

const data = directivesData as {
  directives: DirectiveMeta[];
  patterns: PatternMeta[];
  lifecycleEvents: string[];
  contextKeys: string[];
  loopContextVars: string[];
  eventHandlerVars: string[];
  watchHandlerVars: string[];
  dropHandlerVars: string[];
  animations: string[];
};

// Build the maps once at startup
const directiveMap = new Map<string, DirectiveMeta>();
const patternList: PatternMeta[] = data.patterns;
const filterMap = new Map<string, FilterMeta>();
const validatorMap = new Map<string, ValidatorMeta>();

// Resolve companionsSameAs references
const directivesByName = new Map<string, DirectiveMeta>();
for (const d of data.directives) {
  directivesByName.set(d.name, d);
}

for (const d of data.directives) {
  if (d.companionsSameAs && d.companions.length === 0) {
    const ref = directivesByName.get(d.companionsSameAs);
    if (ref) {
      d.companions = ref.companions;
    }
  }
  directiveMap.set(d.name, d);
}

for (const f of filtersData.filters as FilterMeta[]) {
  filterMap.set(f.name, f);
}

for (const v of validatorsData.validators as ValidatorMeta[]) {
  validatorMap.set(v.name, v);
}

/** All known exact-name directives */
export function getAllDirectives(): DirectiveMeta[] {
  return Array.from(directiveMap.values());
}

/** Look up directive by exact name */
export function getDirective(name: string): DirectiveMeta | undefined {
  return directiveMap.get(name);
}

/** Get all pattern-based directives */
export function getPatterns(): PatternMeta[] {
  return patternList;
}

/** Match an attribute name to a directive or pattern */
export function matchDirective(attrName: string): DirectiveMeta | PatternMeta | undefined {
  // Exact match first
  const exact = directiveMap.get(attrName);
  if (exact) return exact;

  // Pattern match
  for (const p of patternList) {
    if (attrName.startsWith(p.prefix)) {
      return p;
    }
  }
  return undefined;
}

/** Check if an attribute is a known directive or matches a pattern */
export function isDirective(attrName: string): boolean {
  return matchDirective(attrName) !== undefined;
}

/** Check if an attribute is a known companion for any directive on the element */
export function isCompanion(attrName: string, elementDirectives: string[]): boolean {
  for (const dirName of elementDirectives) {
    const dir = directiveMap.get(dirName);
    if (dir) {
      if (dir.companions.some(c => c.name === attrName || (c.name.endsWith('*') && attrName.startsWith(c.name.slice(0, -1))))) {
        return true;
      }
    }
  }
  return false;
}

/** Get companion attributes for directives present on an element */
export function getCompanionsForDirectives(elementDirectives: string[]): CompanionMeta[] {
  const companions: CompanionMeta[] = [];
  const seen = new Set<string>();

  for (const dirName of elementDirectives) {
    const dir = matchDirective(dirName);
    if (dir && 'companions' in dir && dir.companions) {
      for (const c of dir.companions) {
        if (!seen.has(c.name)) {
          seen.add(c.name);
          companions.push(c);
        }
      }
    }
  }
  return companions;
}

/** All filters */
export function getAllFilters(): FilterMeta[] {
  return Array.from(filterMap.values());
}

/** Look up filter by name */
export function getFilter(name: string): FilterMeta | undefined {
  return filterMap.get(name);
}

/** All validators */
export function getAllValidators(): ValidatorMeta[] {
  return Array.from(validatorMap.values());
}

/** Look up validator by name */
export function getValidator(name: string): ValidatorMeta | undefined {
  return validatorMap.get(name);
}

/** Lifecycle events for on: directive */
export function getLifecycleEvents(): string[] {
  return data.lifecycleEvents;
}

/** Context keys like $refs, $store, etc. */
export function getContextKeys(): string[] {
  return data.contextKeys;
}

/** Loop context variables */
export function getLoopContextVars(): string[] {
  return data.loopContextVars;
}

/** Animation names */
export function getAnimations(): string[] {
  return data.animations;
}

/** Event handler variables */
export function getEventHandlerVars(): string[] {
  return data.eventHandlerVars;
}

/** Watch handler variables */
export function getWatchHandlerVars(): string[] {
  return data.watchHandlerVars;
}

/** Drop handler variables */
export function getDropHandlerVars(): string[] {
  return data.dropHandlerVars;
}

/** Get event modifiers from on:* pattern */
export function getEventModifiers(): { behavioral: string[]; timing: string[]; key: string[] } {
  const onPattern = patternList.find(p => p.name === 'on:*');
  return onPattern?.modifiers ?? { behavioral: [], timing: [], key: [] };
}

/** HTTP directives set */
const HTTP_DIRECTIVES = new Set(['get', 'post', 'put', 'patch', 'delete']);

export function isHttpDirective(name: string): boolean {
  return HTTP_DIRECTIVES.has(name);
}

/** All directive names (for unknown directive detection) */
export function getAllDirectiveNames(): Set<string> {
  const names = new Set<string>();
  for (const d of directiveMap.keys()) {
    names.add(d);
  }
  return names;
}

/** All companion attribute names across all directives */
export function getAllCompanionNames(): Set<string> {
  const names = new Set<string>();
  for (const d of directiveMap.values()) {
    for (const c of d.companions) {
      if (!c.name.endsWith('*')) {
        names.add(c.name);
      }
    }
  }
  return names;
}
