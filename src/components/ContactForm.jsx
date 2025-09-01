import { useState } from 'react';
import { db, serverTimestamp, collection, addDoc } from '../firebase';

export default function ContactForm() {
  const [sending, setSending] = useState(false);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setOk(false);
    setErr('');

    const form = e.target;
    const name = form.firstname.value.trim();
    const email = form.email.value.trim();
    const message = form.consulta.value.trim();

    // honeypot
    const bot = form.company.value;
    if (bot) {
      console.warn('[Contacto] Honeypot activado. Posible bot.');
      setErr('Error de validación.');
      return;
    }

    if (!name || !email || !message) {
      console.warn('[Contacto] Faltan campos', { name, email, messageLen: message.length });
      setErr('Completá todos los campos.');
      return;
    }

    setSending(true);
    try {
      console.log('[Contacto] Enviando mensaje →', { name, email, message });
      await addDoc(collection(db, 'contact_messages'), {
        name,
        email,
        message,
        createdAt: serverTimestamp(),
        status: 'nuevo',
        source: 'lomevr-web',
      });
      console.info('[Contacto] Mensaje guardado en Firestore.');
      setOk(true);
      form.reset();
    } catch (error) {
      console.error('[Contacto] Error guardando en Firestore:', error);
      setErr('Hubo un error enviando el mensaje. Probá de nuevo.');
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <form className="grid" onSubmit={handleSubmit}>
        <label htmlFor="firstname" className="sr-only">Nombre</label>
        <input type="text" id="firstname" name="firstname" placeholder="Tu nombre" required />

        <label htmlFor="email" className="sr-only">Email</label>
        <input type="email" id="email" name="email" placeholder="Tu email" required />

        <label htmlFor="consulta" className="sr-only">Consulta</label>
        
        <textarea
          id="consulta"
          name="consulta"
          placeholder="Tu consulta"
          rows={5}
          required
        />

        {/* Honeypot */}
        <input className="honey" name="company" tabIndex="-1" autoComplete="off" />

        <button type="submit" className="btn btn-primary" disabled={sending}>
          {sending ? 'Enviando...' : 'Enviar consulta'}
        </button>
      </form>

      {ok && <p className="msg-ok">¡Mensaje enviado! Te respondemos a la brevedad.</p>}
      {err && <p className="msg-err">{err}</p>}
    </>
  );
}