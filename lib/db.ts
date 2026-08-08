"use client";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  getCountFromServer,
} from "firebase/firestore";
import { deleteObject, ref } from "firebase/storage";
import { db, storage } from "@/lib/firebase";

export interface AdminUser {
  uid: string;
  username: string;
  name: string;
  email: string;
  photoURL: string;
  bio: string;
  verified: boolean;
  followers: number;
  createdAt: number;
  starred?: string[];
  following?: string[];
}

export interface AdminRepo {
  slug: string;
  uid: string;
  ownerUsername: string;
  title: string;
  description: string;
  tags: string[];
  filesCount: number;
  views: number;
  stars: number;
  createdAt: number;
}

export async function isAdmin(uid: string): Promise<boolean> {
  return (await getDoc(doc(db, "admins", uid))).exists();
}

export async function getStats() {
  const [users, repos] = await Promise.all([
    getCountFromServer(collection(db, "users")),
    getCountFromServer(collection(db, "repos")),
  ]);
  const verifiedQ = query(collection(db, "users"), where("verified", "==", true));
  const verified = await getCountFromServer(verifiedQ);
  const viewsQ = query(collection(db, "repos"), orderBy("views", "desc"), limit(10));
  const topRepos = await getDocs(viewsQ);
  const totalViews = topRepos.docs.reduce((a, d) => a + (d.data().views || 0), 0);
  return {
    users: users.data().count,
    repos: repos.data().count,
    verified: verified.data().count,
    totalViews,
  };
}

export async function listUsers(search: string = ""): Promise<AdminUser[]> {
  const q = query(collection(db, "users"), orderBy("createdAt", "desc"), limit(100));
  const snap = await getDocs(q);
  const term = search.toLowerCase();
  return snap.docs
    .map((d) => ({ ...(d.data() as AdminUser), uid: d.id }))
    .filter(
      (u) =>
        !term ||
        u.username?.toLowerCase().includes(term) ||
        u.name?.toLowerCase().includes(term) ||
        (u.email || "").toLowerCase().includes(term)
    );
}

export async function setVerified(uid: string, v: boolean) {
  await updateDoc(doc(db, "users", uid), { verified: v });
}

export async function deleteUserData(uid: string) {
  const q = query(collection(db, "repos"), where("uid", "==", uid));
  const snap = await getDocs(q);
  for (const r of snap.docs) {
    const fs = await getDocs(collection(db, "repos", r.id, "files"));
    for (const f of fs.docs) {
      try {
        await deleteObject(ref(storage, f.data().path));
      } catch {
        /* noop */
      }
      await deleteDoc(f.ref);
    }
    await deleteDoc(r.ref);
  }
  await deleteDoc(doc(db, "users", uid));
  await deleteDoc(doc(db, "admins", uid));
}

export async function listRepos(search: string = ""): Promise<AdminRepo[]> {
  const q = query(collection(db, "repos"), orderBy("createdAt", "desc"), limit(100));
  const snap = await getDocs(q);
  const term = search.toLowerCase();
  return snap.docs
    .map((d) => ({ ...(d.data() as AdminRepo), slug: d.id }))
    .filter(
      (r) =>
        !term ||
        r.title?.toLowerCase().includes(term) ||
        r.slug?.toLowerCase().includes(term) ||
        r.ownerUsername?.toLowerCase().includes(term)
    );
}

export async function deleteRepoData(slug: string) {
  const fs = await getDocs(collection(db, "repos", slug, "files"));
  for (const f of fs.docs) {
    try {
      await deleteObject(ref(storage, f.data().path));
    } catch {
      /* noop */
    }
    await deleteDoc(f.ref);
  }
  await deleteDoc(doc(db, "repos", slug));
}

export async function getSettings() {
  const d = await getDoc(doc(db, "settings", "app"));
  return d.exists() ? d.data() : null;
}

export async function setSettings(patch: Record<string, unknown>) {
  await setDoc(doc(db, "settings", "app"), patch, { merge: true });
}

export function onSettings(cb: (s: any) => void): () => void {
  return onSnapshot(doc(db, "settings", "app"), (d) => cb(d.exists() ? d.data() : null));
}

export async function addAdminByEmail(email: string): Promise<string> {
  const q = query(collection(db, "users"), where("email", "==", email), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return "Pengguna dengan email itu belum terdaftar.";
  const uid = snap.docs[0].id;
  await setDoc(doc(db, "admins", uid), { email, addedAt: Date.now() });
  return "";
}

export async function listAdmins(): Promise<{ uid: string; email: string }[]> {
  const snap = await getDocs(collection(db, "admins"));
  return snap.docs.map((d) => ({ uid: d.id, email: d.data().email || d.id }));
}
