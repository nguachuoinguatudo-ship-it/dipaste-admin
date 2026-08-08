"use client";

import { useEffect, useState, useCallback } from "react";
import {
  LayoutDashboard,
  Users,
  FolderGit2,
  Settings,
  ShieldCheck,
  LogOut,
  Search,
  Loader2,
  Wrench,
  BadgeCheck,
  Trash2,
  Eye,
  Star,
  CheckCircle2,
  XCircle,
  UserPlus,
  Megaphone,
  Terminal,
} from "lucide-react";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  getStats,
  listUsers,
  setVerified,
  deleteUserData,
  listRepos,
  deleteRepoData,
  getSettings,
  setSettings,
  onSettings,
  addAdminByEmail,
  listAdmins,
  type AdminUser,
  type AdminRepo,
} from "@/lib/db";

type Tab = "overview" | "users" | "repos" | "settings";

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "baru saja";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}j`;
  return `${Math.floor(h / 24)}h`;
}

export default function Dashboard() {
  const [tab, setTab] = useState<Tab>("overview");
  const [adminEmail, setAdminEmail] = useState("");
  const [stats, setStats] = useState<{ users: number; repos: number; verified: number; totalViews: number } | null>(null);
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [repos, setRepos] = useState<AdminRepo[] | null>(null);
  const [admins, setAdmins] = useState<{ uid: string; email: string }[]>([]);
  const [settings, setSettingsState] = useState<any>(null);
  const [searchU, setSearchU] = useState("");
  const [searchR, setSearchR] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [maintenance, setMaintenance] = useState(false);
  const [maintMsg, setMaintMsg] = useState("");
  const [announcement, setAnnouncement] = useState("");

  const flash = (text: string, kind: "ok" | "err" = "ok") => {
    setMsg({ kind, text });
    setTimeout(() => setMsg(null), 3000);
  };

  const refresh = useCallback(async () => {
    const s = await getStats();
    setStats(s);
    setUsers(await listUsers(searchU));
    setRepos(await listRepos(searchR));
    setAdmins(await listAdmins());
  }, [searchU, searchR]);

  useEffect(() => {
    onAuthStateChanged(auth, (u) => {
      if (!u) window.location.href = "/";
    });
    refresh();
  }, [refresh]);

  useEffect(() => {
    const unsub = onSettings((s) => {
      setSettingsState(s);
      setMaintenance(!!s?.maintenance);
      setMaintMsg(s?.maintenanceMessage || "");
      setAnnouncement(s?.announcement || "");
    });
    return unsub;
  }, []);

  useEffect(() => {
    const t = setTimeout(() => listUsers(searchU).then(setUsers), 250);
    return () => clearTimeout(t);
  }, [searchU]);

  useEffect(() => {
    const t = setTimeout(() => listRepos(searchR).then(setRepos), 250);
    return () => clearTimeout(t);
  }, [searchR]);

  const doVerify = async (uid: string, v: boolean) => {
    await setVerified(uid, v);
    setUsers((p) => p?.map((u) => (u.uid === uid ? { ...u, verified: v } : u)) || null);
    flash(v ? "Pengguna diverifikasi" : "Verifikasi dicabut");
  };

  const doDeleteUser = async (u: AdminUser) => {
    if (!confirm(`Hapus semua data @${u.username}? Termasuk repository & file-nya.`)) return;
    setBusy(`u:${u.uid}`);
    try {
      await deleteUserData(u.uid);
      setUsers((p) => p?.filter((x) => x.uid !== u.uid) || null);
      refresh();
      flash(`Data @${u.username} dihapus`);
    } catch {
      flash("Gagal menghapus", "err");
    } finally {
      setBusy(null);
    }
  };

  const doDeleteRepo = async (r: AdminRepo) => {
    if (!confirm(`Hapus repository "${r.title}" (/${r.slug})?`)) return;
    setBusy(`r:${r.slug}`);
    try {
      await deleteRepoData(r.slug);
      setRepos((p) => p?.filter((x) => x.slug !== r.slug) || null);
      flash(`Repository /${r.slug} dihapus`);
    } catch {
      flash("Gagal menghapus", "err");
    } finally {
      setBusy(null);
    }
  };

  const saveSettings = async () => {
    setBusy("settings");
    try {
      await setSettings({
        maintenance,
        maintenanceMessage: maintMsg,
        announcement,
      });
      flash("Pengaturan disimpan");
    } catch {
      flash("Gagal menyimpan", "err");
    } finally {
      setBusy(null);
    }
  };

  const doAddAdmin = async () => {
    if (!adminEmail.trim()) return;
    const res = await addAdminByEmail(adminEmail.trim());
    if (res) flash(res, "err");
    else {
      flash("Admin ditambahkan");
      setAdminEmail("");
      setAdmins(await listAdmins());
    }
  };

  const nav = [
    { id: "overview" as Tab, label: "Ringkasan", icon: LayoutDashboard },
    { id: "users" as Tab, label: "Pengguna", icon: Users },
    { id: "repos" as Tab, label: "Repository", icon: FolderGit2 },
    { id: "settings" as Tab, label: "Pengaturan", icon: Settings },
  ];

  return (
    <div className="min-h-screen">
      {/* TOPBAR */}
      <header className="glass sticky top-0 z-50 border-b border-line/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600">
              <ShieldCheck size={18} className="text-white" />
            </span>
            <div>
              <p className="text-sm font-extrabold">Admin <span className="gradient-text">Dipaste</span></p>
              <p className="text-[10px] text-faint">PANEL KONTROL</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {settings?.maintenance && (
              <span className="hidden items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-bold text-amber-300 sm:inline-flex">
                <Wrench size={11} /> MAINTENANCE
              </span>
            )}
            <button onClick={() => signOut(auth).then(() => (window.location.href = "/"))} className="btn btn-ghost btn-sm">
              <LogOut size={14} /> <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>
      </header>

      {/* SIDEBAR + CONTENT */}
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6">
        <aside className="hidden w-56 shrink-0 md:block">
          <nav className="card sticky top-20 flex flex-col gap-1 p-2">
            {nav.map((n) => (
              <button
                key={n.id}
                onClick={() => setTab(n.id)}
                className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all ${
                  tab === n.id
                    ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/25"
                    : "text-muted hover:bg-raised hover:text-white"
                }`}
              >
                <n.icon size={16} /> {n.label}
              </button>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 flex-1">
          {msg && (
            <div className={`toast-in mb-4 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium ${
              msg.kind === "ok" ? "border-emerald-500/30 bg-emerald-950/60 text-emerald-200" : "border-rose-500/30 bg-rose-950/60 text-rose-200"
            }`}>
              {msg.kind === "ok" ? <CheckCircle2 size={16} /> : <XCircle size={16} />} {msg.text}
            </div>
          )}

          {/* MOBILE TABS */}
          <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl bg-raised p-1 md:hidden">
            {nav.map((n) => (
              <button
                key={n.id}
                onClick={() => setTab(n.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold ${
                  tab === n.id ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white" : "text-muted"
                }`}
              >
                <n.icon size={13} /> {n.label}
              </button>
            ))}
          </div>

          {tab === "overview" && (
            <div className="fade-up">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: "Total Pengguna", value: stats?.users, icon: Users, color: "text-violet-300" },
                  { label: "Total Repository", value: stats?.repos, icon: FolderGit2, color: "text-cyan-300" },
                  { label: "Terverifikasi", value: stats?.verified, icon: BadgeCheck, color: "text-amber-300" },
                  { label: "Total Views", value: stats?.totalViews, icon: Eye, color: "text-emerald-300" },
                ].map((s) => (
                  <div key={s.label} className="card p-5">
                    <s.icon size={20} className={s.color} />
                    <p className="mt-3 text-3xl font-extrabold text-white">
                      {s.value === undefined ? <Loader2 size={20} className="animate-spin text-faint" /> : s.value}
                    </p>
                    <p className="mt-1 text-xs text-muted">{s.label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <div className="card p-5">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                    <Wrench size={15} className="text-amber-400" /> Mode Maintenance
                  </h3>
                  <p className="mt-2 text-xs text-muted">
                    Saat aktif, semua pengunjung web akan melihat halaman maintenance.
                  </p>
                  <button
                    onClick={() => setMaintenance((m) => !m)}
                    className={`relative mt-4 h-7 w-12 rounded-full transition-colors ${maintenance ? "bg-rose-500" : "bg-raised border border-line"}`}
                  >
                    <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${maintenance ? "left-6" : "left-1"}`} />
                  </button>
                  <p className="mt-2 text-xs font-semibold">{maintenance ? "Aktif — web sedang maintenance" : "Nonaktif"}</p>
                  <button onClick={saveSettings} disabled={busy === "settings"} className="btn btn-primary btn-sm mt-4 disabled:opacity-60">
                    {busy === "settings" ? <Loader2 size={14} className="animate-spin" /> : null} Simpan
                  </button>
                </div>

                <div className="card p-5">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                    <Megaphone size={15} className="text-violet-400" /> Pengumuman
                  </h3>
                  <p className="mt-2 text-xs text-muted">Pesan yang ditampilkan di halaman maintenance.</p>
                  <input
                    value={maintMsg}
                    onChange={(e) => setMaintMsg(e.target.value)}
                    placeholder="Pesan maintenance..."
                    className="input mt-3 !py-2.5 text-xs"
                  />
                  <button onClick={saveSettings} disabled={busy === "settings"} className="btn btn-primary btn-sm mt-3 disabled:opacity-60">
                    {busy === "settings" ? <Loader2 size={14} className="animate-spin" /> : null} Simpan Pesan
                  </button>
                </div>
              </div>

              <div className="card mt-6 p-5">
                <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                  <Terminal size={15} className="text-violet-400" /> Repository Terpopuler
                </h3>
                {!repos ? (
                  <div className="skeleton mt-4 h-10 w-full" />
                ) : (
                  <div className="mt-3 flex flex-col">
                    {repos.slice(0, 5).map((r) => (
                      <a key={r.slug} href={`https://dipaste.vercel.app/${r.slug}`} target="_blank" rel="noreferrer"
                        className="flex items-center gap-3 border-b border-line/50 py-3 text-sm transition-colors hover:bg-raised/50">
                        <FolderGit2 size={15} className="shrink-0 text-cyan-300" />
                        <span className="min-w-0 flex-1 truncate font-semibold text-white">{r.title}</span>
                        <span className="hidden font-mono text-xs text-faint sm:inline">/{r.slug}</span>
                        <span className="inline-flex items-center gap-1 text-xs text-muted"><Eye size={12} /> {r.views}</span>
                        <span className="inline-flex items-center gap-1 text-xs text-amber-300/80"><Star size={12} /> {r.stars}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "users" && (
            <div className="fade-up card overflow-hidden">
              <div className="flex flex-col gap-3 border-b border-line bg-raised/40 p-4 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                  <Users size={15} /> Pengguna ({users?.length ?? "…"})
                </h3>
                <div className="relative w-full sm:w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
                  <input
                    value={searchU}
                    onChange={(e) => setSearchU(e.target.value)}
                    placeholder="Cari username / email..."
                    className="input !py-2 !pl-9 text-xs"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-line text-[11px] uppercase tracking-wider text-faint">
                      <th className="px-4 py-3 font-semibold">Pengguna</th>
                      <th className="hidden px-4 py-3 font-semibold md:table-cell">Email</th>
                      <th className="px-4 py-3 font-semibold">Bergabung</th>
                      <th className="px-4 py-3 font-semibold">Verifikasi</th>
                      <th className="px-4 py-3 text-right font-semibold">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users === null ? (
                      <tr><td colSpan={5} className="px-4 py-10 text-center text-muted">Memuat...</td></tr>
                    ) : users.length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-10 text-center text-muted">Tidak ada pengguna.</td></tr>
                    ) : (
                      users.map((u) => (
                        <tr key={u.uid} className="border-b border-line/50 transition-colors hover:bg-raised/40">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              {u.photoURL ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={u.photoURL} className="h-8 w-8 rounded-full object-cover ring-1 ring-line" alt="" />
                              ) : (
                                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-xs font-bold text-white">
                                  {(u.name || "?").charAt(0)}
                                </span>
                              )}
                              <div>
                                <p className="flex items-center gap-1 font-semibold text-white">
                                  {u.name}
                                  {u.verified && <BadgeCheck size={13} className="text-cyan-400" />}
                                </p>
                                <p className="text-xs text-muted">@{u.username}</p>
                              </div>
                            </div>
                          </td>
                          <td className="hidden px-4 py-3 font-mono text-xs text-muted md:table-cell">{u.email || "-"}</td>
                          <td className="px-4 py-3 text-xs text-muted">{timeAgo(u.createdAt)}</td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => doVerify(u.uid, !u.verified)}
                              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${
                                u.verified
                                  ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
                                  : "border border-line text-faint hover:text-white"
                              }`}
                            >
                              <BadgeCheck size={12} /> {u.verified ? "Terverifikasi" : "Verifikasi"}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => doDeleteUser(u)}
                              disabled={busy === `u:${u.uid}`}
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-rose-300 transition-colors hover:bg-rose-500/25 disabled:opacity-50"
                            >
                              {busy === `u:${u.uid}` ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Hapus
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "repos" && (
            <div className="fade-up card overflow-hidden">
              <div className="flex flex-col gap-3 border-b border-line bg-raised/40 p-4 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                  <FolderGit2 size={15} /> Repository ({repos?.length ?? "…"})
                </h3>
                <div className="relative w-full sm:w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
                  <input
                    value={searchR}
                    onChange={(e) => setSearchR(e.target.value)}
                    placeholder="Cari judul / slug / username..."
                    className="input !py-2 !pl-9 text-xs"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-line text-[11px] uppercase tracking-wider text-faint">
                      <th className="px-4 py-3 font-semibold">Repository</th>
                      <th className="hidden px-4 py-3 font-semibold lg:table-cell">Pemilik</th>
                      <th className="px-4 py-3 font-semibold">Views</th>
                      <th className="px-4 py-3 font-semibold">Like</th>
                      <th className="px-4 py-3 font-semibold">File</th>
                      <th className="px-4 py-3 text-right font-semibold">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {repos === null ? (
                      <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">Memuat...</td></tr>
                    ) : repos.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">Tidak ada repository.</td></tr>
                    ) : (
                      repos.map((r) => (
                        <tr key={r.slug} className="border-b border-line/50 transition-colors hover:bg-raised/40">
                          <td className="px-4 py-3">
                            <p className="flex items-center gap-1.5 font-semibold text-white">
                              <FolderGit2 size={14} className="shrink-0 text-cyan-300" /> {r.title}
                            </p>
                            <a href={`https://dipaste.vercel.app/${r.slug}`} target="_blank" rel="noreferrer" className="font-mono text-xs text-violet-300 hover:underline">
                              /{r.slug}
                            </a>
                          </td>
                          <td className="hidden px-4 py-3 text-xs text-muted lg:table-cell">@{r.ownerUsername}</td>
                          <td className="px-4 py-3 text-xs text-muted">{r.views}</td>
                          <td className="px-4 py-3 text-xs text-amber-300/80">{r.stars}</td>
                          <td className="px-4 py-3 text-xs text-muted">{r.filesCount}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => doDeleteRepo(r)}
                              disabled={busy === `r:${r.slug}`}
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-rose-300 transition-colors hover:bg-rose-500/25 disabled:opacity-50"
                            >
                              {busy === `r:${r.slug}` ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Hapus
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "settings" && (
            <div className="fade-up grid gap-4 lg:grid-cols-2">
              <div className="card p-6">
                <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                  <UserPlus size={15} className="text-violet-400" /> Tambah Admin
                </h3>
                <p className="mt-2 text-xs text-muted">
                  Masukkan email pengguna terdaftar untuk menjadikannya admin.
                </p>
                <div className="mt-4 flex gap-2">
                  <input
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="email@contoh.com"
                    className="input !py-2.5 text-xs"
                  />
                  <button onClick={doAddAdmin} className="btn btn-primary btn-sm shrink-0">Tambah</button>
                </div>
                <div className="mt-5 flex flex-col gap-1.5">
                  {admins.map((a) => (
                    <div key={a.uid} className="flex items-center justify-between rounded-xl border border-line bg-raised/50 px-3.5 py-2.5">
                      <span className="font-mono text-xs text-white">{a.email}</span>
                      <BadgeCheck size={15} className="text-cyan-400" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="card p-6">
                <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                  <Wrench size={15} className="text-amber-400" /> Mode Maintenance
                </h3>
                <p className="mt-2 text-xs text-muted">Aktifkan untuk menonaktifkan akses publik ke web utama.</p>
                <div className="mt-5 flex items-center justify-between">
                  <p className="text-sm font-semibold">{maintenance ? "Sedang aktif" : "Nonaktif"}</p>
                  <button
                    onClick={() => setMaintenance((m) => !m)}
                    className={`relative h-7 w-12 rounded-full transition-colors ${maintenance ? "bg-rose-500" : "bg-raised border border-line"}`}
                  >
                    <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${maintenance ? "left-6" : "left-1"}`} />
                  </button>
                </div>
                <label className="mt-5 mb-1.5 block text-xs font-semibold text-muted">Pesan maintenance</label>
                <textarea
                  value={maintMsg}
                  onChange={(e) => setMaintMsg(e.target.value)}
                  rows={3}
                  placeholder="Kami sedang melakukan perbaikan..."
                  className="input resize-none text-xs"
                />
                <button onClick={saveSettings} disabled={busy === "settings"} className="btn btn-primary btn-md mt-4 w-full disabled:opacity-60">
                  {busy === "settings" ? <Loader2 size={15} className="animate-spin" /> : null} Simpan Semua Pengaturan
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
