"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  createTopic,
  setTopicFavorite,
  subscribeToTopics,
  type TopicDocument,
} from "../lib/topics";

function topicHref(topic: TopicDocument, topics: TopicDocument[]) {
  const path = [topic.slug];
  let parentId = topic.parentId;
  while (parentId) {
    const parent = topics.find((item) => item.id === parentId);
    if (!parent) break;
    path.unshift(parent.slug);
    parentId = parent.parentId;
  }
  return `/topics/${path.map(encodeURIComponent).join("/")}`;
}

function TopicForm({
  parentName,
  topicName,
  description,
  setTopicName,
  setDescription,
  onSubmit,
  onCancel,
  busy,
  placement,
}: {
  parentName?: string;
  topicName: string;
  description: string;
  setTopicName: (value: string) => void;
  setDescription: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  busy: boolean;
  placement: "sidebar" | "main";
}) {
  const kind = parentName ? "subrama" : "rama";
  return (
    <form className={`topic-create-form ${placement === "main" ? "topic-editor-form" : ""}`} onSubmit={onSubmit}>
      <label>Nombre de la {kind}<input autoFocus aria-label={`Nombre de la ${kind}`} placeholder={parentName ? "Nombre de la subrama" : "Nombre de la rama"} value={topicName} onChange={(event) => setTopicName(event.target.value)} /></label>
      <label>Descripción<textarea aria-label={`Descripción de la ${kind}`} placeholder="Describe esta rama de conocimiento…" rows={placement === "main" ? 4 : 3} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
      {parentName && <p className="topic-parent-hint">Subrama de <b>{parentName}</b></p>}
      <div><button type="submit" disabled={busy || !topicName.trim() || !description.trim()}>{busy ? "Guardando…" : `Crear ${kind}`}</button><button type="button" onClick={onCancel}>Cancelar</button></div>
    </form>
  );
}

function TopicLink({
  topic,
  topics,
  childrenByParent,
  onFavorite,
  onAddSubtopic,
  formParent,
  formLocation,
  topicName,
  setTopicName,
  description,
  setDescription,
  onSubmit,
  onCancelForm,
  busy,
}: {
  topic: TopicDocument;
  topics: TopicDocument[];
  childrenByParent: Map<string, TopicDocument[]>;
  onFavorite: (topic: TopicDocument) => void;
  onAddSubtopic: (topic: TopicDocument) => void;
  formParent: string | null | undefined;
  formLocation: "sidebar" | "main" | null;
  topicName: string;
  setTopicName: (name: string) => void;
  description: string;
  setDescription: (description: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancelForm: () => void;
  busy: boolean;
}) {
  return (
    <div className="topic-tree-node">
      <div className="topic-link-row">
        <a className="topic-link" href={topicHref(topic, topics)}>
          <i className="topic-link-dot" />
          <span>{topic.name}</span>
        </a>
        <span className="topic-link-actions">
          <button className={`topic-action favorite-action ${topic.isFavorite ? "is-favorite" : ""}`} type="button" aria-label={topic.isFavorite ? `Quitar ${topic.name} de favoritos` : `Añadir ${topic.name} a favoritos`} title={topic.isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"} onClick={() => onFavorite(topic)}>{topic.isFavorite ? "★" : "☆"}</button>
          <button className="topic-action" type="button" aria-label={`Añadir subtopic a ${topic.name}`} title="Añadir subtopic" onClick={() => onAddSubtopic(topic)}>+</button>
        </span>
      </div>
      {formParent === topic.id && formLocation === "sidebar" && <TopicForm parentName={topic.name} topicName={topicName} description={description} setTopicName={setTopicName} setDescription={setDescription} onSubmit={onSubmit} onCancel={onCancelForm} busy={busy} placement="sidebar" />}
      {(childrenByParent.get(topic.id) ?? []).length > 0 && (
        <div className="topic-subtree">
          {(childrenByParent.get(topic.id) ?? []).map((child) => (
            <TopicLink key={child.id} topic={child} topics={topics} childrenByParent={childrenByParent} onFavorite={onFavorite} onAddSubtopic={onAddSubtopic} formParent={formParent} formLocation={formLocation} topicName={topicName} setTopicName={setTopicName} description={description} setDescription={setDescription} onSubmit={onSubmit} onCancelForm={onCancelForm} busy={busy} />
          ))}
        </div>
      )}
    </div>
  );
}

type SidebarRoute = "recientes" | "prompts" | "constructor" | "topics";
const routeLabels: Record<SidebarRoute, string> = {
  recientes: "Recientes",
  prompts: "Prompts",
  constructor: "Constructor",
  topics: "Topics",
};

function SidebarIcon({ name }: { name: SidebarRoute }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      {name === "recientes" && <><circle cx="10" cy="10" r="7" /><path d="M10 6v4l2.7 1.7" /></>}
      {name === "prompts" && <><path d="M6 4.5h8a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 14 16.5H6A1.5 1.5 0 0 1 4.5 15V6A1.5 1.5 0 0 1 6 4.5Z" /><path d="M7.5 8h5M7.5 10.5h5M7.5 13h3" /></>}
      {name === "constructor" && <><path d="M4 5.5h12M4 10h12M4 14.5h12" /><circle cx="8" cy="5.5" r="1.5" fill="var(--surface)" /><circle cx="12.5" cy="10" r="1.5" fill="var(--surface)" /><circle cx="7" cy="14.5" r="1.5" fill="var(--surface)" /></>}
      {name === "topics" && <><path d="M7 3.5 5 16.5M14.5 3.5l-2 13M3.5 8h13M2.8 12.5h13" /></>}
    </svg>
  );
}

export default function WorkspaceShell({ topicSlugs = [], section }: { topicSlugs?: string[]; section?: SidebarRoute }) {
  const router = useRouter();
  const [topics, setTopics] = useState<TopicDocument[]>([]);
  const [formParent, setFormParent] = useState<string | null | undefined>(undefined);
  const [formLocation, setFormLocation] = useState<"sidebar" | "main" | null>(null);
  const [topicName, setTopicName] = useState("");
  const [topicDescription, setTopicDescription] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => subscribeToTopics(setTopics, (reason) => setError(reason.message)), []);

  const childrenByParent = useMemo(() => {
    const grouped = new Map<string, TopicDocument[]>();
    for (const topic of topics) {
      const key = topic.parentId ?? "root";
      grouped.set(key, [...(grouped.get(key) ?? []), topic]);
    }
    for (const children of grouped.values()) children.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
    return grouped;
  }, [topics]);
  const rootTopics = childrenByParent.get("root") ?? [];
  const favoriteTopics = topics.filter((topic) => topic.isFavorite).sort((a, b) => a.name.localeCompare(b.name));
  const selectedPathTopics = topicSlugs.reduce<TopicDocument[]>((path, slug) => {
    const parentId = path.at(-1)?.id ?? null;
    const match = topics.find((topic) => topic.slug === slug && topic.parentId === parentId);
    return match ? [...path, match] : path;
  }, []);
  const selectedTopic = selectedPathTopics.at(-1);

  async function submitTopic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const created = await createTopic(topicName, topicDescription, formParent ?? null, topics);
      router.push(topicHref(created, [...topics, created]));
      setTopicName("");
      setTopicDescription("");
      setFormParent(undefined);
      setFormLocation(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo guardar el topic.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleFavorite(topic: TopicDocument) {
    try {
      await setTopicFavorite(topic.id, !topic.isFavorite, topics);
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo actualizar el favorito.");
    }
  }

  function openForm(parentId: string | null, placement: "sidebar" | "main" = "sidebar") {
    setFormParent(parentId);
    setFormLocation(placement);
    setTopicName("");
    setTopicDescription("");
    setError("");
  }

  function closeForm() {
    setFormParent(undefined);
    setFormLocation(null);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <nav className="workspace-links" aria-label="Navegación principal">
          {(["recientes", "prompts", "constructor", "topics"] as const).map((route) => (
            <a className={`workspace-link ${section === route ? "active" : ""}`} href={`/${route}`} key={route} aria-current={section === route ? "page" : undefined}>
              <span className="workspace-link-icon"><SidebarIcon name={route} /></span><span className="workspace-link-label">{routeLabels[route]}</span>
            </a>
          ))}
        </nav>

        <div className="side-label topic-heading">
          FAVORITOS
          <span className="section-count">{favoriteTopics.length}</span>
        </div>
        <nav className="topic-nav" aria-label="Topics favoritos">
          {favoriteTopics.length ? favoriteTopics.map((topic) => (
            <a className="topic-item topic-favorite-link" href={topicHref(topic, topics)} key={topic.id}>
              <span className="topic-star">★</span><span>{topic.name}</span>
            </a>
          )) : <p className="sidebar-empty">Marca una estrella para guardar un topic aquí.</p>}
        </nav>

        <div className="side-label topic-heading">
          <a className="sidebar-section-link" href="/topics">TOPICS</a>
          <button className="side-add-button" aria-label="Crear rama general" title="Crear rama" type="button" onClick={() => openForm(null)}>+</button>
        </div>
        {formParent === null && formLocation === "sidebar" && <TopicForm topicName={topicName} description={topicDescription} setTopicName={setTopicName} setDescription={setTopicDescription} onSubmit={submitTopic} onCancel={closeForm} busy={busy} placement="sidebar" />}
        <nav className="topic-tree" aria-label="Topics">
          {rootTopics.length ? rootTopics.map((topic) => (
            <TopicLink key={topic.id} topic={topic} topics={topics} childrenByParent={childrenByParent} onFavorite={toggleFavorite} onAddSubtopic={(parent) => openForm(parent.id)} formParent={formParent} formLocation={formLocation} topicName={topicName} setTopicName={setTopicName} description={topicDescription} setDescription={setTopicDescription} onSubmit={submitTopic} onCancelForm={closeForm} busy={busy} />
          )) : <p className="sidebar-empty">Aún no hay topics. Crea uno para empezar.</p>}
        </nav>

      </aside>

      <section className="main-area">
        <header className="topbar">
          <div className="breadcrumb">Workspace <span>/</span> <b>Base de conocimiento</b></div>
          <div className="top-actions">
            <button className="help-button" type="button">? <span>Ayuda</span></button>
            <div className="top-avatar">MG</div>
          </div>
        </header>
        <main className="page-content" aria-label="Contenido principal">
          {section && section !== "topics" && <section className="section-view"><p>WORKSPACE</p><h1>{routeLabels[section]}</h1></section>}
          {section === "topics" && topicSlugs.length === 0 && <section className="topic-index"><div className="topic-index-heading"><div><p>COLECCIÓN</p><h1>Ramas de conocimiento</h1></div><button className="primary-button" type="button" onClick={() => openForm(null, "main")}>+ Crear rama</button></div>{formParent === null && formLocation === "main" && <TopicForm topicName={topicName} description={topicDescription} setTopicName={setTopicName} setDescription={setTopicDescription} onSubmit={submitTopic} onCancel={closeForm} busy={busy} placement="main" />}{rootTopics.length ? <nav aria-label="Todas las ramas">{rootTopics.map((topic) => <a href={topicHref(topic, topics)} key={topic.id}><span><b>{topic.name}</b><small>{topic.description}</small></span><span>↗</span></a>)}</nav> : <p className="topic-index-empty">Aún no hay ramas. Crea la primera para organizar el conocimiento.</p>}</section>}
          {topicSlugs.length > 0 && <section className="topic-view"><p>{selectedPathTopics.map((topic) => topic.name).join(" / ") || "TOPICS"}</p><h1>{selectedTopic?.name ?? "Topic no encontrado"}</h1>{selectedTopic && <p className="topic-description">{selectedTopic.description}</p>}{selectedTopic && <button className="topic-subbranch-button" type="button" onClick={() => openForm(selectedTopic.id, "main")}>+ Crear subrama</button>}{formParent && formLocation === "main" && <TopicForm parentName={topics.find((topic) => topic.id === formParent)?.name} topicName={topicName} description={topicDescription} setTopicName={setTopicName} setDescription={setTopicDescription} onSubmit={submitTopic} onCancel={closeForm} busy={busy} placement="main" />}</section>}
          {error && <p className="topic-error" role="status">{error}</p>}
        </main>
      </section>
    </div>
  );
}
