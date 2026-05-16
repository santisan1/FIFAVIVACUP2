import { Copy, KeyRound, MessageCircle, Plus, RefreshCw, Save, UsersRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { createPlayer, listPlayers, regeneratePlayerToken, updatePlayer } from '../lib/firestore';
import { allPlayerLinksMessage, magicLinkForPlayer, whatsappMessageForPlayer } from '../lib/magicLinks';

const sampleBulk = 'Santi; Santi; Manchester City\nRama; Rama; Real Madrid\nFran; Fran; PSG\nTomi; Tomi; Bayern Munich';
const normalize = (value) => value.trim().toLowerCase();

export function AdminPlayersPage() {
  const [players, setPlayers] = useState([]);
  const [copied, setCopied] = useState('');
  const [editing, setEditing] = useState({});
  const [message, setMessage] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [bulkResult, setBulkResult] = useState({ created: [], skipped: [], errors: [] });
  const [form, setForm] = useState({ name: '', nickname: '', currentTeam: '', avatarUrl: '' });

  const refresh = () => listPlayers().then((rows) => {
    setPlayers(rows);
    setEditing(Object.fromEntries(rows.map((player) => [player.id, {
      name: player.name || '',
      nickname: player.nickname || '',
      currentTeam: player.currentTeam || '',
      avatarUrl: player.avatarUrl || '',
    }])));
  });

  useEffect(() => { void refresh(); }, []);

  const playerIndex = useMemo(() => new Map(players.flatMap((player) => [[normalize(player.name || ''), player], [normalize(player.nickname || ''), player]].filter(([key]) => key))), [players]);

  async function submitPlayer(event) {
    event.preventDefault();
    if (!form.name.trim()) return;
    const id = await createPlayer(form);
    setMessage('Jugador creado con magic link listo.');
    setBulkResult({ created: [{ id, ...form, nickname: form.nickname || form.name }], skipped: [], errors: [] });
    setForm({ name: '', nickname: '', currentTeam: '', avatarUrl: '' });
    await refresh();
  }

  async function createBulkPlayers() {
    const created = [];
    const skipped = [];
    const errors = [];
    const seen = new Set(playerIndex.keys());
    const lines = bulkText.split('\n').map((line) => line.trim()).filter(Boolean);

    for (const [index, line] of lines.entries()) {
      const [name = '', nickname = '', currentTeam = ''] = line.split(';').map((part) => part.trim());
      if (!name) {
        errors.push(`Línea ${index + 1}: falta nombre.`);
        continue;
      }
      const key = normalize(name);
      const nickKey = normalize(nickname || name);
      if (seen.has(key) || seen.has(nickKey)) {
        skipped.push(`${nickname || name} ya existía.`);
        continue;
      }
      try {
        const id = await createPlayer({ name, nickname: nickname || name, currentTeam, avatarUrl: '' });
        const newPlayer = { id, name, nickname: nickname || name, currentTeam, accessToken: '' };
        created.push(newPlayer);
        seen.add(key);
        seen.add(nickKey);
      } catch (error) {
        errors.push(`Línea ${index + 1}: ${error instanceof Error ? error.message : 'no se pudo crear.'}`);
      }
    }

    setBulkResult({ created, skipped, errors });
    setMessage(created.length ? `${created.length} jugadores creados. Links listos abajo.` : 'No se crearon jugadores nuevos.');
    setBulkText('');
    await refresh();
  }

  async function savePlayer(playerId) {
    const draft = editing[playerId];
    if (!draft?.name?.trim()) return;
    await updatePlayer(playerId, {
      name: draft.name.trim(),
      nickname: draft.nickname.trim() || draft.name.trim(),
      currentTeam: draft.currentTeam.trim(),
      avatarUrl: draft.avatarUrl.trim(),
    });
    setMessage('Jugador actualizado.');
    window.setTimeout(() => setMessage(''), 1800);
    await refresh();
  }

  async function copyText(text, label) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    window.setTimeout(() => setCopied(''), 1500);
  }

  async function rotateToken(playerId) {
    await regeneratePlayerToken(playerId);
    setMessage('Token regenerado. Los links viejos quedaron inválidos.');
    window.setTimeout(() => setMessage(''), 2200);
    await refresh();
  }

  function updateDraft(playerId, field, value) {
    setEditing((current) => ({ ...current, [playerId]: { ...current[playerId], [field]: value } }));
  }

  const createdPlayersWithTokens = bulkResult.created.map((created) => players.find((player) => player.id === created.id)).filter(Boolean);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <section className="glass rounded-[2rem] p-5 shadow-card">
          <p className="text-xs font-black uppercase tracking-[.3em] text-electric">Roster rápido</p>
          <h1 className="mt-2 text-3xl font-black">Crear jugadores</h1>
          <p className="mt-2 text-sm text-slate-300">Carga individual o masiva. Cada jugador recibe accessToken y magic link automáticamente.</p>
          {message && <p className="mt-4 rounded-2xl bg-winner/10 p-3 text-sm font-black text-winner">{message}</p>}
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <form className="space-y-3" onSubmit={submitPlayer}>
              <h2 className="font-black">Carga individual</h2>
              <input className="input" placeholder="Nombre real" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input className="input" placeholder="Apodo visible (opcional)" value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} />
              <input className="input" placeholder="Equipo elegido" value={form.currentTeam} onChange={(e) => setForm({ ...form, currentTeam: e.target.value })} />
              <button className="btn btn-primary w-full" type="submit"><Plus className="h-4 w-4" /> Crear jugador</button>
            </form>
            <div className="space-y-3">
              <h2 className="font-black">Carga masiva</h2>
              <p className="text-sm text-slate-400">Formato: Nombre; Apodo; Equipo. Se saltean duplicados por nombre/apodo.</p>
              <textarea className="input min-h-44" placeholder={sampleBulk} value={bulkText} onChange={(e) => setBulkText(e.target.value)} />
              <button className="btn btn-primary w-full" onClick={createBulkPlayers}><UsersRound className="h-4 w-4" /> Procesar carga masiva</button>
              {(bulkResult.errors.length > 0 || bulkResult.skipped.length > 0) && <div className="rounded-2xl bg-black/20 p-3 text-xs text-slate-300">{bulkResult.errors.map((error) => <p key={error} className="text-danger">{error}</p>)}{bulkResult.skipped.map((skip) => <p key={skip} className="text-pending">{skip}</p>)}</div>}
            </div>
          </div>
        </section>

        {createdPlayersWithTokens.length > 0 && <MagicLinksPanel title="Jugadores recién creados" players={createdPlayersWithTokens} copied={copied} copyText={copyText} rotateToken={rotateToken} />}
        <MagicLinksPanel title="Magic links para WhatsApp" players={players} copied={copied} copyText={copyText} rotateToken={rotateToken} />

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {players.map((player) => {
            const draft = editing[player.id] ?? { name: '', nickname: '', currentTeam: '', avatarUrl: '' };
            return (
              <article key={player.id} className="glass rounded-3xl p-4 shadow-card">
                <div className="flex items-start justify-between gap-3"><div><b className="text-lg">{player.nickname}</b><p className="text-sm text-slate-300">{player.name} · {player.currentTeam || 'Sin equipo'}</p></div><KeyRound className="h-5 w-5 text-electric" /></div>
                <div className="mt-4 grid gap-2">
                  <input className="input" value={draft.name} onChange={(e) => updateDraft(player.id, 'name', e.target.value)} placeholder="Nombre" />
                  <input className="input" value={draft.nickname} onChange={(e) => updateDraft(player.id, 'nickname', e.target.value)} placeholder="Apodo" />
                  <input className="input" value={draft.currentTeam} onChange={(e) => updateDraft(player.id, 'currentTeam', e.target.value)} placeholder="Equipo" />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2"><button className="btn btn-ghost text-xs" onClick={() => savePlayer(player.id)}><Save className="h-3 w-3" /> Guardar</button><button className="btn btn-ghost text-xs" onClick={() => copyText(magicLinkForPlayer(player), `link-${player.id}`)}><Copy className="h-3 w-3" /> {copied === `link-${player.id}` ? 'Copiado' : 'Link'}</button><button className="btn btn-ghost text-xs" onClick={() => rotateToken(player.id)}><RefreshCw className="h-3 w-3" /> Token</button></div>
              </article>
            );
          })}
        </section>
      </div>
    </AdminLayout>
  );
}

function MagicLinksPanel({ title, players, copied, copyText, rotateToken }) {
  if (!players.length) return <section className="glass rounded-3xl p-5 text-sm text-slate-400">Todavía no hay jugadores para mostrar links.</section>;
  return (
    <section className="glass rounded-[2rem] p-5 shadow-card">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><p className="text-xs font-black uppercase tracking-[.3em] text-electric">WhatsApp ready</p><h2 className="text-2xl font-black">{title}</h2></div><button className="btn btn-primary" onClick={() => copyText(allPlayerLinksMessage(players), 'all-links')}><Copy className="h-4 w-4" /> {copied === 'all-links' ? 'Copiado' : 'Copiar todos los mensajes'}</button></div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {players.map((player) => <div key={player.id} className="rounded-3xl bg-white/5 p-4"><div className="flex items-start justify-between gap-3"><span><b>{player.nickname || player.name}</b><p className="text-sm text-slate-400">{player.currentTeam || 'Equipo pendiente'}</p></span><button className="text-xs text-electric" onClick={() => rotateToken(player.id)}>Regenerar token</button></div><p className="mt-3 break-all rounded-2xl bg-black/20 p-3 text-[11px] text-slate-400">{magicLinkForPlayer(player)}</p><div className="mt-3 grid gap-2 sm:grid-cols-2"><button className="btn btn-ghost text-xs" onClick={() => copyText(magicLinkForPlayer(player), `link-${player.id}`)}><Copy className="h-3 w-3" /> {copied === `link-${player.id}` ? 'Copiado' : 'Copiar link'}</button><button className="btn btn-ghost text-xs" onClick={() => copyText(whatsappMessageForPlayer(player), `wa-${player.id}`)}><MessageCircle className="h-3 w-3" /> {copied === `wa-${player.id}` ? 'Copiado' : 'Mensaje WhatsApp'}</button></div></div>)}
      </div>
    </section>
  );
}
