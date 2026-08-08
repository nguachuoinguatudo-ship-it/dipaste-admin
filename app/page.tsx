"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { isAdmin } from "@/lib/db";
import { ShieldCheck, Mail, Lock, Loader2, LogOut, Copy, Check } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);
  const [uid, setUid] = useState<string | null>(null);
  const [granted, setGranted] = useState(false);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        const ok = await isAdmin(u.uid);
        setUid(u.uid);
        setGranted(ok);
      } else {
        setUid(null);
        setGranted(false);
      }
      setChecking(false);
    });
    return unsub;
  }, []);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch {
      setErr("Email atau password salah.");
    } finally {
      setBusy(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 size={28} className="animate-spin text-violet-400" />
      </div>
    );
  }

  if (uid && !granted) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 text-center">
        <ShieldCheck size={44} className="text-rose-400" />
        <h1 className="mt-5 text-2xl font-extrabold">Akses Ditolak</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Akun ini bukan admin. Tambahkan UID di bawah ke collection <code className="rounded bg-raised px-1.5 py-0.5 font-mono text-violet-300">admins</code> di Firestore, lalu coba lagi.
        </p>
        <button
          onClick={() => {
            navigator.clipboard.writeText(uid);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="btn btn-ghost btn-md mt-6 font-mono"
        >
          {copied ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
          {uid}
        </button>
        <button onClick={() => signOut(auth)} className="btn btn-danger btn-sm mt-4">
          <LogOut size={14} /> Keluar
        </button>
      </div>
    );
  }

  if (uid && granted) {
    window.location.href = "/dashboard";
    return null;
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="pointer-events-none absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-violet-600/20 blur-[120px]" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        <div className="mb-8 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-xl shadow-violet-600/30">
            <ShieldCheck size={26} className="text-white" />
          </span>
          <h1 className="mt-5 text-3xl font-extrabold">
            Admin <span className="gradient-text">Dipaste</span>
          </h1>
          <p className="mt-2 text-sm text-muted">Panel kontrol untuk pengelolaan platform.</p>
        </div>
        <div className="card p-6 shadow-2xl shadow-black/40 sm:p-8">
          <form onSubmit={login} className="flex flex-col gap-4">
            <div className="relative">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-faint" />
              <input
                type="email"
                required
                placeholder="Email admin"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input !pl-11"
              />
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-faint" />
              <input
                type="password"
                required
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input !pl-11"
              />
            </div>
            {err && <p className="text-xs font-medium text-rose-400">{err}</p>}
            <button disabled={busy} className="btn btn-primary btn-md w-full disabled:opacity-60">
              {busy ? <Loader2 size={16} className="animate-spin" /> : "Masuk ke Dashboard"}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
