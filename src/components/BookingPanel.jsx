import { useEffect, useState } from 'react';
import { db, serverTimestamp, collection, addDoc } from '../firebase';
import { toLocalISO, addDaysISO } from '../lib/utils';

export default function BookingPanel() {
  const todayISO = toLocalISO();

  const [model, setModel] = useState('q3');
  const [start, setStart] = useState(todayISO);
  const [days, setDays] = useState(1);
  const [insurance, setInsurance] = useState(false);
  const [saving, setSaving] = useState(false);

  // Extras
  const EXTRAS = { charger: 8000, headphones: 6000, combo: 11000 };
  const [extras, setExtras] = useState({ charger: false, headphones: false, combo: false });

  const toggleExtra = (name) => {
    setExtras((prev) => {
      const next = { ...prev, [name]: !prev[name] };
      if (name === 'combo' && !prev.combo) {
        next.charger = false;
        next.headphones = false;
      }
      if ((name === 'charger' || name === 'headphones') && !prev[name]) {
        next.combo = false;
      }
      console.log('[Reserva] Extras →', next);
      return next;
    });
  };

  // Precio base
  const base =
    model === 'q3'
      ? (days === 1 ? 65000 : days === 2 ? 100000 : 310000)
      : (days === 1 ? 55000 : days === 2 ? 90000 : 300000);

  const ins =
    model === 'q3'
      ? (days === 1 ? 4000 : days === 2 ? 8000 : 20000)
      : (days === 1 ? 3000 : days === 2 ? 6000 : 15000);

  // Subtotales
  const extrasSubtotal = extras.combo
    ? EXTRAS.combo
    : (extras.charger ? EXTRAS.charger : 0) + (extras.headphones ? EXTRAS.headphones : 0);

  const total = base + (insurance ? ins : 0) + extrasSubtotal;

  // Fecha fin
  const endISO = days === 2 ? addDaysISO(start, 2) : days === 7 ? addDaysISO(start, 7) : addDaysISO(start, 1);

  // Helpers
  const fmt = (iso) => {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  };
  const modelTxt = model === 'q3' ? 'Quest 3' : 'Quest 3s';
  const labelDays = days === 1 ? 'Por día' : days === 2 ? 'Fin de semana' : 'Semana (7 días)';

  const extrasList = extras.combo
    ? ['Combo (Cargador + auriculares)']
    : [
        ...(extras.charger ? ['Cargador inalámbrico (3h)'] : []),
        ...(extras.headphones ? ['Auriculares premium'] : []),
      ];
  const extrasText = extrasList.length ? extrasList.join(', ') : 'Ninguno';

  const waMsg = encodeURIComponent(
    `Hola LOME VR 👋 Quiero reservar ${modelTxt}.
Período: ${fmt(start)} → ${fmt(endISO)} (${labelDays})
Seguro: ${insurance ? 'Sí' : 'No'}
Extras: ${extrasText} (+$${extrasSubtotal.toLocaleString('es-AR')})
Total estimado: $${total.toLocaleString('es-AR')}`
  );
  const waURL = `https://wa.me/5491150109307?text=${waMsg}`;

  // Logs
  useEffect(() => {
    console.log(
      `[Reserva] Modelo: ${modelTxt} | Duración: ${labelDays} | Seguro: ${insurance ? 'Sí' : 'No'}`
    );
    console.log(
      `[Reserva] Rango: ${fmt(start)} → ${fmt(endISO)} | Total: $${total.toLocaleString('es-AR')}`
    );
  }, [model, days, insurance, start, endISO, total, modelTxt, labelDays]);

  useEffect(() => {
    console.log(
      `[Reserva] Extras: ${extrasText} | Subtotal extras: $${extrasSubtotal.toLocaleString('es-AR')}`
    );
  }, [extras.charger, extras.headphones, extras.combo, extrasSubtotal]); 

  // Handlers con clamp de fecha
  const onStartChange = (val) => {
    if (!val) return;
    const today = toLocalISO();
    if (val < today) {
      console.warn(`[Reserva] Fecha anterior a hoy (${val}), reajustando a ${today}`);
      setStart(today);
    } else {
      console.log('[Reserva] Cambio de fecha inicio →', val);
      setStart(val);
    }
  };

  const handleReserveClick = async (e) => {
    e.preventDefault();
    if (saving) return;

    const today = toLocalISO();
    if (start < today) {
      console.warn(`[Reserva] Fecha pasada (${start}). Corrijo a hoy y no abro WhatsApp.`);
      setStart(today);
      return;
    }

    // Abrir WhatsApp
    const waTab = window.open(waURL, '_blank');

    setSaving(true);
    try {
      const payload = {
        model, modelTxt, start, end: endISO, days, labelDays,
        insurance, extras, extrasText, extrasSubtotal, total,
        createdAt: serverTimestamp(), status: 'pendiente', source: 'lomevr-web',
      };
      console.log('[Reserva] Guardando en Firestore →', payload);
      await addDoc(collection(db, 'reservations'), payload);
      console.info('[Reserva] OK en Firestore');
    } catch (err) {
      console.error('[Reserva] Error Firestore:', err);
      if (!waTab || waTab.closed) window.open(waURL, '_blank');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="booking-panel">
      <h4>Reserva</h4>
      <div className="bk-grid">
        <label>
          Modelo
          <select
            value={model}
            onChange={(e) => {
              console.log('[Reserva] Cambio de modelo →', e.target.value);
              setModel(e.target.value);
            }}
          >
            <option value="q3">Quest 3</option>
            <option value="q3s">Quest 3s</option>
          </select>
        </label>

        <label>
          Inicio
          <input
            type="date"
            value={start}
            min={todayISO}
            onChange={(e) => onStartChange(e.target.value)}
          />
        </label>

        <label>
          Duración
          <select
            value={days}
            onChange={(e) => {
              console.log('[Reserva] Cambio de duración →', e.target.value);
              setDays(+e.target.value);
            }}
          >
            <option value={1}>1 día</option>
            <option value={2}>Fin de semana</option>
            <option value={7}>Semana (7 días)</option>
          </select>
        </label>

        <label className="bk-check">
          <input
            type="checkbox"
            checked={insurance}
            onChange={(e) => {
              console.log('[Reserva] Seguro →', e.target.checked ? 'Sí' : 'No');
              setInsurance(e.target.checked);
            }}
          />
          Incluir seguro
        </label>
      </div>

      {/* Extras */}
      <fieldset className="bk-extras">
        <legend>Extras opcionales</legend>

        <label className="bk-check">
          <input
            type="checkbox"
            checked={extras.charger}
            disabled={extras.combo}
            onChange={() => toggleExtra('charger')}
          />
          Cargador inalámbrico (3h) +$8.000
        </label>

        <label className="bk-check">
          <input
            type="checkbox"
            checked={extras.headphones}
            disabled={extras.combo}
            onChange={() => toggleExtra('headphones')}
          />
          Auriculares premium +$6.000
        </label>

        <label className="bk-check">
          <input
            type="checkbox"
            checked={extras.combo}
            onChange={() => toggleExtra('combo')}
          />
          Combo (cargador + auriculares) +$11.000
        </label>
      </fieldset>

      <p className="bk-total">
        Total estimado: <strong>${total.toLocaleString('es-AR')}</strong>
        <br />
        <small>
          Del {fmt(start)} al {fmt(endISO)} — {labelDays}
          {extrasSubtotal > 0 ? ` — Extras: ${extrasText}` : ''}
        </small>
      </p>

      <a
        className="btn btn-primary btn-wide"
        href={waURL}
        target="_blank"
        rel="noreferrer"
        onClick={handleReserveClick}
      >
        {saving ? 'Guardando…' : 'Reservar por WhatsApp'}
      </a>
    </div>
  );
}