import { json, type LoaderFunction } from "@remix-run/node";

/*
  GraphDB connector (read-only)
  - Requires env GRAPHDB_ENDPOINT_URL = full SPARQL endpoint for a repository, e.g.:
      https://your-graphdb-host/repositories/myrepo
  - Returns { nodes, edges } in the app's flexible schema
  - Strategy:
    * Query nodes with rdf:type, schema:name/description
    * Query edges in two ways:
        (A) Direct triples on known predicates (schema:worksFor, ex:hasRole, ...)
        (B) Reified edges with ex:Relation (ex:subject, ex:predicate, ex:object)
*/

const NS = {
  schema: "https://schema.org/",
  ex: "https://moveup.ai/ontology#",
};

function localName(iri: string): string {
  try {
    const decoded = decodeURIComponent(iri);
    const idx = Math.max(decoded.lastIndexOf('#'), decoded.lastIndexOf('/'));
    return idx >= 0 ? decoded.slice(idx + 1) : decoded;
  } catch {
    return iri;
  }
}

async function sparql(endpoint: string, query: string) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/sparql-query",
      Accept: "application/sparql-results+json",
    },
    body: query,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GraphDB SPARQL error ${res.status}: ${text}`);
  }
  return (await res.json()) as { head: any; results: { bindings: any[] } };
}

export const loader: LoaderFunction = async ({ request }) => {
  // In production, return empty graph if GraphDB isn't configured
  const isProduction = process.env.NODE_ENV === 'production';
  const endpoint = process.env.GRAPHDB_ENDPOINT_URL;

  if (!endpoint || isProduction) {
    return json({
      nodes: [],
      edges: [],
      lastUpdated: new Date().toISOString(),
      _info: "GraphDB service not available in production"
    });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.max(1, Math.min(10000, Number(searchParams.get("limit") || 2000)));

  const P = (p: string) => `<${p}>`;

  const nodeQuery = `
PREFIX schema: <${NS.schema}>
PREFIX ex: <${NS.ex}>
SELECT ?id ?type ?label ?desc WHERE {
  ?id a ?type .
  OPTIONAL { ?id schema:name ?label }
  OPTIONAL { ?id schema:description ?desc }
}
LIMIT ${limit}
`;

  const knownPreds = [
    `${NS.schema}worksFor`,
    `${NS.schema}alumniOf`,
    `${NS.schema}contributor`,
    `${NS.ex}hasRole`,
    `${NS.ex}usedSkill`,
    `${NS.ex}built`,
    `${NS.ex}hasCredential`,
  ];

  const edgesQuery = `
PREFIX schema: <${NS.schema}>
PREFIX ex: <${NS.ex}>
SELECT ?source ?predicate ?target WHERE {
  { SELECT ?source ?predicate ?target WHERE {
      ?source ?predicate ?target .
      FILTER(isIRI(?source) && isIRI(?target))
      FILTER(?predicate IN (${knownPreds.map(P).join(', ')}))
    } LIMIT ${limit} }
  UNION
  { SELECT ?source ?predicate ?target WHERE {
      ?e a ex:Relation ; ex:subject ?source ; ex:predicate ?predicate ; ex:object ?target .
    } LIMIT ${limit} }
}`;

  try {
    const [nodesRes, edgesRes] = await Promise.all([
      sparql(endpoint, nodeQuery),
      sparql(endpoint, edgesQuery),
    ]);

    // Build node map
    const nodeMap = new Map<string, any>();
    for (const b of nodesRes.results.bindings) {
      const id = b.id?.value as string | undefined;
      if (!id) continue;
      const typeIri = b.type?.value as string | undefined;
      const label = (b.label?.value as string | undefined) || localName(id);
      const desc = b.desc?.value as string | undefined;
      const typeLocal = typeIri ? localName(typeIri).toLowerCase() : 'entity';
      nodeMap.set(id, {
        id,
        label,
        type: typeLocal,
        description: desc,
      });
    }

    // Build edges and ensure both endpoints exist as nodes
    const edges: any[] = [];
    for (const b of edgesRes.results.bindings) {
      const s = b.source?.value as string | undefined;
      const p = b.predicate?.value as string | undefined;
      const o = b.target?.value as string | undefined;
      if (!s || !p || !o) continue;
      if (!nodeMap.has(s)) nodeMap.set(s, { id: s, label: localName(s), type: 'entity' });
      if (!nodeMap.has(o)) nodeMap.set(o, { id: o, label: localName(o), type: 'entity' });
      edges.push({ id: `${s}->${o}::${localName(p)}`, source: s, target: o, relation: localName(p), weight: 1 });
    }

    const nodes = Array.from(nodeMap.values());
    return json({ nodes, edges, lastUpdated: new Date().toISOString() }, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (err: any) {
    console.error("/api.graph.graphdb error:", err);
    return json({ error: String(err?.message || err || 'GraphDB error') }, { status: 502 });
  }
};

