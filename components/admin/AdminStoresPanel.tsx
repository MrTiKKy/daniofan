'use client';
/* CRUD magazine + setări WhatsApp — salvare prin CatalogRepository. */
import { useCallback, useEffect, useState } from 'react';
import {
  deleteStore,
  getSettings,
  getStores,
  saveSettings,
  saveStore,
} from '@/lib/catalogStore';
import { isValidHm, isValidRoPhone, parseMapsLatLng } from '@/lib/storeHours';
import type {
  DayHours,
  HoursException,
  PublicContactSettings,
  StoreLocation,
  WeekdayKey,
} from '@/lib/storeTypes';
import {
  DEFAULT_CONTACT_SETTINGS,
  DEFAULT_WEEKLY_HOURS,
  WEEKDAY_KEYS,
  WEEKDAY_LABELS,
} from '@/lib/storeTypes';

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function blankStore(): StoreLocation {
  return {
    id: newId('store'),
    name: '',
    address: '',
    phone: '',
    whatsapp: '',
    lat: 45.2692,
    lng: 27.9575,
    sortOrder: 0,
    isPrimary: false,
    hours: structuredClone(DEFAULT_WEEKLY_HOURS),
    exceptions: [],
  };
}

function blankException(): HoursException {
  return {
    id: newId('ex'),
    date: '',
    closed: true,
    label: '',
  };
}

export default function AdminStoresPanel() {
  const [stores, setStores] = useState<StoreLocation[]>([]);
  const [settings, setSettings] = useState<PublicContactSettings>(DEFAULT_CONTACT_SETTINGS);
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState<StoreLocation | null>(null);
  const [mapsLink, setMapsLink] = useState('');
  const [msg, setMsg] = useState<{ text: string; err?: boolean } | null>(null);
  const [ready, setReady] = useState(false);

  const flash = useCallback((text: string, err?: boolean) => {
    setMsg({ text, err });
    window.setTimeout(() => setMsg(null), err ? 5000 : 2200);
  }, []);

  const reload = useCallback(async () => {
    const [s, conf] = await Promise.all([getStores(), getSettings()]);
    setStores(s);
    setSettings(conf);
    setReady(true);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const startEdit = (store: StoreLocation | null) => {
    const next = store ? structuredClone(store) : blankStore();
    if (!store && stores.length === 0) next.isPrimary = true;
    setDraft(next);
    setEditId(next.id);
    setMapsLink('');
  };

  const cancelEdit = () => {
    setDraft(null);
    setEditId(null);
    setMapsLink('');
  };

  const validateStore = (s: StoreLocation): string | null => {
    if (!s.name.trim()) return 'Numele magazinului e obligatoriu.';
    if (!s.address.trim()) return 'Adresa e obligatorie.';
    if (!isValidRoPhone(s.phone)) return 'Telefon invalid (format RO: 07xxxxxxxx / +40…).';
    if (s.whatsapp && !/^\d{10,15}$/.test(s.whatsapp.replace(/\D/g, ''))) {
      return 'Numărul WhatsApp trebuie să conțină doar cifre (ex. 407….).';
    }
    if (!Number.isFinite(s.lat) || !Number.isFinite(s.lng)) return 'Coordonatele lat/lng sunt invalide.';
    for (const key of WEEKDAY_KEYS) {
      const day = s.hours[key];
      if (day.open) {
        if (!isValidHm(day.openTime) || !isValidHm(day.closeTime)) {
          return `Ore invalide pentru ${WEEKDAY_LABELS[key]}.`;
        }
      }
    }
    for (const ex of s.exceptions) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(ex.date)) return 'Excepție: dată invalidă (YYYY-MM-DD).';
      if (!ex.closed) {
        if (!ex.openTime || !ex.closeTime || !isValidHm(ex.openTime) || !isValidHm(ex.closeTime)) {
          return `Excepție ${ex.date}: ore speciale invalide.`;
        }
      }
    }
    return null;
  };

  const persistDraft = async () => {
    if (!draft) return;
    const err = validateStore(draft);
    if (err) {
      flash(err, true);
      return;
    }
    const others = stores.filter((s) => s.id !== draft.id);
    if (draft.isPrimary) {
      /* ok */
    } else if (!others.some((s) => s.isPrimary) && !draft.isPrimary) {
      flash('Trebuie să existe cel puțin un magazin principal.', true);
      return;
    }
    try {
      await saveStore(draft);
      await reload();
      cancelEdit();
      flash('✓ Magazin salvat.');
    } catch {
      flash('Nu s-a putut salva magazinul.', true);
    }
  };

  const removeStore = async (id: string) => {
    const target = stores.find((s) => s.id === id);
    if (!target) return;
    if (!confirm(`Ștergeți magazinul „${target.name}"?`)) return;
    if (stores.length <= 1) {
      flash('Nu poți șterge ultimul magazin.', true);
      return;
    }
    try {
      await deleteStore(id);
      if (editId === id) cancelEdit();
      await reload();
      flash('✓ Magazin șters.');
    } catch {
      flash('Ștergerea a eșuat.', true);
    }
  };

  const saveContact = async () => {
    const n = settings.whatsappNumber.replace(/\D/g, '');
    if (!/^\d{10,15}$/.test(n)) {
      flash('Numărul WhatsApp global e invalid.', true);
      return;
    }
    if (!settings.whatsappMessage.trim()) {
      flash('Mesajul WhatsApp e obligatoriu.', true);
      return;
    }
    try {
      await saveSettings({
        whatsappNumber: n,
        whatsappMessage: settings.whatsappMessage.trim(),
      });
      await reload();
      flash('✓ Setări WhatsApp salvate.');
    } catch {
      flash('Nu s-au putut salva setările.', true);
    }
  };

  const applyMapsLink = () => {
    if (!draft || !mapsLink.trim()) return;
    const coords = parseMapsLatLng(mapsLink.trim());
    if (!coords) {
      flash('Nu am putut extrage lat/lng din link.', true);
      return;
    }
    setDraft({ ...draft, lat: coords.lat, lng: coords.lng });
    flash('✓ Coordonate extrase din Maps.');
  };

  const setDay = (key: WeekdayKey, patch: Partial<DayHours>) => {
    if (!draft) return;
    setDraft({
      ...draft,
      hours: { ...draft.hours, [key]: { ...draft.hours[key], ...patch } },
    });
  };

  const setException = (i: number, patch: Partial<HoursException>) => {
    if (!draft) return;
    const exceptions = draft.exceptions.slice();
    exceptions[i] = { ...exceptions[i], ...patch };
    setDraft({ ...draft, exceptions });
  };

  if (!ready) {
    return <p className="help">Se încarcă magazinele…</p>;
  }

  return (
    <>
      {msg ? (
        <p className={'a-stores-flash' + (msg.err ? ' is-err' : '')} role="status">
          {msg.text}
        </p>
      ) : null}

      <section className="a-card">
        <div className="h-row">
          <h2><span className="step">1</span>WhatsApp global</h2>
          <button type="button" className="btn a-add" onClick={() => void saveContact()}>
            Salvează WhatsApp
          </button>
        </div>
        <p className="help">Numărul și mesajul folosite de butonul WhatsApp din bara de jos (site public).</p>
        <div className="fields">
          <label>
            Număr WhatsApp (ex. 407xxxxxxxx)
            <input
              type="text"
              inputMode="tel"
              value={settings.whatsappNumber}
              onChange={(e) => setSettings({ ...settings, whatsappNumber: e.target.value })}
            />
          </label>
          <label>
            Mesaj implicit
            <input
              type="text"
              value={settings.whatsappMessage}
              onChange={(e) => setSettings({ ...settings, whatsappMessage: e.target.value })}
            />
          </label>
        </div>
      </section>

      <section className="a-card">
        <div className="h-row">
          <h2><span className="step">2</span>Magazine</h2>
          <button type="button" className="btn a-add" onClick={() => startEdit(null)}>
            + Adaugă magazin
          </button>
        </div>
        <p className="help">
          Datele apar în panourile Program / Locații. Magazinul demo „Șos. Râmnicu Sărat 74” e un exemplu —
          poți edita sau înlocui.
        </p>

        <ul className="a-store-list">
          {stores.map((s) => (
            <li key={s.id} className={'a-store-row' + (editId === s.id ? ' is-editing' : '')}>
              <div className="a-store-row__info">
                <strong>{s.name || 'Fără nume'}</strong>
                {s.isPrimary ? <span className="a-store-badge">Principal</span> : null}
                {s.id.startsWith('demo-') ? <span className="a-store-badge a-store-badge--demo">Exemplu</span> : null}
                <span className="a-store-row__addr">{s.address}</span>
              </div>
              <div className="a-store-row__acts">
                <button type="button" className="btn" onClick={() => startEdit(s)}>Editează</button>
                <button type="button" className="btn a-del" onClick={() => void removeStore(s.id)}>Șterge</button>
              </div>
            </li>
          ))}
        </ul>

        {draft ? (
          <div className="a-store-form">
            <h3 className="a-store-form__title">
              {stores.some((s) => s.id === draft.id) ? 'Editare magazin' : 'Magazin nou'}
            </h3>
            <div className="fields">
              <label>
                Nume
                <input
                  type="text"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </label>
              <label>
                Adresă
                <input
                  type="text"
                  value={draft.address}
                  onChange={(e) => setDraft({ ...draft, address: e.target.value })}
                />
              </label>
              <div className="fields two">
                <label>
                  Telefon
                  <input
                    type="text"
                    inputMode="tel"
                    value={draft.phone}
                    onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                  />
                </label>
                <label>
                  WhatsApp magazin (opțional)
                  <input
                    type="text"
                    inputMode="tel"
                    value={draft.whatsapp}
                    onChange={(e) => setDraft({ ...draft, whatsapp: e.target.value })}
                  />
                </label>
              </div>
              <label>
                Link Google Maps (extrage automat lat/lng)
                <div className="a-maps-row">
                  <input
                    type="url"
                    value={mapsLink}
                    placeholder="https://www.google.com/maps/…"
                    onChange={(e) => setMapsLink(e.target.value)}
                  />
                  <button type="button" className="btn" onClick={applyMapsLink}>Extrage</button>
                </div>
              </label>
              <div className="fields two">
                <label>
                  Latitudine
                  <input
                    type="text"
                    inputMode="decimal"
                    value={String(draft.lat)}
                    onChange={(e) => setDraft({ ...draft, lat: parseFloat(e.target.value) || 0 })}
                  />
                </label>
                <label>
                  Longitudine
                  <input
                    type="text"
                    inputMode="decimal"
                    value={String(draft.lng)}
                    onChange={(e) => setDraft({ ...draft, lng: parseFloat(e.target.value) || 0 })}
                  />
                </label>
              </div>
              <div className="fields two">
                <label>
                  Ordine afișare
                  <input
                    type="text"
                    inputMode="numeric"
                    value={String(draft.sortOrder)}
                    onChange={(e) => setDraft({ ...draft, sortOrder: parseInt(e.target.value, 10) || 0 })}
                  />
                </label>
                <label className="chk" style={{ marginTop: 28 }}>
                  <input
                    type="checkbox"
                    checked={draft.isPrimary}
                    onChange={(e) => setDraft({ ...draft, isPrimary: e.target.checked })}
                  />
                  Magazin principal
                </label>
              </div>
            </div>

            <h4 className="a-store-sub">Program pe zile</h4>
            <ul className="a-hours">
              {WEEKDAY_KEYS.map((key) => {
                const day = draft.hours[key];
                return (
                  <li key={key} className="a-hours__row">
                    <span className="a-hours__day">{WEEKDAY_LABELS[key]}</span>
                    <label className="chk a-hours__open">
                      <input
                        type="checkbox"
                        checked={day.open}
                        onChange={(e) => setDay(key, { open: e.target.checked })}
                      />
                      Deschis
                    </label>
                    <input
                      type="text"
                      className="a-hours__time"
                      disabled={!day.open}
                      value={day.openTime}
                      aria-label={`Deschidere ${WEEKDAY_LABELS[key]}`}
                      onChange={(e) => setDay(key, { openTime: e.target.value })}
                    />
                    <span aria-hidden>–</span>
                    <input
                      type="text"
                      className="a-hours__time"
                      disabled={!day.open}
                      value={day.closeTime}
                      aria-label={`Închidere ${WEEKDAY_LABELS[key]}`}
                      onChange={(e) => setDay(key, { closeTime: e.target.value })}
                    />
                  </li>
                );
              })}
            </ul>

            <div className="h-row" style={{ marginTop: 18 }}>
              <h4 className="a-store-sub" style={{ margin: 0 }}>Excepții / sărbători</h4>
              <button
                type="button"
                className="btn a-add"
                onClick={() => setDraft({ ...draft, exceptions: [...draft.exceptions, blankException()] })}
              >
                + Excepție
              </button>
            </div>
            {draft.exceptions.length === 0 ? (
              <p className="help">Nicio excepție. Ex.: 25 decembrie — Închis (Crăciun).</p>
            ) : (
              <ul className="a-ex-list">
                {draft.exceptions.map((ex, i) => (
                  <li key={ex.id} className="a-ex-row">
                    <input
                      type="date"
                      value={ex.date}
                      onChange={(e) => setException(i, { date: e.target.value })}
                    />
                    <input
                      type="text"
                      placeholder="Etichetă (ex. Crăciun)"
                      value={ex.label || ''}
                      onChange={(e) => setException(i, { label: e.target.value })}
                    />
                    <label className="chk">
                      <input
                        type="checkbox"
                        checked={ex.closed}
                        onChange={(e) => setException(i, { closed: e.target.checked })}
                      />
                      Închis
                    </label>
                    {!ex.closed ? (
                      <>
                        <input
                          type="text"
                          className="a-hours__time"
                          value={ex.openTime || '08:00'}
                          onChange={(e) => setException(i, { openTime: e.target.value })}
                        />
                        <input
                          type="text"
                          className="a-hours__time"
                          value={ex.closeTime || '14:00'}
                          onChange={(e) => setException(i, { closeTime: e.target.value })}
                        />
                      </>
                    ) : null}
                    <button
                      type="button"
                      className="btn a-del"
                      onClick={() => setDraft({
                        ...draft,
                        exceptions: draft.exceptions.filter((_, j) => j !== i),
                      })}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="btns" style={{ marginTop: 18 }}>
              <button type="button" className="btn a-add big" onClick={() => void persistDraft()}>
                Salvează magazinul
              </button>
              <button type="button" className="btn" onClick={cancelEdit}>Anulează</button>
            </div>
          </div>
        ) : null}
      </section>
    </>
  );
}
