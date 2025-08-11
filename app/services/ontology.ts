// Lightweight ontology mapping and JSON-LD export (no external deps)
// Maps our normalized graph to RDF-friendly JSON-LD so we can reason later.

export type Graph = { nodes: any[]; edges: any[] };

// Namespaces
const NS = {
  base: 'https://moveup.ai/id/',
  ex: 'https://moveup.ai/ontology#',
  schema: 'https://schema.org/',
};

// Canonical class mapping
function classFor(type: string): string {
  const t = (type || '').toLowerCase();
  switch (t) {
    case 'person': return NS.schema + 'Person';
    case 'company': return NS.schema + 'Organization';
    case 'project': return NS.schema + 'CreativeWork';
    case 'skills':
    case 'skill': return NS.schema + 'DefinedTerm';
    case 'education': return NS.schema + 'EducationalOrganization';
    case 'certification': return NS.schema + 'EducationalOccupationalCredential';
    case 'experience': return NS.ex + 'Experience';
    case 'technology': return NS.ex + 'Technology';
    default: return NS.ex + 'Entity';
  }
}

// Predicate mapping
function predicateFor(rel: string): string {
  const r = (rel || '').toUpperCase();
  switch (r) {
    case 'WORKED_AT': return NS.schema + 'worksFor';
    case 'ROLE_AT': return NS.ex + 'hasRole';
    case 'USED_SKILL': return NS.ex + 'usedSkill';
    case 'BUILT': return NS.ex + 'built';
    case 'STUDIED_AT': return NS.schema + 'alumniOf';
    case 'CERTIFIED': return NS.ex + 'hasCredential';
    case 'CONTRIBUTED_TO': return NS.schema + 'contributor';
    default: return NS.ex + 'relatedTo';
  }
}

function asURI(idOrLabel: string): string {
  return NS.base + encodeURIComponent(String(idOrLabel));
}

// Convert our flexible graph shape into JSON-LD with @graph
export function toJsonLd(graph: Graph) {
  const ctx = {
    '@vocab': NS.ex,
    ex: NS.ex,
    schema: NS.schema,
    id: '@id',
    type: '@type',
    name: 'schema:name',
    description: 'schema:description',
  } as const;

  const idSet = new Set<string>();

  const nodeObjs = (graph.nodes || []).map((n: any) => {
    const id = asURI(n.id || n.label || n.name);
    idSet.add(id);
    const klass = classFor(n.type || n.category || 'Entity');
    const obj: any = {
      id,
      type: klass,
      name: n.label || n.name || n.id,
    };
    if (n.description) obj.description = n.description;
    // Copy selected simple literals
    for (const key of ['title','company','role','years','location']) {
      if (n[key] !== undefined && typeof n[key] !== 'object') obj[key] = n[key];
    }
    return obj;
  });

  const triples = (graph.edges || []).map((e: any, i: number) => {
    const s = asURI(e.source);
    const t = asURI(e.target);
    // Skip edges that point to unknown nodes (defensive)
    if (!s || !t) return null;
    const p = predicateFor(e.relation || e.label || '');
    const edgeId = asURI(e.id || `edge_${i}`);
    const obj: any = { id: edgeId, type: NS.ex + 'Relation', subject: s, predicate: p, object: t };
    if (typeof e.weight === 'number') obj.weight = e.weight;
    return obj;
  }).filter(Boolean);

  return {
    '@context': ctx,
    '@graph': [...nodeObjs, ...triples],
    _meta: {
      generatedAt: new Date().toISOString(),
      nodes: nodeObjs.length,
      edges: triples.length,
    },
  };
}

