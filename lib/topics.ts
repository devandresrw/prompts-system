"use client";

import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { getFirestoreClient } from "./firebase";

export const TOPICS_COLLECTION = "topics";
const LOCAL_STORAGE_KEY = "prompt-studio-topics-v1";

export interface TopicDocument {
  id: string;
  name: string;
  description: string;
  slug: string;
  /** Null means this is a top-level topic; otherwise it references its parent. */
  parentId: string | null;
  isFavorite: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

function fromFirestore(snapshot: QueryDocumentSnapshot<DocumentData>): TopicDocument {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    name: String(data.name ?? ""),
    description: String(data.description ?? ""),
    slug: String(data.slug ?? ""),
    parentId: typeof data.parentId === "string" ? data.parentId : null,
    isFavorite: Boolean(data.isFavorite),
    order: Number(data.order ?? 0),
    createdAt: String(data.createdAt ?? ""),
    updatedAt: String(data.updatedAt ?? ""),
  };
}

function readLocalTopics(): TopicDocument[] {
  try {
    const topics = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) ?? "[]") as Array<Partial<TopicDocument>>;
    return topics.map((topic) => ({ ...topic, description: topic.description ?? "" }) as TopicDocument);
  } catch {
    return [];
  }
}

function writeLocalTopics(topics: TopicDocument[]) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(topics));
  window.dispatchEvent(new Event("prompt-studio-topics-updated"));
}

export function subscribeToTopics(
  onTopics: (topics: TopicDocument[]) => void,
  onError: (error: Error) => void,
) {
  const firestore = getFirestoreClient();
  if (!firestore) {
    const refresh = () => onTopics(readLocalTopics());
    refresh();
    window.addEventListener("prompt-studio-topics-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("prompt-studio-topics-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }

  return onSnapshot(
    query(collection(firestore, TOPICS_COLLECTION), orderBy("order", "asc")),
    (snapshot) => onTopics(snapshot.docs.map(fromFirestore)),
    (error) => onError(error),
  );
}

export async function createTopic(name: string, description: string, parentId: string | null, topics: TopicDocument[]): Promise<TopicDocument> {
  const normalizedName = name.trim();
  if (!normalizedName) throw new Error("Escribe el nombre del topic.");
  const normalizedDescription = description.trim();
  if (!normalizedDescription) throw new Error("Escribe una descripción para el topic.");
  const now = new Date().toISOString();
  const siblings = topics.filter((topic) => topic.parentId === parentId);
  const baseSlug = normalizedName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "topic";
  const usedSlugs = new Set(topics.map((topic) => topic.slug));
  let slug = baseSlug;
  let suffix = 2;
  while (usedSlugs.has(slug)) slug = `${baseSlug}-${suffix++}`;
  const data = {
    name: normalizedName,
    description: normalizedDescription,
    slug,
    parentId,
    isFavorite: false,
    order: siblings.length,
    createdAt: now,
    updatedAt: now,
  };

  const firestore = getFirestoreClient();
  if (firestore) {
    const reference = await addDoc(collection(firestore, TOPICS_COLLECTION), data);
    return { ...data, id: reference.id };
  }

  const id = `topic-${crypto.randomUUID()}`;
  const createdTopic = { ...data, id };
  writeLocalTopics([...topics, createdTopic]);
  return createdTopic;
}

export async function setTopicFavorite(topicId: string, isFavorite: boolean, topics: TopicDocument[]) {
  const firestore = getFirestoreClient();
  if (firestore) {
    await updateDoc(doc(firestore, TOPICS_COLLECTION, topicId), { isFavorite, updatedAt: new Date().toISOString() });
    return;
  }
  writeLocalTopics(topics.map((topic) => topic.id === topicId
    ? { ...topic, isFavorite, updatedAt: new Date().toISOString() }
    : topic));
}

