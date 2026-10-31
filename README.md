# Prompt Studio

Interfaz para organizar prompts, editar plantillas y crear prompts compuestos. La demo guarda sus cambios en `localStorage`; el contrato de datos y el índice de Firestore están preparados para conectar un proyecto Firebase.

## Modelo Firestore

Colección `prompts`, documento `prompts/{promptId}`. El contrato TypeScript está en [`lib/prompts.ts`](lib/prompts.ts).

```ts
{
  promptId: string,                         // igual al ID del documento
  title: string,
  type: "base" | "composite",
  content: string,                          // variables con {{nombre}}
  topics: string[],                          // slugs, ej. ["research", "writing"]
  components: Array<{ promptId: string; order: number }>,
  variables: string[],                       // derivadas de content
  metadata: { author: string; version: number; isPublic: boolean },
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

Los prompts base deben tener `components: []`. Al guardar, recalcula `variables` a partir de `content` y asigna órdenes consecutivos a los componentes. `resolvePrompt` resuelve referencias recursivas en orden y detecta ciclos.

## Consultas e índices

`topics` permite usar `array-contains`; para varios tópicos, `array-contains-any` (hasta 30 valores). La consulta por tópico, tipo y fecha necesita el índice compuesto declarado en `firestore.indexes.json`:

```ts
query(
  collection(db, "prompts"),
  where("topics", "array-contains", "research"),
  where("type", "==", "base"),
  orderBy("updatedAt", "desc"),
)
```

Publica el índice al configurar Firebase CLI con `firebase deploy --only firestore:indexes`.

## Ejecutar

```bash
npm install
npm run dev
```

Para conectar Firestore, configura una app Firebase y sus variables `NEXT_PUBLIC_FIREBASE_*`, instala el SDK `firebase` y sustituye el almacenamiento local de `app/page.tsx` por lecturas y escrituras de `prompts/{promptId}`. Es importante validar permisos con reglas de Firestore; `isPublic` por sí solo no controla el acceso.
